import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db, nowMs } from "@/lib/sqlite";
import { encrypt } from "@/lib/crypto";
import { getEmailSettings } from "@/lib/email-settings";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const row = getEmailSettings(session.user.id);
  if (!row) return NextResponse.json(null);
  const { smtpPass, ...safe } = row; void smtpPass;
  return NextResponse.json(safe);
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { provider, fromName, fromEmail, smtpHost, smtpPort, smtpSecure, smtpUser, smtpPass } = await request.json();
    if (!provider||!fromEmail||!smtpHost||!smtpPort||!smtpUser||!smtpPass) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    const { enc, iv, tag } = encrypt(smtpPass);
    const now = nowMs();
    db.prepare(`INSERT INTO email_settings (userId,provider,fromName,fromEmail,smtpHost,smtpPort,smtpSecure,smtpUser,smtpPassEnc,smtpPassIv,smtpPassTag,isActive,createdAt,updatedAt) VALUES (?,?,?,?,?,?,?,?,?,?,?,1,?,?) ON CONFLICT(userId) DO UPDATE SET provider=excluded.provider,fromName=excluded.fromName,fromEmail=excluded.fromEmail,smtpHost=excluded.smtpHost,smtpPort=excluded.smtpPort,smtpSecure=excluded.smtpSecure,smtpUser=excluded.smtpUser,smtpPassEnc=excluded.smtpPassEnc,smtpPassIv=excluded.smtpPassIv,smtpPassTag=excluded.smtpPassTag,updatedAt=excluded.updatedAt`).run(session.user.id,provider,fromName??"",fromEmail,smtpHost,smtpPort,smtpSecure?1:0,smtpUser,enc,iv,tag,now,now);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Save email settings error:", error);
    return NextResponse.json({ error: "Failed to save settings" }, { status: 500 });
  }
}

export async function DELETE() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  db.prepare(`DELETE FROM email_settings WHERE userId = ?`).run(session.user.id);
  return NextResponse.json({ success: true });
}