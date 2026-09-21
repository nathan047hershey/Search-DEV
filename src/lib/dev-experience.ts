import { prettyTechLabel, sameTech } from "./tech-labels";

export type ExperienceBand = "junior" | "mid" | "senior" | "staff";

export interface ExperienceEstimate {
  years: number;
  band: ExperienceBand;
  /** e.g. "~5 years" — conservative outreach estimate */
  label: string;
  /** Fixed role requirement for the band, e.g. "4–6 years" */
  requiredYearsText: string;
  /** Profile signals without over-claiming career years */
  summary: string;
  sources: string[];
}

function yearsSince(iso?: string | null): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return null;
  const years = (Date.now() - t) / (365.25 * 24 * 60 * 60 * 1000);
  if (!Number.isFinite(years) || years < 0) return null;
  return years;
}

/** Role seniority from estimate — never auto-promote to Staff from GitHub age alone. */
function bandForYears(years: number, bio?: string | null): ExperienceBand {
  if (years < 2) return "junior";
  if (years < 4.5) return "mid";
  const seniorPlus =
    years >= 9 &&
    /\b(staff|principal|distinguished|engineering manager|head of)\b/i.test(
      String(bio || "")
    );
  if (seniorPlus) return "staff";
  return "senior";
}

/** Standard hiring bands — do NOT mirror the developer's estimated years. */
function requiredYearsForBand(band: ExperienceBand): string {
  if (band === "junior") return "1–2 years";
  if (band === "mid") return "2–4 years";
  if (band === "senior") return "4–6 years";
  return "7+ years";
}

/** Parse explicit "N years" claims from bios when present. */
export function yearsFromBio(bio?: string | null): number | null {
  if (!bio) return null;
  const m = bio.match(
    /\b(\d{1,2})\+?\s*\+?\s*(?:years?|yrs?)\b(?:\s+(?:of\s+)?(?:experience|exp))?/i
  );
  if (!m) return null;
  const n = parseInt(m[1], 10);
  if (!Number.isFinite(n) || n < 1 || n > 40) return null;
  return n;
}

/**
 * Conservative experience estimate for outreach.
 * GitHub account age ≠ years of professional experience.
 */
export function estimateExperienceFromGithub(input: {
  created_at?: string | null;
  earliest_repo_at?: string | null;
  public_repos?: number | null;
  followers?: number | null;
  language?: string | null;
  bio?: string | null;
}): ExperienceEstimate {
  const sources: string[] = [];
  const accountYears = yearsSince(input.created_at);
  const repoYears = yearsSince(input.earliest_repo_at);
  const bioYears = yearsFromBio(input.bio);

  const repos = Math.max(0, Number(input.public_repos) || 0);
  const followers = Math.max(0, Number(input.followers) || 0);

  // Discount calendar age heavily — old accounts often include school/hobby years
  let activity =
    repoYears != null
      ? repoYears * 0.55
      : accountYears != null
        ? accountYears * 0.45
        : 3;

  if (repoYears != null) sources.push("earliest public repository");
  if (accountYears != null) sources.push("GitHub account age");

  if (bioYears != null && bioYears <= 15) {
    activity = activity * 0.35 + Math.min(bioYears, 10) * 0.65;
    sources.push("years mentioned in bio");
  }

  const repoBoost = Math.min(1.2, repos / 60);
  const followerBoost = Math.min(0.8, followers / 1000);
  if (repos >= 15) sources.push(`${repos} public repos`);
  if (followers >= 100) sources.push(`${followers} followers`);

  let years = activity + repoBoost * 0.4 + followerBoost * 0.25;

  // Hard cap for cold outreach — never claim 15–20 year careers from GitHub alone
  years = Math.max(1, Math.min(10, years));
  if (accountYears != null) {
    years = Math.min(years, Math.max(1, accountYears * 0.65));
  }

  const rounded = Math.max(1, Math.round(years));
  const band = bandForYears(rounded, input.bio);
  const requiredYearsText = requiredYearsForBand(band);
  const accountYear = input.created_at
    ? new Date(input.created_at).getFullYear()
    : null;

  const summaryParts = [
    accountYear ? `GitHub since ${accountYear}` : null,
    repos > 0 ? `${repos} public repos` : null,
    input.language ? String(input.language) : null,
    `level: ${band}`,
  ].filter(Boolean);

  return {
    years: rounded,
    band,
    label: `~${rounded} years`,
    requiredYearsText,
    summary: summaryParts.join(" · "),
    sources: sources.length ? sources : ["GitHub activity"],
  };
}

/** Soften/raise role title seniority to match estimated band. */
export function adjustRoleTitleForExperience(
  roleTitle: string,
  band: ExperienceBand
): string {
  const title = String(roleTitle || "").trim();
  if (!title) return title;

  if (band === "junior") {
    return title
      .replace(/^Staff\s+/i, "")
      .replace(/^Principal\s+/i, "")
      .replace(/^Senior\s+/i, "Junior ");
  }
  if (band === "mid") {
    return title
      .replace(/^Staff\s+/i, "")
      .replace(/^Principal\s+/i, "")
      .replace(/^Senior\s+/i, "")
      .replace(/^Junior\s+/i, "");
  }
  if (band === "staff") {
    if (/^(Staff|Principal)\s+/i.test(title)) return title;
    if (/^Senior\s+/i.test(title)) {
      return title.replace(/^Senior\s+/i, "Staff ");
    }
    return `Staff ${title}`;
  }
  // senior — default ceiling for GitHub-based outreach
  if (/^(Senior|Staff|Principal)\s+/i.test(title)) {
    return title.replace(/^(Staff|Principal)\s+/i, "Senior ");
  }
  if (/^Junior\s+/i.test(title)) {
    return title.replace(/^Junior\s+/i, "Senior ");
  }
  return `Senior ${title}`;
}

/**
 * One polished fit line for openings — professional recruiter voice.
 * Varies phrasing so every email does not reuse the same "aligns well" line.
 */
export function roleMatchSentence(input: {
  roleTitle: string;
  trackLabel: string;
  experience: ExperienceEstimate;
  language?: string | null;
  company?: string | null;
}): string {
  const company = String(input.company || "")
    .replace(/^@/, "")
    .trim();
  const language = prettyTechLabel(String(input.language || "").trim());
  const track = input.trackLabel;
  const seed = `${company}|${language}|${input.roleTitle}`;
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h + seed.charCodeAt(i) * (i + 3)) % 97;

  const signal = company
    ? language && !sameTech(language, track)
      ? `your ${language} work at ${company}`
      : `your work at ${company}`
    : language
      ? sameTech(language, track)
        ? `your ${track} background`
        : `your ${language} background`
      : `your ${track} background`;

  const variants = [
    `${signal.charAt(0).toUpperCase()}${signal.slice(1)} lined up with what we're hiring for.`,
    `I noticed ${signal}, which is close to what this search needs.`,
    `Based on ${signal}, this felt worth a careful note.`,
    `${signal.charAt(0).toUpperCase()}${signal.slice(1)} looks relevant to the opening.`,
  ];
  return variants[h % variants.length];
}

export function experienceRequirementBullet(
  trackLabel: string,
  experience: ExperienceEstimate
): string {
  return `${experience.requiredYearsText} of relevant ${trackLabel} experience`;
}
