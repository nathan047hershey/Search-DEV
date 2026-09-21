import { Octokit } from "@octokit/rest";

// Token rotation manager
interface TokenStatus {
  token: string;
  remaining: number;
  resetTime: number;
  isAuthenticated: boolean;
  /** Unix seconds — secondary rate-limit cooldown */
  secondaryBlockedUntil: number;
}

class TokenManager {
  private tokens: string[] = [];
  private tokenStatuses: Map<string, TokenStatus> = new Map();
  private currentTokenIndex = 0;
  /** Global pause after secondary rate limit (Unix seconds) */
  private globalSecondaryUntil = 0;

  constructor() {
    this.initializeTokens();
  }

  private initializeTokens() {
    const tokenEnv = process.env.GITHUB_TOKEN || "";
    // Support comma-separated tokens for unlimited usage
    this.tokens = tokenEnv.split(",").map((t) => t.trim()).filter((t) => t.length > 0);

    if (this.tokens.length === 0) {
      console.warn("No GitHub tokens configured. Set GITHUB_TOKEN in .env.local");
    }
  }

  markSecondaryRateLimit(token: string | null, waitSeconds = 60) {
    const capped = Math.min(Math.max(waitSeconds, 30), 180);
    const until = Date.now() / 1000 + capped;
    this.globalSecondaryUntil = Math.max(this.globalSecondaryUntil, until);
    if (token) {
      const status = this.tokenStatuses.get(token);
      if (status) {
        status.secondaryBlockedUntil = until;
      } else {
        this.tokenStatuses.set(token, {
          token,
          remaining: 0,
          resetTime: until,
          isAuthenticated: false,
          secondaryBlockedUntil: until,
        });
      }
    }
  }

  secondaryWaitSeconds(): number {
    const now = Date.now() / 1000;
    if (this.globalSecondaryUntil <= now) return 0;
    return Math.ceil(this.globalSecondaryUntil - now);
  }

  getAvailableToken(): string | null {
    if (this.tokens.length === 0) return null;

    const now = Date.now() / 1000;

    for (let i = 0; i < this.tokens.length; i++) {
      const token = this.tokens[(this.currentTokenIndex + i) % this.tokens.length];
      const status = this.tokenStatuses.get(token);

      if (!status) {
        this.currentTokenIndex = (this.currentTokenIndex + i) % this.tokens.length;
        return token;
      }

      if (status.secondaryBlockedUntil > now) continue;

      if (status.resetTime <= now) {
        status.remaining = 5000;
        this.currentTokenIndex = (this.currentTokenIndex + i) % this.tokens.length;
        return token;
      }

      if (status.remaining > 0) {
        this.currentTokenIndex = (this.currentTokenIndex + i) % this.tokens.length;
        return token;
      }
    }

    // All tokens exhausted / secondary-blocked — fail fast (do not reuse a blocked token)
    return null;
  }

  updateTokenStatus(
    token: string,
    remaining: number,
    resetTime: number,
    isAuthenticated: boolean
  ) {
    const prev = this.tokenStatuses.get(token);
    this.tokenStatuses.set(token, {
      token,
      remaining,
      resetTime,
      isAuthenticated,
      secondaryBlockedUntil: prev?.secondaryBlockedUntil || 0,
    });
  }

  getStatus(): { available: number; total: number } {
    const now = Date.now() / 1000;
    let available = 0;

    for (const token of this.tokens) {
      const status = this.tokenStatuses.get(token);
      if (
        !status ||
        (status.resetTime <= now && status.secondaryBlockedUntil <= now)
      ) {
        available++;
      }
    }

    return { available, total: this.tokens.length };
  }
}

// Singleton instance
const tokenManager = new TokenManager();

const userCache = new Map<string, { user: GitHubUser; expires: number }>();
const USER_CACHE_TTL_MS = 10 * 60 * 1000;

export interface GitHubUser {
  login: string;
  id: number;
  avatar_url: string;
  html_url: string;
  name: string | null;
  company: string | null;
  blog: string;
  location: string | null;
  bio: string | null;
  public_repos: number;
  followers: number;
  following: number;
  created_at: string;
  email: string | null;
  twitter_username?: string | null;
  hireable?: boolean | null;
}

export interface GitHubSearchParams {
  q: string;
  language?: string;
  location?: string;
  minFollowers?: number;
  sort?: "followers" | "repositories" | "joined";
  order?: "asc" | "desc";
  page?: number;
  per_page?: number;
}

export interface GitHubRepoSearchParams {
  q: string;
  sort?: "stars" | "forks" | "help-wanted-issues" | "updated";
  order?: "asc" | "desc";
  page?: number;
  per_page?: number;
}

export interface GitHubRepoSearchItem {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  pushed_at: string | null;
  updated_at: string | null;
  owner: {
    login: string;
    id: number;
    avatar_url: string;
    html_url: string;
    type?: string;
  } | null;
}

export function isSecondaryRateLimit(error: unknown): boolean {
  const err = error as {
    status?: number;
    message?: string;
    response?: { data?: { message?: string } };
  };
  const msg = String(
    err?.response?.data?.message || err?.message || ""
  ).toLowerCase();
  return (
    err?.status === 403 &&
    (msg.includes("secondary rate limit") || msg.includes("abuse detection"))
  );
}

export function isPrimaryRateLimit(error: unknown): boolean {
  const err = error as { status?: number; message?: string };
  const msg = String(err?.message || "").toLowerCase();
  return (
    err?.status === 403 &&
    (msg.includes("rate limit") || msg.includes("api rate limit")) &&
    !isSecondaryRateLimit(error)
  );
}

export function isNetworkGithubError(error: unknown): boolean {
  const err = error as { message?: string; cause?: { code?: string } };
  const msg = String(err?.message || "").toLowerCase();
  const code = String(err?.cause?.code || "").toUpperCase();
  return (
    msg.includes("connect timeout") ||
    msg.includes("enotfound") ||
    msg.includes("fetch failed") ||
    code === "ENOTFOUND" ||
    code === "UND_ERR_CONNECT_TIMEOUT" ||
    code === "ECONNRESET"
  );
}

function waitSecondsFromError(error: unknown, fallback = 90): number {
  const err = error as {
    response?: { headers?: Record<string, unknown> };
    headers?: Record<string, unknown>;
  };
  const headers = err?.response?.headers || err?.headers || {};
  const retryAfter = headers["retry-after"] ?? headers["Retry-After"];
  if (retryAfter != null) {
    const n = parseInt(String(retryAfter), 10);
    if (!Number.isNaN(n) && n > 0) return n;
  }
  return fallback;
}

export async function createOctokit(accessToken?: string) {
  const token = accessToken || tokenManager.getAvailableToken();
  if (!accessToken && !token && tokenManager.getStatus().total > 0) {
    const waitSec = Math.max(tokenManager.secondaryWaitSeconds(), 30);
    const error = new Error(
      `GitHub secondary rate limit — wait about ${waitSec}s before searching again.`
    ) as Error & { status: number };
    error.status = 403;
    throw error;
  }

  return new Octokit({
    auth: token || undefined,
  });
}

function rememberRateHeaders(
  token: string | null,
  headers: Record<string, unknown> | undefined,
  accessToken?: string
) {
  if (!token || !headers) return;
  const remaining = headers["x-ratelimit-remaining"]
    ? parseInt(String(headers["x-ratelimit-remaining"]), 10)
    : 5000;
  const reset = headers["x-ratelimit-reset"]
    ? parseInt(String(headers["x-ratelimit-reset"]), 10)
    : 0;
  tokenManager.updateTokenStatus(token, remaining, reset, !!accessToken);
}

export async function searchUsers(
  params: GitHubSearchParams,
  accessToken?: string
) {
  const octokit = await createOctokit(accessToken);
  const token = accessToken || tokenManager.getAvailableToken();

  let query = params.q;
  if (params.language) {
    query += ` language:${params.language}`;
  }
  if (params.location) {
    query += ` location:${params.location}`;
  }
  if (params.minFollowers) {
    query += ` followers:>=${params.minFollowers}`;
  }

  try {
    const response = await octokit.search.users({
      q: query,
      sort: params.sort || "followers",
      order: params.order || "desc",
      per_page: params.per_page || 30,
      page: params.page || 1,
    });

    rememberRateHeaders(token, response.headers as Record<string, unknown>, accessToken);
    return response.data;
  } catch (error: unknown) {
    if (isSecondaryRateLimit(error)) {
      tokenManager.markSecondaryRateLimit(token, waitSecondsFromError(error, 90));
    }
    const err = error as { headers?: Record<string, unknown> };
    rememberRateHeaders(token, err?.headers, accessToken);
    throw error;
  }
}

/** Search repositories (name / pushed / language) — used to find active owners. */
export async function searchRepositories(
  params: GitHubRepoSearchParams,
  accessToken?: string
) {
  const octokit = await createOctokit(accessToken);
  const token = accessToken || tokenManager.getAvailableToken();

  try {
    const response = await octokit.search.repos({
      q: params.q,
      sort: params.sort || "updated",
      order: params.order || "desc",
      per_page: params.per_page || 30,
      page: params.page || 1,
    });

    rememberRateHeaders(token, response.headers as Record<string, unknown>, accessToken);
    return response.data as {
      total_count: number;
      incomplete_results: boolean;
      items: GitHubRepoSearchItem[];
    };
  } catch (error: unknown) {
    if (isSecondaryRateLimit(error)) {
      tokenManager.markSecondaryRateLimit(token, waitSecondsFromError(error, 90));
    }
    const err = error as { headers?: Record<string, unknown> };
    rememberRateHeaders(token, err?.headers, accessToken);
    throw error;
  }
}

export async function getUser(
  username: string,
  accessToken?: string
): Promise<GitHubUser> {
  const key = username.toLowerCase();
  const cached = userCache.get(key);
  if (cached && cached.expires > Date.now()) {
    return cached.user;
  }

  const octokit = await createOctokit(accessToken);
  const token = accessToken || tokenManager.getAvailableToken();

  try {
    const { data, headers } = await octokit.users.getByUsername({
      username,
    });

    rememberRateHeaders(token, headers as Record<string, unknown>, accessToken);

    const user: GitHubUser = {
      login: data.login,
      id: data.id,
      avatar_url: data.avatar_url,
      html_url: data.html_url,
      name: data.name,
      company: data.company,
      blog: data.blog || "",
      location: data.location,
      bio: data.bio,
      public_repos: data.public_repos,
      followers: data.followers,
      following: data.following,
      created_at: data.created_at,
      email: data.email,
      twitter_username: data.twitter_username,
      hireable: data.hireable,
    };
    userCache.set(key, { user, expires: Date.now() + USER_CACHE_TTL_MS });
    return user;
  } catch (error: unknown) {
    if (isSecondaryRateLimit(error)) {
      tokenManager.markSecondaryRateLimit(token, waitSecondsFromError(error, 90));
    }
    const err = error as { headers?: Record<string, unknown> };
    rememberRateHeaders(token, err?.headers, accessToken);
    throw error;
  }
}

/** Oldest public repo created_at — useful for experience estimation. */
export async function getEarliestRepoCreatedAt(
  username: string,
  accessToken?: string
): Promise<string | null> {
  try {
    const octokit = await createOctokit(accessToken);
    const { data } = await octokit.repos.listForUser({
      username,
      type: "owner",
      sort: "created",
      direction: "asc",
      per_page: 1,
    });
    return data[0]?.created_at || null;
  } catch {
    return null;
  }
}

/**
 * A recent non-fork repo for outreach personalization.
 * Prefers updated repos with some activity; skips .github.io vanity sites.
 */
export async function getFeaturedRepo(
  username: string,
  accessToken?: string
): Promise<{
  name: string;
  description: string | null;
  language: string | null;
} | null> {
  try {
    const octokit = await createOctokit(accessToken);
    const { data } = await octokit.repos.listForUser({
      username,
      type: "owner",
      sort: "updated",
      direction: "desc",
      per_page: 10,
    });
    const pick = data.find(
      (r) =>
        r?.name &&
        !r.fork &&
        !/\.github\.io$/i.test(r.name) &&
        r.name.toLowerCase() !== username.toLowerCase()
    );
    if (!pick?.name) return null;
    const description = String(pick.description || "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 120);
    return {
      name: pick.name,
      description: description || null,
      language: pick.language || null,
    };
  } catch {
    return null;
  }
}

/** @deprecated Prefer getFeaturedRepo — kept for callers that only need the name. */
export async function getFeaturedRepoName(
  username: string,
  accessToken?: string
): Promise<string | null> {
  const repo = await getFeaturedRepo(username, accessToken);
  return repo?.name || null;
}

export async function getUserEmails(accessToken: string) {
  const octokit = await createOctokit(accessToken);

  const response = await octokit.rest.users.listEmailsForAuthenticatedUser({
    headers: {
      accept: "application/vnd.github+json",
    },
  });

  return response.data;
}

export async function checkFollowing(username: string, accessToken: string) {
  const octokit = await createOctokit(accessToken);

  try {
    await octokit.users.listFollowingForUser({
      username,
    });
    return true;
  } catch {
    return false;
  }
}

export { tokenManager };
