import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import nodemailer from "nodemailer";
import { getEmailSettings } from "@/lib/email-settings";
import { db, nowMs } from "@/lib/sqlite";
import { markFavoriteMessaged } from "@/lib/favorites";

function hashEmail(to:string,subject:string,body:string):string{
  const str=to+"-"+subject+"-"+body;
  let hash=0;
  for(let i=0;i<str.length;i++){const c=str.charCodeAt(i);hash=(hash<<5)-hash+c;hash=hash&hash;}
  return hash.toString(36);
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { to, subject, body, favoriteId } = await request.json();
    if (!to||!subject||!body) return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    const settings = getEmailSettings(session.user.id);
    if (!settings) return NextResponse.json({ error: "Email not configured. Set up SMTP in Settings." }, { status: 400 });
    const hash = hashEmail(to, subject, body);
    const existing = db.prepare(`SELECT * FROM sent_history WHERE userId=? AND toEmail=? AND hash=? LIMIT 1`).get(session.user.id,to,hash) as {sentAt:number}|undefined;
    if (existing) {
      return NextResponse.json({ duplicate:true, recipient:to, sentAt:new Date(existing.sentAt).toISOString(), message:`Already sent to ${to}` }, { status:409 });
    }
    const transporter = nodemailer.createTransport({ host:settings.smtpHost, port:settings.smtpPort, secure:settings.smtpSecure===1, auth:{user:settings.smtpUser,pass:settings.smtpPass} });
    const info = await transporter.sendMail({ from:`"${settings.fromName}" <${settings.fromEmail}>`, to, subject, text:body, html:body.replace(/\n/g,"<br>") });
    const now = nowMs();
    const result = db.prepare(`INSERT INTO sent_history (userId,toEmail,subject,body,hash,providerMessageId,favoriteId,sentAt) VALUES (?,?,?,?,?,?,?,?)`).run(session.user.id,to,subject,body,hash,info.messageId??null,favoriteId??null,now);
    if (favoriteId) markFavoriteMessaged(Number(favoriteId),Number(result.lastInsertRowid));
    return NextResponse.json({ success:true, messageId:info.messageId, historyId:result.lastInsertRowid });
  } catch (error) {
    console.error("Email send error:",error);
    return NextResponse.json({ error:error instanceof Error?error.message:"Failed to send email" }, { status:500 });
  }
}