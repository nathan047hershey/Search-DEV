import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listHireTemplates } from "@/lib/minimax-message";
import { MESSAGE_STYLES, TRACK_OPTIONS } from "@/lib/message-packs";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: "You must be signed in to load templates" },
        { status: 401 }
      );
    }

    return NextResponse.json({
      templates: listHireTemplates(),
      tracks: TRACK_OPTIONS,
      styles: MESSAGE_STYLES,
    });
  } catch (error) {
    console.error("Templates list error:", error);
    return NextResponse.json(
      { error: "Failed to load templates" },
      { status: 500 }
    );
  }
}
