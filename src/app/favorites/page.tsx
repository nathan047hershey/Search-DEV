"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Heart, MapPin, BookOpen, Users, ArrowLeft, Trash2 } from "lucide-react";

interface FavoriteDeveloper {
  _id: string;
  githubId: number;
  login: string;
  avatarUrl: string;
  name: string | null;
  bio: string | null;
  location: string | null;
  followers: number;
  publicRepos: number;
  htmlUrl: string;
  email: string | null;
  createdAt: string;
}

export default function FavoritesPage() {
  const { data: session, status } = useSession();
  const [favorites, setFavorites] = useState<FavoriteDeveloper[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchFavorites() {
      try {
        const response = await fetch("/api/favorites");
        if (response.ok) {
          const data = await response.json();
          setFavorites(data);
        }
      } catch (error) {
        console.error("Failed to fetch favorites:", error);
      } finally {
        setLoading(false);
      }
    }

    if (session) {
      fetchFavorites();
    }
  }, [session]);

  const handleRemoveFavorite = async (githubId: number) => {
    try {
      const response = await fetch(`/api/favorites/${githubId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setFavorites((prev) => prev.filter((f) => f.githubId !== githubId));
      }
    } catch (error) {
      console.error("Failed to remove favorite:", error);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  if (!session) {
    redirect("/auth/signin");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <Link href="/" className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
            <ArrowLeft className="h-5 w-5" />
            Back to Search
          </Link>
          <h1 className="text-xl font-bold text-gray-900">Search Dev GitHub</h1>
          <div className="w-32"></div>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900">Your Saved Developers</h2>
          <p className="mt-2 text-gray-600">
            {favorites.length} developer{favorites.length !== 1 ? "s" : ""} saved
          </p>
        </div>

        {favorites.length === 0 ? (
          <div className="rounded-lg bg-white p-12 text-center shadow-sm">
            <Heart className="mx-auto h-12 w-12 text-gray-300" />
            <h3 className="mt-4 text-lg font-semibold text-gray-900">No favorites yet</h3>
            <p className="mt-2 text-gray-600">
              Start searching for developers and save your favorites here.
            </p>
            <Link
              href="/"
              className="mt-4 inline-block rounded-lg bg-blue-600 px-6 py-2 font-medium text-white hover:bg-blue-700"
            >
              Search Developers
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {favorites.map((favorite) => (
              <div
                key={favorite._id}
                className="overflow-hidden rounded-lg bg-white p-6 shadow-sm"
              >
                <div className="flex items-start gap-4">
                  <Image
                    src={favorite.avatarUrl}
                    alt={favorite.login}
                    width={64}
                    height={64}
                    className="rounded-full"
                  />
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/profile/${favorite.login}`}
                      className="block font-semibold text-gray-900 hover:text-blue-600"
                    >
                      {favorite.name || favorite.login}
                    </Link>
                    <p className="text-sm text-gray-500">@{favorite.login}</p>
                    {favorite.bio && (
                      <p className="mt-1 text-sm text-gray-600 line-clamp-2">
                        {favorite.bio}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => handleRemoveFavorite(favorite.githubId)}
                    className="rounded-full p-2 text-gray-400 hover:bg-red-50 hover:text-red-600"
                    title="Remove from favorites"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>

                <div className="mt-4 flex flex-wrap gap-4 text-sm text-gray-600">
                  {favorite.location && (
                    <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {favorite.location}
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    {favorite.followers.toLocaleString()} followers
                  </div>
                  <div className="flex items-center gap-1">
                    <BookOpen className="h-4 w-4" />
                    {favorite.publicRepos.toLocaleString()} repos
                  </div>
                </div>

                <Link
                  href={`/profile/${favorite.login}`}
                  className="mt-4 block w-full rounded-lg bg-gray-100 py-2 text-center text-sm font-medium text-gray-700 hover:bg-gray-200"
                >
                  View Profile
                </Link>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
