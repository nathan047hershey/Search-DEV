import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getContactedDevelopers,
  getSendsForDeveloper,
  suggestNextOutreachStyle,
} from "@/lib/sent-history";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const contacted = getContactedDevelopers(session.user.email);
  const touchCounts: Record<string, number> = {};
  const nextStyles: Record<string, string> = {};
  for (const login of contacted.logins) {
    touchCounts[login] = getSendsForDeveloper(login).length;
    nextStyles[login] = suggestNextOutreachStyle(login);
  }
  return NextResponse.json({ ...contacted, touchCounts, nextStyles });
}
