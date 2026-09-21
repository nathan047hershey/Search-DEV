"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AppNav } from "@/components/app-nav";
import { History, Mail, Search, RefreshCw } from "lucide-react";

interface HistoryItem {
  id: string;
  to: string;
  subject: string;
  sentAt: string;
  developerLogin?: string | null;
  developerName?: string | null;
  preview?: string;
}

export default function MessageHistoryPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/auth/signin?callbackUrl=/messages/history");
    }
  }, [status, router]);

  const load = async (query = q) => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set("q", query.trim());
      const res = await fetch(`/api/messages/history?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to load history");
        setItems([]);
        return;
      }
      setItems(data.items || []);
      setTotal(data.total || 0);
    } catch {
      setError("Network error loading history");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session) void load("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  if (status === "loading" || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AppNav />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
              <History className="h-6 w-6 text-blue-600" />
              Message history
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              {total} sent message{total === 1 ? "" : "s"}
            </p>
          </div>
          <Link
            href="/messages"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Mail className="h-4 w-4" />
            New message
          </Link>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void load(q);
          }}
          className="mb-4 flex gap-2"
        >
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by email, subject, or developer…"
              className="w-full rounded-lg border border-gray-300 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>
          <button
            type="submit"
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Search
          </button>
          <button
            type="button"
            onClick={() => void load(q)}
            className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </form>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white py-16 text-center">
            <Mail className="mx-auto h-10 w-10 text-gray-300" />
            <p className="mt-3 text-sm font-medium text-gray-700">No messages yet</p>
            <p className="mt-1 text-sm text-gray-500">
              Sent hire messages will show up here.
            </p>
            <Link
              href="/messages"
              className="mt-4 inline-flex text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              Send your first message
            </Link>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <ul className="divide-y divide-gray-100">
              {items.map((item) => (
                <li key={item.id} className="px-5 py-4 hover:bg-gray-50">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-gray-900">
                        {item.subject}
                      </p>
                      <p className="mt-0.5 text-sm text-gray-600">
                        To: <span className="font-medium">{item.to}</span>
                        {item.developerLogin ? (
                          <>
                            {" · "}
                            <Link
                              href={`/profile/${item.developerLogin}`}
                              className="text-blue-600 hover:underline"
                            >
                              @{item.developerLogin}
                            </Link>
                          </>
                        ) : null}
                      </p>
                      {item.preview && (
                        <p className="mt-1 line-clamp-2 text-xs text-gray-500">
                          {item.preview}
                        </p>
                      )}
                    </div>
                    <time className="shrink-0 text-xs text-gray-500">
                      {new Date(item.sentAt).toLocaleString()}
                    </time>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </main>
    </div>
  );
}
