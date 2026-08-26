"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { SearchForm } from "@/components/search-form";
import { DeveloperCard } from "@/components/developer-card";
import { EmailComposer } from "@/components/email-composer";
import { Github, Heart, Settings, Download, X } from "lucide-react";
import Link from "next/link";

interface User {
  login: string;
  avatar_url: string;
  html_url: string;
  name?: string | null;
  bio?: string | null;
  location?: string | null;
  followers?: number;
  following?: number;
  public_repos?: number;
  email?: string | null;
  blog?: string;
}

export default function Home() {
  const { data: session } = useSession();
  const [results, setResults] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [showFavorites, setShowFavorites] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [emailComposerUser, setEmailComposerUser] = useState<User | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("favorites");
    if (saved) setFavorites(JSON.parse(saved));
  }, []);

  const handleSearch = async (filters: any) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.q) params.append("q", filters.q);
      if (filters.location) params.append("location", filters.location);
      if (filters.language) params.append("language", filters.language);
      if (filters.skill) params.append("skill", filters.skill);
      if (filters.gender) params.append("gender", filters.gender);
      params.append("perPage", "30");
      const res = await fetch(`/api/search?${params.toString()}`);
      const data = await res.json();
      setResults(data.users || []);
    } catch (err) {
      console.error(err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFavorite = (user: User) => {
    const next = favorites.includes(user.login)
      ? favorites.filter((f) => f !== user.login)
      : [...favorites, user.login];
    setFavorites(next);
    localStorage.setItem("favorites", JSON.stringify(next));
  };

  const handleExport = (format: string) => {
    const data = showFavorites ? results.filter((u) => favorites.includes(u.login)) : results;
    let c = "";
    let filename = "";
    if (format === "csv") {
      const headers = ["Login", "Name", "Email", "Location", "Followers", "Repos", "GitHub URL"];
      const rows = data.map((u) => [u.login, u.name || "", u.email || "", u.location || "", u.followers || 0, u.public_repos || 0, u.html_url]);
      c = [headers, ...rows].map((r) => r.join(",")).join("\n");
      filename = "developers.csv";
    } else {
      c = JSON.stringify(data, null, 2);
      filename = "developers.json";
    }
    const blob = new Blob([c]);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    setShowExportModal(false);
  };

  const displayed = showFavorites ? results.filter((u) => favorites.includes(u.login)) : results;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <Github className="h-8 w-8 text-gray-900" />
            <h1 className="text-xl font-bold text-gray-900">GitHub Dev Search</h1>
          </div>
          <nav className="flex items-center gap-4">
            {session && (
              <Link href="/settings" className="flex items-center gap-1 text-sm text-gray-600 hover:text-blue-600">
                <Settings className="h-4 w-4" />
                Settings
              </Link>
            )}
            {session ? (
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-600">{session.user?.name}</span>
                <img src={session.user?.image || ""} alt="" className="h-8 w-8 rounded-full" />
              </div>
            ) : (
              <Link href="/api/auth/signin" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
                Sign In
              </Link>
            )}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-8">
          <SearchForm onSearch={handleSearch} isLoading={loading} />
        </div>

        {results.length > 0 && (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <p className="text-sm text-gray-600">
              {showFavorites ? `${displayed.length} favorites` : `${results.length} developers found`}
            </p>
            <div className="flex gap-2">
              <button onClick={() => setShowFavorites(!showFavorites)} className={"flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm " + (showFavorites ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-700 hover:bg-gray-200")}>
                <Heart className="h-4 w-4" />
                {showFavorites ? "Showing Favorites" : "Show Favorites"}
              </button>
              <button onClick={() => setShowExportModal(true)} className="flex items-center gap-1 rounded-lg bg-gray-100 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-200">
                <Download className="h-4 w-4" />
                Export
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
          </div>
        ) : displayed.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {displayed.map((user) => (
              <DeveloperCard key={user.login} user={user} onFavorite={handleFavorite} isFavorited={favorites.includes(user.login)} onSendEmail={(u) => setEmailComposerUser(u)} />
            ))}
          </div>
        ) : (
          <div className="rounded-lg bg-white py-12 text-center shadow-sm">
            <Github className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">No developers found</h3>
            <p className="mt-2 text-sm text-gray-500">Try adjusting your search filters to find more developers.</p>
          </div>
        )}
      </main>

      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white shadow-xl">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">Export Developers</h2>
              <button onClick={() => setShowExportModal(false)} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6">
              <p className="mb-4 text-sm text-gray-600">
                {showFavorites ? `Export ${displayed.length} favorited developers` : `Export ${results.length} developers`}
              </p>
              <div className="flex gap-3">
                <button onClick={() => handleExport("csv")} className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">Export as CSV</button>
                <button onClick={() => handleExport("json")} className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Export as JSON</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {emailComposerUser && (
        <EmailComposer isOpen={true} onClose={() => setEmailComposerUser(null)} developer={emailComposerUser} />
      )}
    </div>
  );
}
