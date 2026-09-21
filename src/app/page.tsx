"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { SearchForm, normalizeSearchFilters, type SearchFilters } from "@/components/search-form";
import { DeveloperCard } from "@/components/developer-card";
import { EmailComposer } from "@/components/email-composer";
import { AppNav } from "@/components/app-nav";
import { Github, Heart, Download, X } from "lucide-react";

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
  created_at?: string;
  earliest_repo_at?: string;
  email?: string | null;
  blog?: string;
  id?: number;
  matched_repo?: string | null;
  matched_repo_full_name?: string | null;
  matched_repo_pushed_at?: string | null;
}

const SEARCH_CACHE_KEY = "search-dev-github:last-search-v7";
const PER_PAGE = 8;

type PageCacheEntry = {
  items: User[];
  hidden: number;
};

type CachedSearch = {
  filters: SearchFilters;
  results: User[];
  totalCount: number;
  pages?: Record<string, PageCacheEntry>;
  savedAt: number;
};

/** Stable key for filters ignoring page (so page flips keep the same cache). */
function filterCacheKey(filters: SearchFilters): string {
  const n = normalizeSearchFilters({ ...filters, page: 1 }) || { ...filters, page: 1 };
  return JSON.stringify({
    q: n.q || "",
    location: n.location || "",
    languages: n.languages || [],
    company: n.company || "",
    minFollowers: n.minFollowers || "",
    maxFollowers: n.maxFollowers || "",
    minRepos: n.minRepos || "",
    hireable: !!n.hireable,
    hasEmail: !!n.hasEmail,
    hasEmailOnly: !!n.hasEmailOnly,
    gender: n.gender || "all",
    sort: n.sort || "followers",
    order: n.order || "desc",
    bio: n.bio || "",
    blog: n.blog || "",
    skills: n.skills || [],
    createdWithin: n.createdWithin || "",
    searchScope: n.searchScope || "all",
  });
}

function filtersToParams(filters: SearchFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.location) params.set("location", filters.location);
  if (filters.languages && filters.languages.length > 0) {
    params.set("language", filters.languages.join(","));
  } else if (filters.language) {
    params.set("language", filters.language);
  }
  if (filters.company) params.set("company", filters.company);
  if (filters.minFollowers) params.set("minFollowers", filters.minFollowers);
  if (filters.maxFollowers) params.set("maxFollowers", filters.maxFollowers);
  if (filters.minRepos) params.set("minRepos", filters.minRepos);
  if (filters.hireable) params.set("hireable", "true");
  if (filters.gender && filters.gender !== "all") params.set("gender", filters.gender);
  if (filters.sort) params.set("sort", filters.sort);
  if (filters.order) params.set("order", filters.order);
  if (filters.skills && filters.skills.length > 0) {
    params.set("skills", filters.skills.join(","));
  }
  if (filters.hasEmail) params.set("hasEmail", "true");
  if (filters.hasEmailOnly) params.set("hasEmailOnly", "true");
  if (filters.bio) params.set("bio", filters.bio);
  if (filters.blog) params.set("blog", filters.blog);
  if (filters.createdWithin) params.set("createdWithin", filters.createdWithin);
  if (filters.searchScope && filters.searchScope !== "all") {
    params.set("searchScope", filters.searchScope);
  }
  params.set("page", String(filters.page && filters.page > 0 ? filters.page : 1));
  params.set("per_page", String(PER_PAGE));
  return params;
}

function paramsToFilters(params: URLSearchParams): SearchFilters | null {
  const languages = (params.get("language") || "")
    .split(",")
    .map((l) => l.trim())
    .filter(Boolean);
  const skills = (params.get("skills") || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const filters: SearchFilters = {
    q: params.get("q") || "",
    location: params.get("location") || "",
    languages,
    language: languages[0] || "",
    company: params.get("company") || "",
    minFollowers: params.get("minFollowers") || "",
    maxFollowers: params.get("maxFollowers") || "",
    minRepos: params.get("minRepos") || "",
    hireable: params.get("hireable") === "true",
    hasEmail: params.get("hasEmail") === "true",
    hasEmailOnly: params.get("hasEmailOnly") === "true",
    gender: params.get("gender") || "all",
    sort: params.get("sort") || "followers",
    order: params.get("order") || "desc",
    bio: params.get("bio") || "",
    blog: params.get("blog") || "",
    skills,
    createdWithin: params.get("createdWithin") || "",
    searchScope: params.get("searchScope") || "all",
    page: Math.max(1, parseInt(params.get("page") || "1", 10) || 1),
  };

  const hasAny =
    filters.q ||
    filters.location ||
    filters.company ||
    languages.length > 0 ||
    filters.minFollowers ||
    filters.maxFollowers ||
    filters.minRepos ||
    filters.hireable ||
    filters.hasEmail ||
    filters.hasEmailOnly ||
    (filters.gender && filters.gender !== "all") ||
    filters.bio ||
    filters.blog ||
    skills.length > 0 ||
    filters.createdWithin ||
    (filters.searchScope && filters.searchScope !== "all");

  return hasAny || params.has("page") ? filters : null;
}

function readCache(): CachedSearch | null {
  try {
    const raw = sessionStorage.getItem(SEARCH_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedSearch;
    if (!parsed || !Array.isArray(parsed.results)) return null;
    // Keep cache for 12 hours
    if (Date.now() - (parsed.savedAt || 0) > 12 * 60 * 60 * 1000) {
      sessionStorage.removeItem(SEARCH_CACHE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(
  filters: SearchFilters,
  results: User[],
  totalCount: number,
  pages?: Record<string, PageCacheEntry>
) {
  try {
    const existing = readCache();
    const sameFilters =
      existing && filterCacheKey(existing.filters) === filterCacheKey(filters);
    const payload: CachedSearch = {
      filters,
      results,
      totalCount,
      pages: pages || (sameFilters ? existing?.pages : undefined) || {
        [String(filters.page || 1)]: {
          items: results,
          hidden: 0,
        },
      },
      savedAt: Date.now(),
    };
    sessionStorage.setItem(SEARCH_CACHE_KEY, JSON.stringify(payload));
  } catch {
    // quota / private mode — ignore
  }
}

function clearCache() {
  try {
    sessionStorage.removeItem(SEARCH_CACHE_KEY);
  } catch {
    // ignore
  }
}

function syncUrl(filters: SearchFilters) {
  const params = filtersToParams(filters);
  const next = params.toString() ? `/?${params.toString()}` : "/";
  window.history.replaceState(null, "", next);
}

export default function Home() {
  const { data: session } = useSession();
  const [results, setResults] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchNote, setSearchNote] = useState<string | null>(null);
  const [retryAfterSeconds, setRetryAfterSeconds] = useState(0);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [showFavorites, setShowFavorites] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [emailComposerUser, setEmailComposerUser] = useState<User | null>(null);
  const [initialFilters, setInitialFilters] = useState<SearchFilters | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [restored, setRestored] = useState(false);
  const [contactedLogins, setContactedLogins] = useState<Set<string>>(new Set());
  const [contactedEmails, setContactedEmails] = useState<Set<string>>(new Set());
  const [hiddenContactedCount, setHiddenContactedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [emailPoolSize, setEmailPoolSize] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const pageCacheRef = useRef<Record<string, PageCacheEntry>>({});
  const filterKeyRef = useRef<string>("");
  const searchAbortRef = useRef<AbortController | null>(null);
  const cooldownEndsAtRef = useRef(0);
  const resetEmailScanRef = useRef(false);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const loadMoreGateRef = useRef(0);
  const resultsCountRef = useRef(0);

  const maxPages = Math.min(
    Math.ceil(1000 / PER_PAGE),
    Math.max(1, Math.ceil(Math.min(totalCount, 1000) / PER_PAGE))
  );
  const displayTotal = Math.min(totalCount, 1000);
  const hasMore =
    !loading &&
    !loadingMore &&
    !showFavorites &&
    hasSearched &&
    results.length > 0 &&
    retryAfterSeconds <= 0 &&
    currentPage < maxPages &&
    totalCount > results.length &&
    results.length < 1000;

  useEffect(() => {
    if (retryAfterSeconds <= 0) return;
    const id = window.setInterval(() => {
      const left = Math.ceil((cooldownEndsAtRef.current - Date.now()) / 1000);
      setRetryAfterSeconds(left > 0 ? left : 0);
    }, 1000);
    return () => window.clearInterval(id);
  }, [retryAfterSeconds > 0]);

  const persistPages = useCallback(
    (filters: SearchFilters, results: User[], total: number) => {
      writeCache(filters, results, total, { ...pageCacheRef.current });
    },
    []
  );

  const applyPageResult = useCallback(
    (
      filters: SearchFilters,
      page: number,
      items: User[],
      hidden: number,
      total: number,
      options?: { scroll?: boolean; append?: boolean }
    ) => {
      const normalized =
        normalizeSearchFilters({ ...filters, page }) || { ...filters, page };
      pageCacheRef.current[String(page)] = {
        items,
        hidden,
      };

      if (options?.append) {
        setResults((prev) => {
          const seen = new Set(
            prev.map((u) => (u.login || "").toLowerCase()).filter(Boolean)
          );
          const merged = [...prev];
          for (const user of items) {
            const key = (user.login || "").toLowerCase();
            if (!key || seen.has(key)) continue;
            seen.add(key);
            merged.push(user);
          }
          resultsCountRef.current = merged.length;
          persistPages(normalized, merged, total);
          return merged;
        });
        setHiddenContactedCount((c) => c + hidden);
      } else {
        resultsCountRef.current = items.length;
        setResults(items);
        setHiddenContactedCount(hidden);
        persistPages(normalized, items, total);
      }

      setTotalCount(total);
      setCurrentPage(page);
      setInitialFilters(normalized);
      setHasSearched(true);
      if (!options?.append) setShowFavorites(false);
      syncUrl(normalized);
      if (options?.scroll) {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    },
    [persistPages]
  );

  const loadContacted = useCallback(async () => {
    if (!session?.user) {
      setContactedLogins(new Set());
      setContactedEmails(new Set());
      return { logins: new Set<string>(), emails: new Set<string>() };
    }
    try {
      const res = await fetch("/api/messages/contacted");
      if (!res.ok) {
        return { logins: new Set<string>(), emails: new Set<string>() };
      }
      const data = await res.json();
      const logins = new Set<string>(
        (data.logins || []).map((l: string) => String(l).toLowerCase())
      );
      const emails = new Set<string>(
        (data.emails || []).map((e: string) => String(e).toLowerCase())
      );
      setContactedLogins(logins);
      setContactedEmails(emails);
      return { logins, emails };
    } catch {
      return { logins: new Set<string>(), emails: new Set<string>() };
    }
  }, [session?.user]);

  const openSendMessage = (user: User) => {
    if (!session) {
      window.location.href =
        "/auth/signin?callbackUrl=" + encodeURIComponent("/");
      return;
    }
    setEmailComposerUser(user);
  };

  useEffect(() => {
    const saved = localStorage.getItem("favorites");
    if (saved) {
      try {
        setFavorites(JSON.parse(saved));
      } catch {
        setFavorites([]);
      }
    }
  }, []);

  // Restore last search on refresh + hide already-contacted developers
  useEffect(() => {
    let cancelled = false;

    const boot = async () => {
      const contacted = await loadContacted();
      if (cancelled) return;

      const fromUrl = normalizeSearchFilters(
        paramsToFilters(new URLSearchParams(window.location.search))
      );
      const cached = readCache();
      const cachedFilters = normalizeSearchFilters(cached?.filters || null);

      const filterItems = (items: User[]) => {
        const visible: User[] = [];
        let hidden = 0;
        for (const user of items) {
          const login = (user.login || "").toLowerCase();
          const email = (user.email || "").toLowerCase();
          if (
            (login && contacted.logins.has(login)) ||
            (email && contacted.emails.has(email))
          ) {
            hidden += 1;
          } else {
            visible.push(user);
          }
        }
        return { visible, hidden };
      };

      if (cached?.results?.length) {
        const page = cachedFilters?.page || fromUrl?.page || 1;
        filterKeyRef.current = filterCacheKey(cachedFilters || fromUrl || {});
        pageCacheRef.current = { ...(cached.pages || {}) };

        const rawPageItems =
          pageCacheRef.current[String(page)]?.items || cached.results || [];
        const { visible, hidden } = filterItems(rawPageItems);
        pageCacheRef.current[String(page)] = {
          items: visible,
          hidden,
        };

        setResults(visible);
        setHiddenContactedCount(hidden);
        setTotalCount(cached.totalCount || visible.length);
        setCurrentPage(page);
        setInitialFilters(cachedFilters || fromUrl);
        setHasSearched(true);
        if (cachedFilters) {
          syncUrl(cachedFilters);
          writeCache(
            cachedFilters,
            visible,
            cached.totalCount || visible.length,
            pageCacheRef.current
          );
        }
      } else if (fromUrl) {
        setInitialFilters(fromUrl);
        setCurrentPage(fromUrl.page || 1);
        filterKeyRef.current = filterCacheKey(fromUrl);
        pageCacheRef.current = {};
        setLoading(true);
        setHasSearched(true);
        try {
          const params = filtersToParams(fromUrl);
          const res = await fetch(`/api/search?${params.toString()}`);
          const data = await res.json();
          const page = fromUrl.page || 1;
          const items = data.items || data.users || [];
          const { visible, hidden } = filterItems(items);
          const total = Number(data.total_count) || items.length;
          if (!cancelled) {
            pageCacheRef.current[String(page)] = {
              items: visible,
              hidden,
            };
            setResults(visible);
            setHiddenContactedCount(hidden);
            setTotalCount(total);
            writeCache(fromUrl, visible, total, pageCacheRef.current);
          }
        } catch (err) {
          console.error(err);
          if (!cancelled) {
            setResults([]);
          }
        } finally {
          if (!cancelled) setLoading(false);
        }
      }

      if (!cancelled) setRestored(true);
    };

    void boot();
    return () => {
      cancelled = true;
    };
  }, [loadContacted]);

  const handleSearch = useCallback(
    async (
      filters: SearchFilters,
      pageOverride?: number,
      opts?: { append?: boolean }
    ) => {
      const page = pageOverride ?? filters.page ?? 1;
      const append = !!opts?.append && page > 1;
      const normalized =
        normalizeSearchFilters({ ...filters, page }) || { ...filters, page };
      const key = filterCacheKey(normalized);

      // Fresh Search click → clear saved pages and fetch again
      if (!append && (pageOverride == null || key !== filterKeyRef.current)) {
        pageCacheRef.current = {};
        filterKeyRef.current = key;
      }

      // Already visited this page via scroll → append from cache
      const cachedPage = pageCacheRef.current[String(page)];
      if (cachedPage && append) {
        applyPageResult(
          normalized,
          page,
          cachedPage.items,
          cachedPage.hidden,
          totalCount || cachedPage.items.length || 0,
          { append: true, scroll: false }
        );
        return;
      }

      if (!append) {
        searchAbortRef.current?.abort();
      }
      const abort = new AbortController();
      searchAbortRef.current = abort;

      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
        setResults([]);
        setTotalCount(0);
        setHiddenContactedCount(0);
        setCurrentPage(page);
      }
      setSearchError(null);
      setSearchNote(null);
      setRetryAfterSeconds(0);
      setHasSearched(true);
      if (!append) setShowFavorites(false);
      if (append) setCurrentPage(page);
      try {
        const params = filtersToParams(normalized);
        if (resetEmailScanRef.current) {
          params.set("reset", "1");
          resetEmailScanRef.current = false;
        }
        syncUrl(normalized);

        const contactedPromise = loadContacted();
        const res = await fetch(`/api/search?${params.toString()}`, {
          signal: abort.signal,
        });
        if (abort.signal.aborted) return;
        const [data, contacted] = await Promise.all([
          res.json(),
          contactedPromise,
        ]);
        if (abort.signal.aborted) return;
        if (!res.ok) {
          const wait = Number(data.retryAfterSeconds) || 0;
          if (wait > 0) {
            cooldownEndsAtRef.current = Date.now() + wait * 1000;
            setRetryAfterSeconds(wait);
          }
          setSearchError(
            data.error || data.message || `Search failed (${res.status})`
          );
          if (!append) {
            setResults([]);
            setTotalCount(0);
          }
          return;
        }
        if (data.warning) setSearchNote(String(data.warning));
        if (typeof data.email_pool_size === "number") {
          setEmailPoolSize(data.email_pool_size);
        }

        const items: User[] = data.items || data.users || [];
        const total = Number(data.total_count) || items.length;
        const visible: User[] = [];
        let hidden = 0;
        for (const user of items) {
          const login = (user.login || "").toLowerCase();
          const email = (user.email || "").toLowerCase();
          if (
            (login && contacted.logins.has(login)) ||
            (email && contacted.emails.has(email))
          ) {
            hidden += 1;
          } else {
            visible.push(user);
          }
        }
        if (abort.signal.aborted) return;

        // Never drop a successful match list — if everyone is "contacted", still show them
        const toShow =
          visible.length > 0 ? visible : items.length > 0 ? items : [];
        const hiddenCount = visible.length > 0 ? hidden : 0;
        if (visible.length === 0 && items.length > 0) {
          setSearchNote(
            `Found ${items.length} with public email — all were already contacted, still showing them.`
          );
        }

        // Empty "load more" must not wipe the list we already have
        if (append && toShow.length === 0) {
          setTotalCount(resultsCountRef.current);
          return;
        }

        applyPageResult(normalized, page, toShow, hiddenCount, total, {
          append,
          scroll: !append,
        });
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        console.error(err);
        if (abort.signal.aborted) return;
        setSearchError("Search failed. Check your connection and try again.");
        if (!append) {
          setResults([]);
          setTotalCount(0);
        }
      } finally {
        if (append) setLoadingMore(false);
        else setLoading(false);
      }
    },
    [applyPageResult, loadContacted, totalCount]
  );

  const loadMore = useCallback(() => {
    if (
      !initialFilters ||
      loading ||
      loadingMore ||
      !hasMore ||
      retryAfterSeconds > 0
    ) {
      return;
    }
    const now = Date.now();
    if (now - loadMoreGateRef.current < 2500) return;
    loadMoreGateRef.current = now;
    void handleSearch(initialFilters, currentPage + 1, { append: true });
  }, [
    initialFilters,
    loading,
    loadingMore,
    hasMore,
    retryAfterSeconds,
    handleSearch,
    currentPage,
  ]);

  useEffect(() => {
    const node = loadMoreRef.current;
    if (!node || !hasMore || retryAfterSeconds > 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) loadMore();
      },
      { root: null, rootMargin: "120px", threshold: 0 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, loadMore, results.length, retryAfterSeconds]);

  const handleResetFilters = () => {
    clearCache();
    resetEmailScanRef.current = true;
    pageCacheRef.current = {};
    filterKeyRef.current = "";
    setResults([]);
    setHasSearched(false);
    setInitialFilters(null);
    setShowFavorites(false);
    setHiddenContactedCount(0);
    setTotalCount(0);
    setCurrentPage(1);
    setSearchError(null);
    setSearchNote(null);
    window.history.replaceState(null, "", "/");
  };

  const handleMessageSent = (info: { login?: string | null; email: string }) => {
    const login = (info.login || "").toLowerCase();
    const email = (info.email || "").toLowerCase();
    setContactedLogins((prev) => {
      const next = new Set(prev);
      if (login && login !== "candidate") next.add(login);
      return next;
    });
    setContactedEmails((prev) => {
      const next = new Set(prev);
      if (email) next.add(email);
      return next;
    });
    setResults((prev) => {
      const next = prev.filter((u) => {
        const uLogin = (u.login || "").toLowerCase();
        const uEmail = (u.email || "").toLowerCase();
        if (login && login !== "candidate" && uLogin === login) return false;
        if (email && uEmail === email) return false;
        return true;
      });
      const removed = prev.length - next.length;
      if (removed > 0) {
        setHiddenContactedCount((c) => c + removed);
      }
      const pageKey = String(currentPage);
      const prevHidden = pageCacheRef.current[pageKey]?.hidden || 0;
      pageCacheRef.current[pageKey] = {
        items: next,
        hidden: prevHidden + removed,
      };
      if (initialFilters) {
        writeCache(initialFilters, next, totalCount, pageCacheRef.current);
      }
      return next;
    });
    setEmailComposerUser(null);
  };

  const handleFavorite = (user: User) => {
    setFavorites((prev) => {
      const next = prev.includes(user.login)
        ? prev.filter((login) => login !== user.login)
        : [...prev, user.login];
      localStorage.setItem("favorites", JSON.stringify(next));
      return next;
    });

    if (session?.user) {
      const isRemoving = favorites.includes(user.login);
      if (isRemoving && user.id) {
        void fetch(`/api/favorites/${user.id}`, { method: "DELETE" });
      } else if (!isRemoving) {
        void fetch("/api/favorites", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            githubId: user.id || 0,
            login: user.login,
            avatarUrl: user.avatar_url,
            name: user.name || null,
            bio: user.bio || null,
            location: user.location || null,
            publicRepos: user.public_repos || 0,
            followers: user.followers || 0,
            following: user.following || 0,
            htmlUrl: user.html_url,
            email: user.email || null,
          }),
        });
      }
    }
  };

  const handleExport = (format: string) => {
    const data = showFavorites
      ? results.filter((u) => favorites.includes(u.login))
      : results;
    let c = "";
    let filename = "";
    if (format === "csv") {
      const headers = [
        "Login",
        "Name",
        "Email",
        "Location",
        "Followers",
        "Repos",
        "GitHub URL",
      ];
      const rows = data.map((u) => [
        u.login,
        u.name || "",
        u.email || "",
        u.location || "",
        u.followers || 0,
        u.public_repos || 0,
        u.html_url,
      ]);
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

  const displayed = showFavorites
    ? results.filter((u) => favorites.includes(u.login))
    : results;
  const hasResultRows = displayed.length > 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <AppNav />

      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-8">
          <SearchForm
            key={restored ? "search-ready" : "search-boot"}
            onSearch={handleSearch}
            isLoading={loading}
            initialFilters={restored ? initialFilters : null}
            onResetFilters={handleResetFilters}
          />
        </div>

        {hasResultRows && (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <p className="text-sm text-gray-600">
              {showFavorites
                ? `${displayed.length} favorites`
                : `${results.length} shown${
                    initialFilters?.hasEmail || initialFilters?.hasEmailOnly
                      ? " with public email"
                      : ""
                  }${
                    totalCount
                      ? ` · ${
                          totalCount > 1000
                            ? `first ${displayTotal.toLocaleString()} of many`
                            : `~${displayTotal.toLocaleString()}`
                        } ${
                          initialFilters?.hasEmail ||
                          initialFilters?.hasEmailOnly
                            ? emailPoolSize
                              ? `email matches (pool ${emailPoolSize})`
                              : "email matches found"
                            : "matches"
                        }`
                      : ""
                  }${
                    hiddenContactedCount > 0
                      ? ` · ${hiddenContactedCount} already contacted hidden`
                      : ""
                  }${hasMore ? " · scroll for more" : ""}`}
            </p>
            <div className="flex flex-wrap gap-2">
              {(initialFilters?.hasEmail || initialFilters?.hasEmailOnly) &&
                emailPoolSize < PER_PAGE &&
                !loading && (
                  <button
                    type="button"
                    onClick={() =>
                      void handleSearch({ ...initialFilters, page: 1 })
                    }
                    className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
                  >
                    Keep scanning for emails
                    {emailPoolSize > 0 ? ` (${emailPoolSize} so far)` : ""}
                  </button>
                )}
              <button
                onClick={() => setShowFavorites(!showFavorites)}
                className={
                  "flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm " +
                  (showFavorites
                    ? "bg-red-100 text-red-700"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200")
                }
              >
                <Heart className="h-4 w-4" />
                {showFavorites ? "Showing Favorites" : "Show Favorites"}
              </button>
              <button
                onClick={() => setShowExportModal(true)}
                className="flex items-center gap-1 rounded-lg bg-gray-100 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-200"
              >
                <Download className="h-4 w-4" />
                Export
              </button>
            </div>
          </div>
        )}

        {(searchError || retryAfterSeconds > 0) && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
            <p>{searchError}</p>
            {retryAfterSeconds > 0 && (
              <p className="mt-1 font-medium">
                Cooldown: {retryAfterSeconds}s — search is paused until this hits 0.
              </p>
            )}
          </div>
        )}
        {searchNote && !searchError && (
          <div className="mb-4 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900">
            <p>{searchNote}</p>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
          </div>
        ) : hasResultRows ? (
          <>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {displayed.map((user) => (
                <DeveloperCard
                  key={user.login}
                  user={user}
                  onFavorite={handleFavorite}
                  isFavorited={favorites.includes(user.login)}
                  onSendEmail={openSendMessage}
                />
              ))}
            </div>

            {!showFavorites && (
              <div ref={loadMoreRef} className="mt-8 flex flex-col items-center gap-2 py-4">
                {loadingMore && (
                  <div className="h-7 w-7 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
                )}
                {hasMore ? (
                  <p className="text-xs text-gray-500">
                    Loading {PER_PAGE} at a time — scroll for more
                  </p>
                ) : (
                  <p className="text-xs text-gray-500">
                    End of available results
                    {totalCount
                      ? ` (~${Math.min(totalCount, 1000).toLocaleString()} max)`
                      : ""}
                  </p>
                )}
                {hasMore && !loadingMore && (
                  <button
                    type="button"
                    onClick={loadMore}
                    className="mt-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    Load more
                  </button>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="rounded-lg bg-white py-12 text-center shadow-sm">
            <Github className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">
              {hasSearched
                ? emailPoolSize > 0
                  ? "Matches found — keep scanning"
                  : "No developers found"
                : "Set filters to search"}
            </h3>
            <p className="mt-2 text-sm text-gray-500">
              {hasSearched
                ? emailPoolSize > 0
                  ? `API found ${emailPoolSize} with public email. Click Search again to load the next batch onto the page.`
                  : "Try adjusting your search filters to find more developers."
                : "Change any filter above — results update automatically."}
            </p>
            {hasSearched &&
              emailPoolSize > 0 &&
              initialFilters &&
              (initialFilters.hasEmail || initialFilters.hasEmailOnly) && (
                <button
                  type="button"
                  onClick={() => void handleSearch({ ...initialFilters, page: 1 })}
                  className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  Load email matches
                </button>
              )}
          </div>
        )}
      </main>

      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white shadow-xl">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">Export Developers</h2>
              <button
                onClick={() => setShowExportModal(false)}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6">
              <p className="mb-4 text-sm text-gray-600">
                {showFavorites
                  ? `Export ${displayed.length} favorited developers`
                  : `Export ${results.length} developers`}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => handleExport("csv")}
                  className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  Export as CSV
                </button>
                <button
                  onClick={() => handleExport("json")}
                  className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Export as JSON
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {emailComposerUser && (
        <EmailComposer
          isOpen={true}
          onClose={() => setEmailComposerUser(null)}
          developer={emailComposerUser}
          onSent={handleMessageSent}
        />
      )}
    </div>
  );
}
