import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Resend } from "resend";
import { randomUUID } from "crypto";
import { authOptions } from "@/lib/auth";
import { addSentMessage } from "@/lib/sent-history";
import { getSendCooldown, recordLastSendAt } from "@/lib/email-rate-limit";
import {
  htmlToPlainText,
  normalizeEmail,
  sanitizeSubject,
  validateRecipientEmail,
} from "@/lib/email-validate";

const FROM =
  process.env.RESEND_FROM ||
  "PivotalStacks Careers <careers@pivotalstacks.com>";

const REPLY_TO =
  process.env.RESEND_REPLY_TO || "careers@pivotalstacks.com";

function extractFromAddress(from: string): string {
  const match = from.match(/<([^>]+)>/);
  return (match?.[1] || from).trim().toLowerCase();
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: "You must be signed in to send emails" },
        { status: 401 }
      );
    }

    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json(
        { error: "RESEND_API_KEY is not configured on the server" },
        { status: 500 }
      );
    }

    const cooldown = getSendCooldown(session.user.email);
    if (!cooldown.allowed) {
      return NextResponse.json(
        {
          error: cooldown.message || "Please wait before sending again",
          cooldown,
        },
        { status: 429 }
      );
    }

    const { to, subject, body, developerName, developerLogin, style, opening } =
      await request.json();

    if (!to || !subject || !body) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const recipientsRaw = Array.isArray(to) ? to : [to];
    const recipients: string[] = [];

    for (const raw of recipientsRaw) {
      const check = await validateRecipientEmail(String(raw), { checkMx: true });
      if (!check.valid) {
        return NextResponse.json(
          {
            error: check.errors[0] || "Invalid recipient email",
            validation: check,
          },
          { status: 400 }
        );
      }
      recipients.push(check.email);
    }

    const htmlBody = /<[a-z][\s\S]*>/i.test(String(body))
      ? String(body)
      : String(body).replace(/\n/g, "<br>");
    const textBody = htmlToPlainText(htmlBody);
    const entityRef = randomUUID();
    const fromAddress = extractFromAddress(FROM);
    const cleanSubject = sanitizeSubject(String(subject));
    const resend = new Resend(process.env.RESEND_API_KEY);

    // Deliverability-oriented headers for Microsoft/Outlook filters:
    // multipart text+html, Reply-To, List-Unsubscribe, unique entity ref.
    const { data, error } = await resend.emails.send({
      from: FROM,
      to: recipients,
      reply_to: REPLY_TO,
      subject: cleanSubject,
      html: htmlBody,
      text: textBody,
      headers: {
        "List-Unsubscribe": `<mailto:${REPLY_TO}?subject=unsubscribe>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        "X-Entity-Ref-ID": entityRef,
        "X-Auto-Response-Suppress": "OOF, AutoReply",
        "X-Mailer": "PivotalStacks Careers",
      },
      tags: [
        { name: "category", value: "recruiting" },
        { name: "app", value: "search-dev-github" },
      ],
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    for (const recipient of recipients) {
      addSentMessage({
        to: recipient,
        subject: cleanSubject,
        body: htmlBody,
        emailId: data?.id || null,
        sentBy: session.user.email || normalizeEmail(fromAddress),
        developerLogin: developerLogin || null,
        developerName: developerName || null,
        style: style ? String(style) : null,
        openingSnippet: opening ? String(opening) : null,
      });
    }

    // Persist last send time so the gap survives server stop/restart
    recordLastSendAt(session.user.email || normalizeEmail(fromAddress));

    return NextResponse.json({
      success: true,
      message: "Email sent successfully",
      id: data?.id,
      cooldown: getSendCooldown(session.user.email),
    });
  } catch (error) {
    console.error("Email send error:", error);
    return NextResponse.json(
      {
        error: "Failed to send email",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
