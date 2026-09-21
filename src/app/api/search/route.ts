import { NextRequest, NextResponse } from "next/server";
import {
  searchUsers,
  searchRepositories,
  getUser,
  isSecondaryRateLimit,
  isPrimaryRateLimit,
  isNetworkGithubError,
  tokenManager,
} from "@/lib/github";
import {
  buildRepoSearchQuery,
  buildUserSearchQuery,
  compactSearchText,
  normalizeSearchText,
  type SearchScope,
} from "@/lib/search-query";
import validator from "email-validator";

export const maxDuration = 60;

const SEARCH_CACHE_TTL_MS = 3 * 60 * 1000;
const searchCache = new Map<
  string,
  { expires: number; body: Record<string, unknown> }
>();

/**
 * "Has email" is rare on GitHub (~5–15%). To fill a 150-dev page we must
 * walk deep into Search results and remember progress across Next/Search.
 */
const EMAIL_SCAN_PER_PAGE = 30; // small GitHub search pages
const MAX_EMAIL_SCAN_PAGES = 10;
/** Hard cap — keep “Has email” under a few seconds */
const MAX_LOOKUPS_PER_REQUEST = 12;
const ENRICH_STAGGER_MS = 0;
const ENRICH_CONCURRENCY = 4;
const EMAIL_SCAN_STATE_TTL_MS = 30 * 60 * 1000;
/** Only fill the current scroll chunk */
const MIN_EMAIL_POOL_TARGET = 12;
const PAGE_SIZE_DEFAULT = 8;
const PAGE_SIZE_MAX = 12;

type EmailScanState = {
  expires: number;
  matched: any[];
  nextGhPage: number;
  /** Index within the current GitHub search page (for partial budget cuts). */
  pageOffset: number;
  ghExhausted: boolean;
  githubTotal: number;
  profileLookups: number;
  scannedGithubPages: number;
  /** Logins already enriched (with or without email) so we never re-hit them. */
  seenLogins: string[];
};

const emailScanStates = new Map<string, EmailScanState>();

const detectGender = (bio: string | null): string | null => {
  if (!bio) return null;
  const lowerBio = bio.toLowerCase();
  if (
    /\b(non-binary|nonbinary|enby|agender|genderfluid|genderqueer|bigender|pangender)\b/i.test(
      lowerBio
    )
  ) {
    return "non-binary";
  }
  if (
    /\b(pronouns?[:\s]+(they|them))\b/i.test(lowerBio) ||
    /\b(uses?[:\s]+(they|them))\b/i.test(lowerBio)
  ) {
    return "non-binary";
  }
  const sheMatches = lowerBio.match(/\b(she|her|hers)\b/gi);
  if (sheMatches && sheMatches.length > 0) return "female";
  const heMatches = lowerBio.match(/\b(he|him|his)\b/gi);
  if (heMatches && heMatches.length > 0) return "male";
  return null;
};

function validateEmail(
  email: string | null
): { valid: boolean; email: string | null } {
  if (!email) return { valid: false, email: null };
  if (validator.validate(email)) return { valid: true, email };
  return { valid: false, email: null };
}

/** Fast email check for search lists — avoids Hunter/AI on every row (too slow / sparse). */
function findPublicEmail(user: {
  email: string | null;
  blog: string;
}): { email: string | null; emailSource: string; emailConfidence: string } {
  const githubValidation = validateEmail(user.email);
  if (githubValidation.valid) {
    return {
      email: githubValidation.email,
      emailSource: "github_public",
      emailConfidence: "high",
    };
  }

  const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
  if (user.blog && emailPattern.test(user.blog)) {
    const blogEmail = user.blog.match(emailPattern)?.[0] || null;
    const blogValidation = validateEmail(blogEmail);
    if (blogValidation.valid) {
      return {
        email: blogValidation.email,
        emailSource: "blog",
        emailConfidence: "medium",
      };
    }
  }

  return { email: null, emailSource: "not_found", emailConfidence: "low" };
}

/** List cards from search hits — no per-user API call. */
function mapSearchItem(user: any, languageList: string[]) {
  return {
    ...user,
    name: user.name || null,
    followers: user.followers || 0,
    following: user.following || 0,
    public_repos: user.public_repos || 0,
    created_at: user.created_at || null,
    hasEmail: !!user.hasEmail,
    hasEmailOnly: !!user.hasEmailOnly,
    email: user.email ?? null,
    emailSource: user.emailSource || "not_found",
    emailConfidence: user.emailConfidence || "low",
    blog: user.blog || "",
    bio: user.bio || "",
    company: user.company || null,
    location: user.location || null,
    language: languageList[0] || user.language || null,
    languages: languageList.length ? languageList : null,
    matched_repo: user.matched_repo || null,
    matched_repo_full_name: user.matched_repo_full_name || null,
    matched_repo_pushed_at: user.matched_repo_pushed_at || null,
  };
}

async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>,
  signal?: AbortSignal
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let nextIndex = 0;
  let stop = false;

  async function worker() {
    while (!stop && nextIndex < items.length) {
      if (signal?.aborted) {
        stop = true;
        break;
      }
      const index = nextIndex++;
      try {
        results[index] = await fn(items[index], index);
      } catch (error) {
        if (isSecondaryRateLimit(error) || isPrimaryRateLimit(error)) {
          stop = true;
          throw error;
        }
        throw error;
      }
      if (nextIndex < items.length) {
        await new Promise((r) => setTimeout(r, ENRICH_STAGGER_MS));
      }
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, Math.max(1, items.length)) },
    () => worker()
  );
  await Promise.all(workers);
  return results;
}

function applyPostFilters(
  users: any[],
  opts: {
    hasEmail: boolean;
    hasEmailOnly: boolean;
    gender: string;
  }
) {
  let next = users;
  if (opts.hasEmailOnly) {
    next = next.filter((u) => u.hasEmailOnly);
  } else if (opts.hasEmail) {
    next = next.filter((u) => u.hasEmail);
  }
  if (opts.gender && opts.gender !== "all") {
    next = next.filter((u) => detectGender(u.bio) === opts.gender);
  }
  return next;
}

function emailStateKey(params: URLSearchParams): string {
  const copy = new URLSearchParams(params);
  copy.delete("page");
  copy.delete("per_page");
  copy.delete("reset");
  return copy.toString();
}

function getEmailScanState(key: string, reset: boolean): EmailScanState {
  if (reset) emailScanStates.delete(key);
  const existing = emailScanStates.get(key);
  if (existing && existing.expires > Date.now()) return existing;
  const fresh: EmailScanState = {
    expires: Date.now() + EMAIL_SCAN_STATE_TTL_MS,
    matched: [],
    nextGhPage: 1,
    pageOffset: 0,
    ghExhausted: false,
    githubTotal: 0,
    profileLookups: 0,
    scannedGithubPages: 0,
    seenLogins: [],
  };
  emailScanStates.set(key, fresh);
  return fresh;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const cacheKey = `fast-v2:${searchParams.toString()}`;
  const cached = searchCache.get(cacheKey);
  if (cached && cached.expires > Date.now()) {
    return NextResponse.json({ ...cached.body, cached: true });
  }

  const waitUpFront = tokenManager.secondaryWaitSeconds();
  if (waitUpFront > 0) {
    return NextResponse.json(
      {
        error: `GitHub secondary rate limit. Wait about ${waitUpFront}s, then try again.`,
        rateLimited: true,
        retryAfterSeconds: waitUpFront,
      },
      { status: 429 }
    );
  }

  const q = searchParams.get("q") || "";
  const language = searchParams.get("language") || "";
  const location = searchParams.get("location") || "";
  const minFollowers = searchParams.get("minFollowers") || "";
  const maxFollowers = searchParams.get("maxFollowers") || "";
  const minRepos = searchParams.get("minRepos") || "";
  const company = searchParams.get("company") || "";
  const hireable = searchParams.get("hireable") === "true";
  const blog = searchParams.get("blog") || "";
  const bio = searchParams.get("bio") || "";
  const skills = searchParams.get("skills") || "";
  const gender = searchParams.get("gender") || "all";
  const repoName = searchParams.get("repoName") || "";
  const pushedWithin = searchParams.get("pushedWithin") || "";
  const createdWithin = searchParams.get("createdWithin") || "";
  const minStars = searchParams.get("minStars") || "";
  const searchScope = (searchParams.get("searchScope") || "all") as SearchScope;
  const sort =
    (searchParams.get("sort") as "followers" | "repositories" | "joined") ||
    "followers";
  const order = (searchParams.get("order") as "asc" | "desc") || "desc";
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
  const perPage = Math.min(
    PAGE_SIZE_MAX,
    Math.max(
      1,
      parseInt(searchParams.get("per_page") || String(PAGE_SIZE_DEFAULT), 10) ||
        PAGE_SIZE_DEFAULT
    )
  );
  const hasEmail = searchParams.get("hasEmail") === "true";
  const hasEmailOnly = searchParams.get("hasEmailOnly") === "true";
  const resetScan = searchParams.get("reset") === "1";

  try {
    const languageList = language
      .split(",")
      .map((l) => l.trim())
      .filter(Boolean);
    const skillList = skills
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const composedQuery = buildUserSearchQuery({
      q,
      scope: ["all", "login", "fullname", "email"].includes(searchScope)
        ? searchScope
        : "all",
      languages: languageList,
      location,
      minFollowers,
      maxFollowers,
      minRepos,
      company,
      hireable,
      blog,
      bio,
      skills: skillList,
      createdWithinDays: createdWithin,
    });

    if (!composedQuery && !repoName.trim() && !pushedWithin) {
      return NextResponse.json(
        {
          error:
            "Add a keyword, location, language, or another filter before searching.",
          items: [],
          total_count: 0,
        },
        { status: 400 }
      );
    }

    const useRepoDiscovery = !!(repoName.trim() || pushedWithin);
    const repoQuery = useRepoDiscovery
      ? buildRepoSearchQuery({
          repoName,
          languages: languageList,
          pushedWithinDays: pushedWithin,
          minStars,
        })
      : "";

    const needsFill =
      hasEmail || hasEmailOnly || (gender && gender !== "all");

    const enrichUser = async (user: any) => {
      try {
        const userDetail = await getUser(user.login);
        const emailResult = findPublicEmail({
          email: userDetail.email,
          blog: userDetail.blog || "",
        });
        return {
          ...user,
          name: userDetail.name,
          followers: userDetail.followers,
          following: userDetail.following,
          public_repos: userDetail.public_repos,
          created_at: userDetail.created_at,
          hasEmail: emailResult.email !== null,
          hasEmailOnly:
            emailResult.emailSource === "github_public" ||
            emailResult.emailSource === "github_oauth",
          email: emailResult.email,
          emailSource: emailResult.emailSource,
          emailConfidence: emailResult.emailConfidence,
          blog: userDetail.blog || "",
          bio: userDetail.bio || "",
          company: userDetail.company,
          location: userDetail.location,
          language: languageList[0] || user.language || null,
          languages: languageList.length ? languageList : null,
        };
      } catch (error) {
        if (isSecondaryRateLimit(error) || isPrimaryRateLimit(error)) {
          throw error;
        }
        return mapSearchItem(user, languageList);
      }
    };

    const filterOpts = { hasEmail, hasEmailOnly, gender };
    let totalCount = 0;
    let pageItems: any[] = [];
    let scannedGithubPages = 0;
    let rateLimitedPartial = false;
    let profileLookups = 0;
    let emailPoolSize = 0;
    let scanContinued = false;
    let searchMode: "users" | "repos" = "users";

    /** Collect unique User owners from repository search. */
    const collectRepoOwners = async (want: number) => {
      const owners: any[] = [];
      const seen = new Set<string>();
      let ghPage = 1;
      let repoTotal = 0;
      const qCompact = compactSearchText(q).toLowerCase();
      const qNorm = normalizeSearchText(q).toLowerCase();

      while (owners.length < want && ghPage <= 10 && !request.signal.aborted) {
        const batch = await searchRepositories({
          q: repoQuery,
          sort: "updated",
          order: "desc",
          page: ghPage,
          per_page: 100,
        });
        if (ghPage === 1) repoTotal = batch.total_count || 0;
        scannedGithubPages = ghPage;

        for (const repo of batch.items || []) {
          const o = repo.owner;
          if (!o?.login || o.type === "Organization") continue;
          const key = o.login.toLowerCase();
          if (seen.has(key)) continue;
          // Optional keyword filter on owner login when q is also set
          if (qCompact) {
            const login = key;
            if (
              !login.includes(qCompact) &&
              !(qNorm && login.includes(qNorm.replace(/\s/g, "")))
            ) {
              continue;
            }
          }
          seen.add(key);
          owners.push({
            login: o.login,
            id: o.id,
            avatar_url: o.avatar_url,
            html_url: o.html_url,
            matched_repo: repo.name,
            matched_repo_full_name: repo.full_name,
            matched_repo_pushed_at: repo.pushed_at,
            language: repo.language,
            followers: 0,
            public_repos: 0,
            hasEmail: false,
            email: null,
          });
          if (owners.length >= want) break;
        }

        if ((batch.items || []).length < 100) break;
        ghPage += 1;
        await new Promise((r) => setTimeout(r, 100));
      }

      return { owners, repoTotal, seen: seen.size };
    };

    if (useRepoDiscovery && !needsFill) {
      searchMode = "repos";
      const start = (page - 1) * perPage;
      const want = start + perPage;
      const { owners, repoTotal } = await collectRepoOwners(
        Math.min(want + 5, 40)
      );
      pageItems = owners
        .slice(start, start + perPage)
        .map((u) => mapSearchItem(u, languageList));
      const more =
        owners.length > start + perPage ||
        (scannedGithubPages < 10 && repoTotal > scannedGithubPages * 100);
      totalCount = more
        ? Math.max(owners.length, start + perPage + 1)
        : owners.length;
    } else if (!needsFill) {
      // Fast path: one GitHub search call for this chunk only
      const batch = await searchUsers({
        q: composedQuery,
        sort,
        order,
        page,
        per_page: perPage,
      });
      totalCount = batch.total_count || 0;
      scannedGithubPages = page;
      pageItems = (batch.items || []).map((user: any) =>
        mapSearchItem(user, languageList)
      );
    } else if (useRepoDiscovery) {
      // Repo discovery + email/gender post-filters
      searchMode = "repos";
      const need = perPage;
      const skip = (page - 1) * perPage;
      const want = skip + need;
      const { owners } = await collectRepoOwners(
        Math.min(Math.max(want * 3, 200), 500)
      );
      const matched: any[] = [];
      try {
        const enriched = await mapPool(
          owners,
          ENRICH_CONCURRENCY,
          (user) => enrichUser(user),
          request.signal
        );
        profileLookups = owners.length;
        matched.push(...applyPostFilters(enriched, filterOpts));
      } catch (error) {
        if (isSecondaryRateLimit(error) || isPrimaryRateLimit(error)) {
          rateLimitedPartial = true;
        } else {
          throw error;
        }
      }
      emailPoolSize = matched.length;
      pageItems = matched.slice(skip, skip + need);
      totalCount = matched.length;
    } else {
      const need = perPage;
      const skip = (page - 1) * perPage;
      const want = skip + need;
      // Only fill this scroll chunk — never deep-scan for a huge pool
      const target = want;

      const stateKey = emailStateKey(searchParams);
      // Same filters → keep growing the email pool (Search again / Next).
      // reset=1 or a new filter key starts fresh.
      const state = getEmailScanState(stateKey, resetScan);
      scanContinued = state.matched.length > 0;

      let lookupsThisRequest = 0;

      while (
        state.matched.length < target &&
        !state.ghExhausted &&
        state.nextGhPage <= MAX_EMAIL_SCAN_PAGES &&
        lookupsThisRequest < MAX_LOOKUPS_PER_REQUEST &&
        !request.signal.aborted
      ) {
        const ghPage = state.nextGhPage;
        const batch = await searchUsers({
          q: composedQuery,
          sort,
          order,
          page: ghPage,
          per_page: EMAIL_SCAN_PER_PAGE,
        });
        if (ghPage === 1 && state.pageOffset === 0) {
          state.githubTotal = batch.total_count || 0;
        }
        state.scannedGithubPages = ghPage;

        const items = batch.items || [];
        if (!items.length) {
          state.ghExhausted = true;
          break;
        }

        const budgetLeft = MAX_LOOKUPS_PER_REQUEST - lookupsThisRequest;
        const slice = items.slice(state.pageOffset, state.pageOffset + budgetLeft);
        if (!slice.length) {
          state.nextGhPage = ghPage + 1;
          state.pageOffset = 0;
          if (items.length < EMAIL_SCAN_PER_PAGE) state.ghExhausted = true;
          continue;
        }

        const seen = new Set(state.seenLogins);
        const freshUsers = slice.filter((u: any) => {
          const login = String(u.login || "").toLowerCase();
          if (!login || seen.has(login)) return false;
          seen.add(login);
          return true;
        });

        if (freshUsers.length) {
          let enriched: any[];
          try {
            enriched = await mapPool(
              freshUsers,
              ENRICH_CONCURRENCY,
              (user) => enrichUser(user),
              request.signal
            );
            lookupsThisRequest += freshUsers.length;
            state.profileLookups += freshUsers.length;
            for (const u of freshUsers) {
              const login = String(u.login || "").toLowerCase();
              if (login) state.seenLogins.push(login);
            }
          } catch (error) {
            if (isSecondaryRateLimit(error) || isPrimaryRateLimit(error)) {
              rateLimitedPartial = true;
              break;
            }
            throw error;
          }
          state.matched.push(...applyPostFilters(enriched, filterOpts));
        }

        state.pageOffset += slice.length;
        state.expires = Date.now() + EMAIL_SCAN_STATE_TTL_MS;

        if (state.pageOffset >= items.length) {
          state.nextGhPage = ghPage + 1;
          state.pageOffset = 0;
          if (items.length < EMAIL_SCAN_PER_PAGE) {
            state.ghExhausted = true;
            break;
          }
          await new Promise((r) => setTimeout(r, 120));
        } else {
          // Budget cut mid-page — continue this page on the next Search/Next
          break;
        }
      }

      emailScanStates.set(stateKey, state);
      profileLookups = state.profileLookups;
      scannedGithubPages = state.scannedGithubPages;
      emailPoolSize = state.matched.length;
      pageItems = state.matched.slice(skip, skip + need);

      const morePossible =
        !state.ghExhausted &&
        !rateLimitedPartial &&
        state.nextGhPage <= MAX_EMAIL_SCAN_PAGES;

      if (state.matched.length >= want && morePossible) {
        totalCount = Math.max(state.matched.length, want + need);
      } else if (morePossible && state.matched.length < target) {
        totalCount = Math.max(state.matched.length, want + 1);
      } else {
        totalCount = state.matched.length;
      }
    }

    // Normal search: skip per-user profile lookups (fast). Emails load when
    // "Has email" / gender filters run the enrich path above.
    if (!needsFill) {
      emailPoolSize = pageItems.filter((u) => u.email).length;
    }

    const emailScanNote = !needsFill
      ? undefined
      : rateLimitedPartial
        ? undefined
        : pageItems.length === 0
          ? "No public-email matches yet. Click Search again to keep scanning (GitHub hides most emails)."
          : emailPoolSize < MIN_EMAIL_POOL_TARGET &&
              scannedGithubPages < MAX_EMAIL_SCAN_PAGES
            ? `Found ${emailPoolSize} with public email so far (checked ${profileLookups} profiles). Scroll or Search again for more.`
            : emailPoolSize >= MIN_EMAIL_POOL_TARGET
              ? `Email pool: ${emailPoolSize} developers with public email (${profileLookups} profiles checked).`
              : `Found ${emailPoolSize} with public email after scanning available GitHub results (${profileLookups} profiles). Public email is uncommon — this may be most of what’s available for these filters.`;

    const body = {
      total_count: totalCount,
      incomplete_results: rateLimitedPartial,
      items: pageItems,
      filled: pageItems.length,
      per_page: perPage,
      scanned_github_pages: scannedGithubPages,
      profile_lookups: profileLookups,
      email_pool_size: emailPoolSize,
      email_filter: needsFill,
      scan_continued: scanContinued,
      warning: rateLimitedPartial
        ? needsFill
          ? "GitHub briefly limited profile lookups. Wait ~1–2 minutes, then click Search again to continue the email scan."
          : "GitHub briefly limited profile lookups — some emails on this page may be missing. Wait ~1–2 minutes and search again."
        : emailScanNote,
      query: {
        q,
        language: languageList.join(",") || language,
        languages: languageList,
        location,
        minFollowers,
        maxFollowers,
        minRepos,
        company,
        hireable,
        blog,
        bio,
        skills,
        gender,
        sort,
        order,
        page,
        per_page: perPage,
        hasEmail,
        hasEmailOnly,
        repoName,
        pushedWithin,
        createdWithin,
        minStars,
        searchScope,
        composed: useRepoDiscovery ? repoQuery : composedQuery,
        mode: searchMode,
      },
      search_mode: searchMode,
    };

    if (!rateLimitedPartial && !needsFill) {
      searchCache.set(cacheKey, {
        expires: Date.now() + SEARCH_CACHE_TTL_MS,
        body,
      });
      if (searchCache.size > 80) {
        const first = searchCache.keys().next().value;
        if (first) searchCache.delete(first);
      }
    }

    return NextResponse.json(body);
  } catch (error: unknown) {
    console.error("Search error:", error);
    const wait = tokenManager.secondaryWaitSeconds();

    if (
      isSecondaryRateLimit(error) ||
      (wait > 0 &&
        String((error as Error)?.message || "").includes("secondary"))
    ) {
      const seconds = wait || 90;
      return NextResponse.json(
        {
          error: `GitHub secondary rate limit. Wait about ${seconds}s, then try again. Tip: avoid rapid filter changes and “Has email” until the cooldown ends.`,
          rateLimited: true,
          retryAfterSeconds: seconds,
        },
        { status: 429 }
      );
    }

    if (
      isPrimaryRateLimit(error) ||
      (error as { status?: number })?.status === 403
    ) {
      return NextResponse.json(
        {
          error: "GitHub API rate limit exceeded. Please wait and try again.",
          rateLimited: true,
          retryAfterSeconds: wait || 60,
        },
        { status: 429 }
      );
    }

    if (isNetworkGithubError(error)) {
      return NextResponse.json(
        {
          error:
            "Could not reach api.github.com (timeout or DNS). Check your internet connection and try again.",
          networkError: true,
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      {
        error: "Search failed",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
