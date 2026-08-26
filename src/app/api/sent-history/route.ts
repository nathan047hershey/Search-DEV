import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/sqlite";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get("limit") ?? "20");
  const offset = parseInt(searchParams.get("offset") ?? "0");
  const uid = session.user.id;
  const toF = searchParams.get("to") ?? "";
  const subF = searchParams.get("subject") ?? "";
  let where = "WHERE userId = ?"; const par=[uid];
  if(toF){where+=" AND toEmail LIKE ?";par.push(`%${toF}%`);}
  if(subF){where+=" AND subject LIKE ?";par.push(`%${subF}%`);}
  const total=(db.prepare(`SELECT COUNT(*) as n FROM sent_history ${where}`).get(...par) as {n:number}).n;
  const sentToday=(db.prepare(`SELECT COUNT(*) as n FROM sent_history WHERE userId=? AND sentAt >= ?`).get(uid,new Date().setHours(0,0,0,0)) as {n:number}).n;
  const unique=(db.prepare(`SELECT COUNT(DISTINCT toEmail) as n FROM sent_history WHERE userId=?`).get(uid) as {n:number}).n;
  const items=db.prepare(`SELECT * FROM sent_history ${where} ORDER BY sentAt DESC LIMIT ? OFFSET ?`).all(...par,limit,offset);
  return NextResponse.json({ items, total, sentToday, uniqueRecipients: unique, limit, offset });
}