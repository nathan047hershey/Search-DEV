import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { Favorite } from "@/lib/models/favorite";

export async function GET() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectToDatabase();
    
    const favorites = await Favorite.find({ userId: session.user.id })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json(favorites);
  } catch (error: unknown) {
    console.error("Get favorites error:", error);
    return NextResponse.json(
      { error: "Failed to get favorites" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { githubId, login, avatarUrl, name, bio, location, publicRepos, followers, following, htmlUrl, email } = body;

    await connectToDatabase();

    // Check if already favorited
    const existing = await Favorite.findOne({
      userId: session.user.id,
      githubId,
    });

    if (existing) {
      return NextResponse.json({ message: "Already favorited" }, { status: 200 });
    }

    const favorite = new Favorite({
      userId: session.user.id,
      githubId,
      login,
      avatarUrl,
      name,
      bio,
      location,
      publicRepos,
      followers,
      following,
      htmlUrl,
      email,
    });

    await favorite.save();

    return NextResponse.json(favorite, { status: 201 });
  } catch (error: unknown) {
    console.error("Add favorite error:", error);
    return NextResponse.json(
      { error: "Failed to add favorite" },
      { status: 500 }
    );
  }
}
