import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import nodemailer from "nodemailer";
import { getEmailSettings } from "@/lib/email-settings";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { testEmail } = await request.json();
    if (!testEmail) return NextResponse.json({ error: "testEmail required" }, { status: 400 });
    const settings = getEmailSettings(session.user.id);
    if (!settings) return NextResponse.json({ error: "Email not configured" }, { status: 400 });
    const transporter = nodemailer.createTransport({ host:settings.smtpHost, port:settings.smtpPort, secure:settings.smtpSecure===1, auth:{user:settings.smtpUser,pass:settings.smtpPass} });
    await transporter.sendMail({ from:`"${settings.fromName}" <${settings.fromEmail}>`, to:testEmail, subject:"Test Email from Search Dev GitHub", text:"If you received this, SMTP settings work!", html:"<p>If you received this, SMTP settings work!</p>" });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to send test email" }, { status: 500 });
  }
}