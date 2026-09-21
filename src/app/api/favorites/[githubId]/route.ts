import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { Favorite } from "@/lib/models/favorite";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ githubId: string }> }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { githubId } = await params;

  try {
    await connectToDatabase();

    const result = await Favorite.findOneAndDelete({
      userId: session.user.id,
      githubId: parseInt(githubId, 10),
    });

    if (!result) {
      return NextResponse.json({ error: "Favorite not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Favorite removed" });
  } catch (error: unknown) {
    console.error("Remove favorite error:", error);
    return NextResponse.json({ error: "Failed to remove favorite" }, { status: 500 });
  }
}
