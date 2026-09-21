import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { readSentHistory } from "@/lib/sent-history";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const q = (request.nextUrl.searchParams.get("q") || "").trim().toLowerCase();
  const limit = Math.min(
    parseInt(request.nextUrl.searchParams.get("limit") || "100", 10) || 100,
    500
  );

  let items = readSentHistory();

  // Prefer current user's sends when available; still show legacy records without sentBy
  const email = session.user.email?.toLowerCase();
  if (email) {
    items = items.filter(
      (i) => !i.sentBy || i.sentBy.toLowerCase() === email
    );
  }

  if (q) {
    items = items.filter(
      (i) =>
        i.to.toLowerCase().includes(q) ||
        i.subject.toLowerCase().includes(q) ||
        (i.developerLogin || "").toLowerCase().includes(q) ||
        (i.developerName || "").toLowerCase().includes(q)
    );
  }

  const slim = items.slice(0, limit).map((i) => ({
    id: i.id,
    to: i.to,
    subject: i.subject,
    sentAt: i.sentAt,
    emailId: i.emailId,
    developerLogin: i.developerLogin,
    developerName: i.developerName,
    sentBy: i.sentBy,
    preview: String(i.body || "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 160),
  }));

  return NextResponse.json({ items: slim, total: items.length });
}
