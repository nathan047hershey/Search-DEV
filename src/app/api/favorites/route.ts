import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { addFavorite, getFavorites } from '@/lib/favorites';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json(getFavorites(session.user.id));
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const { githubId, login, avatarUrl, name, bio, location, publicRepos, followers, following, htmlUrl, email, resumeUrl, portfolioUrl } = await request.json();
    const fav = addFavorite(session.user.id, {
      githubId,
      githubLogin: login,
      name: name ?? null,
      bio: bio ?? null,
      avatarUrl: avatarUrl ?? null,
      htmlUrl: htmlUrl ?? null,
      location: location ?? null,
      publicRepos: publicRepos ?? 0,
      followers: followers ?? 0,
      following: following ?? 0,
      email: email ?? null,
      resumeUrl: resumeUrl ?? null,
      portfolioUrl: portfolioUrl ?? null,
    });
    return NextResponse.json(fav, { status: 201 });
  } catch (e) { return NextResponse.json({ error: 'Failed to add favorite' }, { status: 500 }); }
}
