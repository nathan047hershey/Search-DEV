import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db, nowMs } from "@/lib/sqlite";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const uid=session.user.id;
  return NextResponse.json(db.prepare(`SELECT id,userId,name,subject,body,isDefault,createdAt,updatedAt FROM email_templates WHERE userId IN ('',?) ORDER BY isDefault DESC, createdAt ASC`).all(uid,uid));
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { name, subject, body } = await request.json();
    if (!name||!subject||!body) return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    const id=Date.now().toString(), now=nowMs();
    db.prepare(`INSERT INTO email_templates (id,userId,name,subject,body,isDefault,createdAt,updatedAt) VALUES (?,?,?,?,?,0,?,?)`).run(id,session.user.id,name,subject,body,now,now);
    return NextResponse.json({ id, userId:session.user.id, name, subject, body, isDefault:0, createdAt:now, updatedAt:now });
  } catch(e){ return NextResponse.json({ error:"Failed to create" },{ status:500 }); }
}

export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error:"Unauthorized" }, { status:401 });
  try {
    const { id, name, subject, body } = await request.json();
    const now=nowMs();
    const info=db.prepare(`UPDATE email_templates SET name=?,subject=?,body=?,updatedAt=? WHERE id=? AND userId=? AND isDefault=0`).run(name,subject,body,now,id,session.user.id);
    if(info.changes===0) return NextResponse.json({ error:"Not found or cannot edit default" },{ status:404 });
    return NextResponse.json({ success:true });
  } catch(e){ return NextResponse.json({ error:"Failed to update" },{ status:500 }); }
}

export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error:"Unauthorized" }, { status:401 });
  const { searchParams } = new URL(request.url);
  const id=searchParams.get("id");
  if(!id) return NextResponse.json({ error:"id required" },{ status:400 });
  const info=db.prepare(`DELETE FROM email_templates WHERE id=? AND userId=? AND isDefault=0`).run(id,session.user.id);
  if(info.changes===0) return NextResponse.json({ error:"Not found or cannot delete default" },{ status:404 });
  return NextResponse.json({ success:true });
}