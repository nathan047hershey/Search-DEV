/**
 * GitHub search query helpers for developer discovery.
 */

/** Collapse whitespace; keep user-facing text readable. */
export function normalizeSearchText(value: string): string {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Username-style form: "john kevin" → "johnkevin" */
export function compactSearchText(value: string): string {
  return normalizeSearchText(value).replace(/\s+/g, "");
}

export function quoteIfNeeded(value: string): string {
  const v = normalizeSearchText(value);
  if (!v) return v;
  if (/\s/.test(v) || /[:+]/.test(v)) {
    return `"${v.replace(/"/g, "")}"`;
  }
  return v;
}

/** YYYY-MM-DD for GitHub created:/pushed: qualifiers */
export function daysAgoDate(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - Math.max(1, days));
  return d.toISOString().slice(0, 10);
}

export type SearchScope = "all" | "login" | "fullname" | "email";

/**
 * Build a user keyword clause so "john kevin" and "johnkevin" both hit.
 * GitHub AND-splits spaces; without this, spaced vs compact queries diverge.
 */
export function buildKeywordClause(
  rawQ: string,
  scope: SearchScope = "all"
): string {
  const raw = normalizeSearchText(rawQ);
  if (!raw) return "";

  const compact = compactSearchText(raw);
  const scopeSuffix =
    scope === "login"
      ? " in:login"
      : scope === "fullname"
        ? " in:fullname"
        : scope === "email"
          ? " in:email"
          : "";

  if (raw.includes(" ") && compact.length > 1 && compact !== raw) {
    // Match compact login-style OR exact phrase OR token AND (GitHub default)
    const parts = [
      `${compact}${scopeSuffix}`,
      `"${raw.replace(/"/g, "")}"${scopeSuffix}`,
    ];
    return `(${parts.join(" OR ")})`;
  }

  return `${raw}${scopeSuffix}`;
}

export function buildUserSearchQuery(opts: {
  q?: string;
  scope?: SearchScope;
  languages?: string[];
  location?: string;
  minFollowers?: string;
  maxFollowers?: string;
  minRepos?: string;
  company?: string;
  hireable?: boolean;
  blog?: string;
  bio?: string;
  skills?: string[];
  createdWithinDays?: string;
}): string {
  const parts: string[] = [];
  const kw = buildKeywordClause(opts.q || "", opts.scope || "all");
  if (kw) parts.push(kw);

  const langs = (opts.languages || []).filter(Boolean);
  if (langs.length === 1) {
    parts.push(`language:${quoteIfNeeded(langs[0])}`);
  } else if (langs.length > 1) {
    parts.push(
      `(${langs.map((l) => `language:${quoteIfNeeded(l)}`).join(" OR ")})`
    );
  }

  if (opts.location) parts.push(`location:${quoteIfNeeded(opts.location)}`);
  if (opts.minFollowers) parts.push(`followers:>=${opts.minFollowers}`);
  if (opts.maxFollowers) parts.push(`followers:<=${opts.maxFollowers}`);
  if (opts.minRepos) {
    const n = parseInt(opts.minRepos, 10);
    if (!Number.isNaN(n) && n > 0) parts.push(`repos:>=${n}`);
  }
  if (opts.company) parts.push(`company:${quoteIfNeeded(opts.company)}`);
  if (opts.hireable) parts.push("hireable:true");
  if (opts.blog) parts.push(`blog:${quoteIfNeeded(opts.blog)}`);
  if (opts.bio) parts.push(`bio:${quoteIfNeeded(opts.bio)}`);
  for (const skill of opts.skills || []) {
    const s = skill.trim();
    if (s) parts.push(`topic:${quoteIfNeeded(s)}`);
  }
  if (opts.createdWithinDays) {
    const days = parseInt(opts.createdWithinDays, 10);
    if (!Number.isNaN(days) && days > 0) {
      parts.push(`created:>=${daysAgoDate(days)}`);
    }
  }

  return parts.join(" ").trim();
}

/** Repository search → owners of matching / recently pushed repos. */
export function buildRepoSearchQuery(opts: {
  repoName?: string;
  languages?: string[];
  pushedWithinDays?: string;
  minStars?: string;
}): string {
  const parts: string[] = [];
  const name = normalizeSearchText(opts.repoName || "");
  if (name) {
    const compact = compactSearchText(name);
    if (name.includes(" ") && compact !== name) {
      parts.push(`(${compact} OR "${name.replace(/"/g, "")}")`);
    } else {
      parts.push(quoteIfNeeded(name));
    }
    parts.push("in:name");
  }

  const langs = (opts.languages || []).filter(Boolean);
  if (langs.length === 1) {
    parts.push(`language:${quoteIfNeeded(langs[0])}`);
  } else if (langs.length > 1) {
    parts.push(
      `(${langs.map((l) => `language:${quoteIfNeeded(l)}`).join(" OR ")})`
    );
  }

  if (opts.pushedWithinDays) {
    const days = parseInt(opts.pushedWithinDays, 10);
    if (!Number.isNaN(days) && days > 0) {
      parts.push(`pushed:>=${daysAgoDate(days)}`);
    }
  }

  if (opts.minStars) {
    const n = parseInt(opts.minStars, 10);
    if (!Number.isNaN(n) && n > 0) parts.push(`stars:>=${n}`);
  }

  // Forks clutter owner discovery
  parts.push("fork:false");

  return parts.join(" ").trim() || "fork:false";
}
