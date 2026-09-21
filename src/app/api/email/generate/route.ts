import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  generateMatchedMessage,
  rebuildHireHtml,
  type DevTrack,
  type MessageStyle,
} from "@/lib/minimax-message";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: "You must be signed in to generate messages" },
        { status: 401 }
      );
    }

    const payload = await request.json();

    if (payload?.rebuild && payload.greeting && payload.opening) {
      const rebuilt = rebuildHireHtml(
        payload.greeting,
        payload.opening,
        payload.subject,
        {
          track: payload.track as DevTrack | undefined,
          style: payload.style as MessageStyle | undefined,
          templateId: payload.templateId,
          roleTitle: payload.roleTitle,
          roleBlurb: payload.roleBlurb,
          responsibilitiesHtml: payload.responsibilitiesHtml,
          techStackHtml: payload.techStackHtml,
          lookingForHtml: payload.lookingForHtml,
          offerHtml: payload.offerHtml,
          whyUs: payload.whyUs,
          closingLine: payload.closingLine,
          processNote: payload.processNote,
          companyNote: payload.companyNote,
          trackLabel: payload.trackLabel,
          styleLabel: payload.styleLabel,
          matchNotes: payload.matchNotes,
          layoutId: payload.layoutId,
        }
      );
      return NextResponse.json(rebuilt);
    }

    if (!payload?.login) {
      return NextResponse.json(
        { error: "Developer profile is required" },
        { status: 400 }
      );
    }

    const message = await generateMatchedMessage(
      {
        login: payload.login,
        name: payload.name,
        bio: payload.bio,
        company: payload.company,
        location: payload.location,
        blog: payload.blog,
        email: payload.email,
        followers: payload.followers,
        public_repos: payload.public_repos,
        created_at: payload.created_at,
        earliest_repo_at: payload.earliest_repo_at,
        language: payload.language,
        html_url: payload.html_url,
      },
      {
        templateId: payload.templateId,
        track: payload.track as DevTrack | undefined,
        style: payload.style as MessageStyle | undefined,
      }
    );

    return NextResponse.json(message);
  } catch (error) {
    console.error("Generate message error:", error);
    return NextResponse.json(
      {
        error: "Failed to generate message",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
