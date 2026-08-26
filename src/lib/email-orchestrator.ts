/**
 * Multi-strategy Email Orchestrator
 *
 * Tries each strategy in priority order and returns the first successful result.
 * Each strategy is wrapped in try/catch so one failure does not break the others.
 *
 * Priority order (free / no API key required):
 *   1. GitHub public profile email
 *   2. Blog URL regex (email directly in blog string)
 *   3. GitHub commit patches (.patch URLs)
 *   4. Scrape developer's blog/website
 *   5. Scrape company website (/about, /contact, /team, /careers)
 *   6. LinkedIn pattern guessing (name + company domain)
 *   7. Hunter.io (only if HUNTER_API_KEY env is set)
 *   8. AI inference (only if MINIMAX_API_KEY env is set)
 */

import { findEmailFromCommits } from "./commit-email-finder";
import { searchCompanyForEmail } from "./company-email-finder";
import { parseBioForContacts } from "./email-finder";
import { findEmailFromLinkedIn } from "./linkedin-email-finder";
import { findEmailWithHunter } from "./hunter-email-finder";
import { findEmailWithAI } from "./minimax-email-finder";
import { scrapeWebsiteForEmails } from "./email-scraper";

export type EmailSource =
  | "github_public"
  | "blog_regex"
  | "github_commits"
  | "blog_scrape"
  | "company_website"
  | "linkedin_pattern"
  | "hunter_io"
  | "ai_inference"
  | "oauth"
  | "not_found";

export interface OrchestratorInput {
  login: string;
  name: string | null;
  bio: string | null;
  company: string | null;
  location: string | null;
  blog: string;
  publicEmail: string | null;
  accessToken?: string;
}

export interface EmailStrategyResult {
  email: string;
  source: EmailSource;
  sourceLabel: string;
  confidence: "high" | "medium" | "low";
}

export interface OrchestratorResult {
  email: string | null;
  source: EmailSource;
  sourceLabel: string;
  confidence: "high" | "medium" | "low";
  strategiesTried: EmailSource[];
  resumeUrls: string[];
  portfolioUrls: string[];
  contactLinks: ReturnType<typeof parseBioForContacts>;
}

// ---------- Resume & Portfolio Discovery ----------

const RESUME_DOMAINS = [
  "flowcv.com",
  "resume.io",
  "rxresu.me",
  "novoresume.com",
  "canva.com",
  "cv-maker.io",
  "resumebuilder.com",
  "enhancv.com",
  "visualcv.com",
  "kickresume.com",
  "standardresume.co",
  "rezi.ai",
  "/resume",
  "/cv",
  "/cv.pdf",
  "/resume.pdf",
];

const PORTFOLIO_DOMAINS = [
  "about.me",
  "notion.site",
  "behance.net",
  "dribbble.com",
  "linkedin.com",
  "medium.com",
  "dev.to",
  "hashnode.dev",
  "substack.com",
  "wordpress.com",
  "wixsite.com",
  "weebly.com",
  "webflow.io",
  "netlify.app",
  "vercel.app",
  "render.com",
  "railway.app",
  "github.io",
  "gitlab.io",
  "pages.dev",
  "000webhostapp.com",
  "godaddysites.com",
  "carrd.co",
  "linktr.ee",
  "bio.link",
  "taplink.cc",
  "/portfolio",
];

const GENERIC_EMAIL_PATTERNS = [
  "noreply",
  "no-reply",
  "donotreply",
  "support@",
  "info@",
  "hello@",
  "contact@",
  "admin@",
  "example.com",
  "test.com",
  "yourdomain",
  "youremail",
];

/**
 * Detect resume URLs from a list of URLs (blog, bio links, etc.)
 */
export function detectResumeUrls(urls: (string | null | undefined)[]): string[] {
  const found: string[] = [];
  for (const raw of urls) {
    if (!raw) continue;
    const lower = raw.toLowerCase();
    if (RESUME_DOMAINS.some((d) => lower.includes(d.toLowerCase()))) {
      found.push(raw);
    }
  }
  return Array.from(new Set(found));
}

/**
 * Detect portfolio URLs (separate from resume URLs).
 */
export function detectPortfolioUrls(urls: (string | null | undefined)[]): string[] {
  const found: string[] = [];
  for (const raw of urls) {
    if (!raw) continue;
    const lower = raw.toLowerCase();
    if (
      !RESUME_DOMAINS.some((d) => lower.includes(d.toLowerCase())) &&
      PORTFOLIO_DOMAINS.some((d) => lower.includes(d.toLowerCase()))
    ) {
      found.push(raw);
    }
  }
  return Array.from(new Set(found));
}

/**
 * Filter out generic / placeholder emails
 */
export function isPersonalLookingEmail(email: string): boolean {
  if (!email) return false;
  const lower = email.toLowerCase();
  if (GENERIC_EMAIL_PATTERNS.some((p) => lower.includes(p))) return false;
  const local = lower.split("@")[0];
  if (["example", "test", "user", "username", "yourname", "email"].includes(local)) {
    return false;
  }
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Try one strategy with a timeout-safe wrapper.
 */
async function tryStrategy(
  name: EmailSource,
  fn: () => Promise<EmailStrategyResult | null>,
  strategiesTried: EmailSource[]
): Promise<EmailStrategyResult | null> {
  try {
    const t0 = Date.now();
    const result = await Promise.race([
      fn(),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 8000)),
    ]);
    const elapsed = Date.now() - t0;
    strategiesTried.push(name);
    if (result && result.email && isPersonalLookingEmail(result.email)) {
      console.log(`[email-orchestrator] hit ${name} -> ${result.email} (${elapsed}ms)`);
      return result;
    }
    return null;
  } catch (err) {
    strategiesTried.push(name);
    console.warn(
      `[email-orchestrator] ${name} failed:`,
      err instanceof Error ? err.message : err
    );
    return null;
  }
}

/**
 * Main orchestrator entry point.
 * Tries strategies in priority order and returns the first successful match.
 */
export async function findEmailForDeveloper(
  input: OrchestratorInput
): Promise<OrchestratorResult> {
  const strategiesTried: EmailSource[] = [];

  // Gather candidate URLs from bio + blog for resume/portfolio detection
  const candidateUrls: (string | null | undefined)[] = [input.blog];
  const bioLinks = parseBioForContacts(input.bio);
  for (const l of bioLinks) candidateUrls.push(l.url);

  const resumeUrls = detectResumeUrls(candidateUrls);
  const portfolioUrls = detectPortfolioUrls(candidateUrls);

  // Strategy 1: GitHub public profile email
  if (input.publicEmail && isPersonalLookingEmail(input.publicEmail)) {
    return {
      email: input.publicEmail,
      source: "github_public",
      sourceLabel: "GitHub public profile",
      confidence: "high",
      strategiesTried: ["github_public"],
      resumeUrls,
      portfolioUrls,
      contactLinks: bioLinks,
    };
  }

  // Strategy 2: Email directly in blog string
  if (input.blog) {
    const m = input.blog.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    if (m && isPersonalLookingEmail(m[0])) {
      return {
        email: m[0],
        source: "blog_regex",
        sourceLabel: "Email in blog URL",
        confidence: "high",
        strategiesTried: ["blog_regex"],
        resumeUrls,
        portfolioUrls,
        contactLinks: bioLinks,
      };
    }
  }

  // Strategy 3: GitHub commit patches
  const commitResult = await tryStrategy(
    "github_commits",
    async () => {
      const r = await findEmailFromCommits(input.login, input.accessToken);
      if (!r) return null;
      return {
        email: r.email,
        source: "github_commits" as EmailSource,
        sourceLabel: r.source,
        confidence: r.confidence,
      };
    },
    strategiesTried
  );
  if (commitResult) {
    return { ...commitResult, strategiesTried, resumeUrls, portfolioUrls, contactLinks: bioLinks };
  }

  // Strategy 4: Scrape blog/website
  if (input.blog) {
    const scrapeResult = await tryStrategy(
      "blog_scrape",
      async () => {
        const r = await scrapeWebsiteForEmails(input.blog);
        if (!r) return null;
        return {
          email: r.email,
          source: "blog_scrape" as EmailSource,
          sourceLabel: r.source,
          confidence: r.confidence,
        };
      },
      strategiesTried
    );
    if (scrapeResult) {
      return { ...scrapeResult, strategiesTried, resumeUrls, portfolioUrls, contactLinks: bioLinks };
    }
  }

  // Strategy 5: Company website crawl
  if (input.company) {
    const companyResult = await tryStrategy(
      "company_website",
      async () => {
        const r = await searchCompanyForEmail(input.company!, input.name, input.login);
        if (!r) return null;
        return {
          email: r.email,
          source: "company_website" as EmailSource,
          sourceLabel: r.source,
          confidence: r.confidence,
        };
      },
      strategiesTried
    );
    if (companyResult) {
      return { ...companyResult, strategiesTried, resumeUrls, portfolioUrls, contactLinks: bioLinks };
    }
  }

  // Strategy 6: LinkedIn-style pattern guess
  if (input.name || input.company) {
    const linkedinResult = await tryStrategy(
      "linkedin_pattern",
      async () => {
        const r = await findEmailFromLinkedIn(input.name, input.login, input.company);
        if (!r || !r.email) return null;
        return {
          email: r.email,
          source: "linkedin_pattern" as EmailSource,
          sourceLabel: r.source || "LinkedIn pattern",
          confidence: (r.confidence as "high" | "medium" | "low") || "medium",
        };
      },
      strategiesTried
    );
    if (linkedinResult) {
      return { ...linkedinResult, strategiesTried, resumeUrls, portfolioUrls, contactLinks: bioLinks };
    }
  }

  // Strategy 7: Hunter.io (optional - requires env var)
  if (process.env.HUNTER_API_KEY && input.name && input.company) {
    const nameParts = input.name.split(/\s+/);
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(" ") || input.login;
    const hunterResult = await tryStrategy(
      "hunter_io",
      async () => {
        const r = await findEmailWithHunter(firstName, lastName, `${input.company}.com`);
        if (!r || !r.email) return null;
        return {
          email: r.email,
          source: "hunter_io" as EmailSource,
          sourceLabel: "Hunter.io",
          confidence:
            r.confidence >= 80 ? "high" : r.confidence >= 50 ? "medium" : "low",
        };
      },
      strategiesTried
    );
    if (hunterResult) {
      return { ...hunterResult, strategiesTried, resumeUrls, portfolioUrls, contactLinks: bioLinks };
    }
  }

  // Strategy 8: AI inference (optional - requires env var)
  if (process.env.MINIMAX_API_KEY) {
    const aiResult = await tryStrategy(
      "ai_inference",
      async () => {
        const email = await findEmailWithAI(
          input.login,
          input.name,
          input.bio,
          input.company,
          input.location,
          input.blog,
          []
        );
        if (!email) return null;
        return {
          email,
          source: "ai_inference" as EmailSource,
          sourceLabel: "AI inference",
          confidence: "low" as const,
        };
      },
      strategiesTried
    );
    if (aiResult) {
      return { ...aiResult, strategiesTried, resumeUrls, portfolioUrls, contactLinks: bioLinks };
    }
  }

  // Nothing worked
  return {
    email: null,
    source: "not_found",
    sourceLabel: "No email found",
    confidence: "low",
    strategiesTried,
    resumeUrls,
    portfolioUrls,
    contactLinks: bioLinks,
  };
}
