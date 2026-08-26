import { Octokit } from "@octokit/rest";

// Token rotation manager
interface TokenStatus {
  token: string;
  remaining: number;
  resetTime: number;
  isAuthenticated: boolean;
}

class TokenManager {
  private tokens: string[] = [];
  private tokenStatuses: Map<string, TokenStatus> = new Map();
  private currentTokenIndex = 0;

  constructor() {
    this.initializeTokens();
  }

  private initializeTokens() {
    const tokenEnv = process.env.GITHUB_TOKEN || "";
    this.tokens = tokenEnv.split(",").map(t => t.trim()).filter(t => t.length > 0);
    if (this.tokens.length === 0) {
      console.warn("No GitHub tokens configured. Set GITHUB_TOKEN in .env.local");
    }
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
      if (status.resetTime <= now) {
        status.remaining = 5000;
        this.currentTokenIndex = (this.currentTokenIndex + i) % this.tokens.length;
        return token;
      }
    }
    return this.tokens[0];
  }

  updateTokenStatus(token: string, remaining: number, resetTime: number, isAuthenticated: boolean) {
    this.tokenStatuses.set(token, { token, remaining, resetTime, isAuthenticated });
  }

  getStatus(): { available: number; total: number } {
    const now = Date.now() / 1000;
    let available = 0;
    for (const token of this.tokens) {
      const status = this.tokenStatuses.get(token);
      if (!status || status.resetTime <= now) available++;
    }
    return { available, total: this.tokens.length };
  }
}

const tokenManager = new TokenManager();

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

export async function createOctokit(accessToken?: string) {
  const token = accessToken || tokenManager.getAvailableToken();
  return new Octokit({ auth: token });
}

export async function searchUsers(
  params: GitHubSearchParams,
  accessToken?: string
) {
  const octokit = await createOctokit(accessToken);
  const token = accessToken || tokenManager.getAvailableToken();

  // NOTE: The full query is built by the caller (route.ts) and passed as params.q.
  // Do NOT add language:/location:/followers:> qualifiers here to avoid duplicates.
  const response = await octokit.search.users({
    q: params.q,
    sort: params.sort || "followers",
    order: params.order || "desc",
    per_page: params.per_page || 30,
    page: params.page || 1,
  });

  if (token) {
    const remaining = response.headers["x-ratelimit-remaining"]
      ? parseInt(response.headers["x-ratelimit-remaining"] as string) : 5000;
    const reset = response.headers["x-ratelimit-reset"]
      ? parseInt(response.headers["x-ratelimit-reset"] as string) : 0;
    tokenManager.updateTokenStatus(token, remaining, reset, !!accessToken);
  }

  return response.data;
}

export async function getUser(
  username: string,
  accessToken?: string
): Promise<GitHubUser> {
  const octokit = await createOctokit(accessToken);
  const token = accessToken || tokenManager.getAvailableToken();

  try {
    const { data } = await octokit.users.getByUsername({ username });
    return {
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
  } catch (error: any) {
    if (token && error?.headers) {
      const remaining = error.headers["x-ratelimit-remaining"]
        ? parseInt(error.headers["x-ratelimit-remaining"]) : 0;
      const reset = error.headers["x-ratelimit-reset"]
        ? parseInt(error.headers["x-ratelimit-reset"]) : 0;
      tokenManager.updateTokenStatus(token, remaining, reset, !!accessToken);
    }
    throw error;
  }
}

export async function getUserEmails(accessToken: string) {
  const octokit = await createOctokit(accessToken);
  const response = await octokit.rest.users.listEmailsForAuthenticatedUser({
    headers: { accept: "application/vnd.github+json" },
  });
  return response.data;
}

export async function checkFollowing(username: string, accessToken: string) {
  const octokit = await createOctokit(accessToken);
  try {
    await octokit.users.listFollowingForUser({ username });
    return true;
  } catch {
    return false;
  }
}

export { tokenManager };
