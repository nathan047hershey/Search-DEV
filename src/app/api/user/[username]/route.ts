import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/github";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: { username: string } }
) {
  const session = await getServerSession(authOptions);
  const { username } = params;

  try {
    const user = await getUser(
      username,
      session?.user?.accessToken
    );

    return NextResponse.json(user);
  } catch (error: unknown) {
    console.error("Get user error:", error);
    return NextResponse.json(
      { error: "Failed to get user" },
      { status: 500 }
    );
  }
}
