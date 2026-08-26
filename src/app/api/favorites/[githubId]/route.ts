import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { removeFavorite, getFavorite } from "@/lib/favorites";

export async function DELETE(_request: NextRequest, { params }: { params: { githubId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const favorite = getFavorite(session.user.id, params.githubId);
    if (!favorite) return NextResponse.json({ error: "Favorite not found" }, { status: 404 });
    removeFavorite(session.user.id, params.githubId);
    return NextResponse.json({ message: "Favorite removed" });
  } catch (error) {
    console.error("Remove favorite error:", error);
    return NextResponse.json({ error: "Failed to remove favorite" }, { status: 500 });
  }
}