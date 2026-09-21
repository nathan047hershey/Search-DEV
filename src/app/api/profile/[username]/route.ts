import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/github";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await params;
    const session = await getServerSession(authOptions);

    const user = await getUser(username, session?.user?.accessToken);

    return NextResponse.json({
      ...user,
      email: user.email,
      emailSource: user.email ? "github_public" : "",
    });
  } catch (error: unknown) {
    console.error("Error fetching user profile:", error);
    return NextResponse.json(
      { error: "Failed to fetch user profile" },
      { status: 500 }
    );
  }
}
