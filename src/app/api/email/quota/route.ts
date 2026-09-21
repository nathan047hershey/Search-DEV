import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getSendCooldown,
  setGapMinutes,
} from "@/lib/email-rate-limit";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json(getSendCooldown(session.user.email));
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const gapMinutes = setGapMinutes(Number(body?.gapMinutes));
  const cooldown = getSendCooldown(session.user.email);

  return NextResponse.json({
    ...cooldown,
    gapMinutes,
    saved: true,
    message: `Send gap set to ${gapMinutes} minutes.`,
  });
}
