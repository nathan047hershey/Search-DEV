import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/github";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { findEmailForDeveloper } from "@/lib/email-orchestrator";

export async function GET(
  request: NextRequest,
  { params }: { params: { username: string } }
) {
  try {
    const username = params.username;
    const session = await getServerSession(authOptions);

    // Get user data from GitHub (includes public email)
    const user = await getUser(username, session?.user?.accessToken);

    // Run multi-strategy email orchestrator
    const orchestratorResult = await findEmailForDeveloper({
      login: user.login,
      name: user.name || null,
      bio: user.bio || null,
      company: user.company || null,
      location: user.location || null,
      blog: user.blog || "",
      publicEmail: user.email || null,
      accessToken: session?.user?.accessToken,
    });

    return NextResponse.json({
      ...user,
      email: orchestratorResult.email,
      emailSource: orchestratorResult.source,
      emailSourceLabel: orchestratorResult.sourceLabel,
      emailConfidence: orchestratorResult.confidence,
      strategiesTried: orchestratorResult.strategiesTried,
      resumeUrls: orchestratorResult.resumeUrls,
      portfolioUrls: orchestratorResult.portfolioUrls,
      contactLinks: orchestratorResult.contactLinks,
    });
  } catch (error: unknown) {
    console.error("Error fetching user profile:", error);
    return NextResponse.json(
      { error: "Failed to fetch user profile" },
      { status: 500 }
    );
  }
}
