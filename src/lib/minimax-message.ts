// Personalized hire outreach: match email content to each developer's track
// and stack (React, Node, Python, Go, mobile, ML, DevOps, etc.).

import fs from "fs";
import path from "path";
import {
  TRACK_PACKS,
  MESSAGE_STYLES,
  styleOpeningHint,
  isCompactStyle,
  isFollowupStyle,
  type DevTrack,
  type MessageStyle,
  type TrackPack,
} from "./message-packs";
import { sanitizeSubject } from "./email-validate";
import { extractFirstName, normalizeGreeting } from "./greeting";
import {
  adjustRoleTitleForExperience,
  estimateExperienceFromGithub,
  experienceRequirementBullet,
  roleMatchSentence,
  type ExperienceEstimate,
} from "./dev-experience";
import { getEarliestRepoCreatedAt, getFeaturedRepo, getUser } from "./github";
import { getMinimaxApiKey, minimaxChatCompletion, extractJsonObject } from "./minimax-client";
import { prettyTechLabel, sameTech } from "./tech-labels";
import {
  type EmailLayoutId,
  htmlBulletsToLines,
  htmlTechToLines,
  isEmailLayoutId,
  layoutLabel,
  pickEmailLayout,
  resolveContentType,
  isActiveContentType,
  renderLayoutBody,
  renderOutlookDocument,
} from "./email-layouts";
import {
  assessMessageQuality,
  htmlToPlainApprox,
  type MessageQualityReport,
} from "./message-quality";
import { getLastSendForDeveloper, getSendsForDeveloper } from "./sent-history";
import {
  COMPANY,
  PROFESSIONAL_TEMPLATE_IDS,
  SHORT_FRIENDLY_TEMPLATE_IDS,
  enrichWhyUs,
  pickCta,
  pickFollowupCta,
  pickFollowupSubject,
  pickOfferBullets,
  pickPersonalizedSubject,
} from "./company-voice";

export type { DevTrack, MessageStyle, EmailLayoutId };

export interface DeveloperContext {
  login: string;
  name?: string | null;
  bio?: string | null;
  company?: string | null;
  location?: string | null;
  blog?: string | null;
  email?: string | null;
  followers?: number;
  public_repos?: number;
  language?: string | null;
  html_url?: string | null;
  created_at?: string | null;
  earliest_repo_at?: string | null;
  /** Recent public repo used as a personalization hook */
  featured_repo?: string | null;
  featured_repo_description?: string | null;
  featured_repo_language?: string | null;
}

export interface GenerateOptions {
  templateId?: string;
  track?: DevTrack;
  style?: MessageStyle;
}

export interface GeneratedMessage {
  subject: string;
  body: string;
  matchNotes?: string;
  greeting?: string;
  opening?: string;
  track?: DevTrack;
  style?: MessageStyle;
  templateId?: string;
  templateName?: string;
  roleTitle?: string;
  roleBlurb?: string;
  responsibilities?: string[];
  techFocus?: string[];
  lookingFor?: string[];
  offer?: string[];
  responsibilitiesHtml?: string;
  techStackHtml?: string;
  lookingForHtml?: string;
  offerHtml?: string;
  whyUs?: string;
  closingLine?: string;
  processNote?: string;
  companyNote?: string;
  trackLabel?: string;
  styleLabel?: string;
  experienceYears?: number;
  experienceLabel?: string;
  experienceBand?: string;
  requiredYearsText?: string;
  /** How the greeting/opening was produced */
  generatedBy?: "minimax" | "template";
  aiModel?: string;
  /** Structural body shape (classic / letter / brief / …) */
  layoutId?: EmailLayoutId;
  layoutLabel?: string;
  quality?: MessageQualityReport;
  priorSendAt?: string | null;
}

interface HireTemplate {
  id: string;
  name: string;
  description?: string;
  subject: string;
  bodyHtml: string;
  /** Preferred content layout when this chrome is selected */
  contentLayout?: EmailLayoutId;
}

interface Personalization {
  subject?: string;
  greeting: string;
  opening: string;
  matchNotes?: string;
  track: DevTrack;
  style: MessageStyle;
  roleTitle: string;
  roleBlurb: string;
  responsibilities: string[];
  techFocus: string[];
  lookingFor: string[];
  offer: string[];
  responsibilitiesHtml: string;
  techStackHtml: string;
  lookingForHtml: string;
  offerHtml: string;
  whyUs: string;
  /** Closing CTA paragraph */
  closingLine?: string;
  processNote?: string;
  companyNote?: string;
  trackLabel: string;
  styleLabel: string;
  layoutId: EmailLayoutId;
  layoutSeed: string;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatOpeningHtml(opening: string): string {
  const escaped = escapeHtml(opening.trim());
  return escaped
    .replace(
      /\bPivotalStacks\b/g,
      '<a href="https://pivotalstacks.com" style="color: #0f766e; text-decoration: none; font-weight: 600;">PivotalStacks</a>'
    )
    .replace(
      /\bSenior [A-Za-z0-9.+# /|-]+ (Developer|Engineer)\b/g,
      "<strong>$&</strong>"
    );
}

/** Drop forced slate/black text colors so dark shells can inherit light text. */
function inheritShellTextColor(html: string): string {
  return String(html || "")
    .replace(
      /\s*color\s*:\s*#(?:0f172a|111827|1f2937|1e293b|334155|374151|3f3f46|292524|222222|000000|222|111|000)\b\s*;?/gi,
      ""
    )
    .replace(/\sstyle="\s*"/gi, "")
    .replace(/\sstyle='\s*'/gi, "");
}

function linesToStackHtml(lines: string[]): string {
  return lines
    .map(
      (line, i) =>
        `<p style="margin:${i === lines.length - 1 ? "0" : "0 0 8px"};font-size:14px;">${line}</p>`
    )
    .join("");
}

function formatTechFocusLines(lines: string[]): string {
  return linesToStackHtml(
    lines
      .map((raw) => {
        const line = String(raw || "").trim();
        if (!line) return "";
        // Already HTML from pack templates
        if (/<\/?[a-z]/i.test(line)) return line;
        const m = line.match(/^([^:]{2,48}):\s*(.+)$/);
        if (m) {
          return `<strong>${escapeHtml(m[1])}:</strong> ${escapeHtml(m[2])}`;
        }
        return escapeHtml(line);
      })
      .filter(Boolean)
  );
}

function sanitizePlainBullets(
  value: unknown,
  fallback: string[],
  opts?: { min?: number; max?: number }
): string[] {
  const min = opts?.min ?? 3;
  const max = opts?.max ?? 6;
  if (!Array.isArray(value)) return fallback;
  const cleaned = value
    .map((item) =>
      stripAiSlop(String(item || ""))
        .replace(/\s+/g, " ")
        .trim()
    )
    .filter((item) => item.length >= 8 && item.length <= 140)
    .filter((item) => !looksLikeAiSlop(item))
    .slice(0, max);
  return cleaned.length >= min ? cleaned : fallback;
}

function looksLikeAiSlop(text: string): boolean {
  return /\b(exciting|passionate|cutting[- ]edge|leverage|synergy|delve|robust solution|game[- ]changer|unlock|empower|thrilled|delighted to|stands? out|came across|strong fit|perfect fit|ideal candidate|clear overview)\b/i.test(
    text
  );
}

/** Remove marketing / LLM filler from recruiter copy. Keep natural contractions. */
export function stripAiSlop(text: string): string {
  return String(text || "")
    .replace(/\u2014|\u2013|—|–|‑/g, " - ")
    .replace(/\b(exciting|thrilling|amazing|incredible|passionate)\b/gi, "")
    .replace(/\bcutting[- ]edge\b/gi, "modern")
    .replace(/\bleverage\b/gi, "use")
    .replace(/\bdelve into\b/gi, "review")
    .replace(/\brobust solutions?\b/gi, "reliable systems")
    .replace(/\bgame[- ]changer\b/gi, "useful change")
    .replace(/\bempower(?:s|ed|ing)?\b/gi, "support")
    .replace(/\bunlock(?:s|ed|ing)?\b/gi, "enable")
    .replace(/\bwe believe you would be a strong fit\b/gi, "this looked like a relevant match")
    .replace(/\bstrong fit\b/gi, "relevant match")
    .replace(/\bperfect fit\b/gi, "relevant match")
    .replace(/\bideal candidate\b/gi, "suitable profile")
    .replace(/\byour profile stood out\b/gi, "your background looks relevant")
    .replace(/\bI came across your\b/gi, "I reviewed your")
    .replace(/\bshipping culture over ceremony\b/gi, "practical delivery")
    .replace(/\bcloud-native\b/gi, "")
    .replace(/\bPivotalStacks is hiring an?\s+/gi, "We're hiring a ")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+,/g, ",")
    .replace(/,\s*,+/g, ",")
    .replace(/\s+\./g, ".")
    .replace(/\s+-\s+/g, " - ")
    .trim();
}

function sanitizeRoleBlurbHtml(value: unknown, fallback: string): string {
  let text = stripAiSlop(
    String(value || "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
  );
  if (text.length < 40 || text.length > 320 || looksLikeAiSlop(text)) {
    return fallback;
  }
  // Prefer natural openings; only rewrite obvious company-hiring templates
  if (/^PivotalStacks is hiring/i.test(text)) {
    text = text.replace(/^PivotalStacks is hiring an?\s+/i, "We're hiring a ");
  }
  // Fix mangled "This {role} role we need/we're..." leftovers
  text = text
    .replace(
      /^This\s+.+?\s+role\s+(?=(?:we need|we're|we are|looking for)\b)/i,
      ""
    )
    .replace(/\s{2,}/g, " ")
    .trim();
  return escapeHtml(text).replace(
    /\b((?:Junior|Mid|Senior|Staff)\s+)?([A-Za-z0-9.+# /|-]+ (?:Developer|Engineer))\b/g,
    "<strong>$&</strong>"
  );
}

function bulletsToHtml(items: string[]): string {
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0;">${items
    .map(
      (item) =>
        `<tr><td style="padding:0 0 8px;font-size:14px;">• ${escapeHtml(item)}</td></tr>`
    )
    .join("")}</table>`;
}

function profileText(dev: DeveloperContext): string {
  return [dev.language, dev.bio, dev.blog, dev.company, dev.login]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

/** Word-boundary check so "rust" does not match inside unrelated words. */
function textHasHint(text: string, hint: string): boolean {
  const h = hint.toLowerCase().trim();
  if (!h) return false;
  if (h.length <= 2) {
    return new RegExp(`(?:^|[^a-z0-9])${escapeRegExp(h)}(?:[^a-z0-9]|$)`, "i").test(
      text
    );
  }
  return new RegExp(`\\b${escapeRegExp(h)}\\b`, "i").test(text);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function looksLikeNameBanner(bio: string, dev: DeveloperContext): boolean {
  const value = bio.trim();
  if (!value) return true;
  if ((value.match(/\|/g) || []).length >= 1) return true;
  if (/\([^)]{2,40}\)/.test(value) && /\|/.test(value)) return true;
  const name = String(dev.name || "")
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .trim();
  if (name && value.toLowerCase().startsWith(name.split(/\s+/)[0] || "___")) {
    return true;
  }
  // Mostly Title Case name-like tokens, little technical content
  const tech =
    /\b(react|node|python|rust|golang|typescript|engineer|developer|backend|frontend|full.?stack|mobile|devops)\b/i.test(
      value
    );
  const nameHeavy = /^[A-Z][a-z]+(\s+[A-Z][a-z]+){1,4}\b/.test(value);
  return nameHeavy && !tech;
}

/** Reject URLs / bare domains — they are not employer names for "work at X". */
export function sanitizeEmployerName(raw: string | null | undefined): string {
  let company = String(raw || "")
    .replace(/^@/, "")
    .trim();
  if (!company) return "";
  if (/^https?:\/\//i.test(company) || /^www\./i.test(company)) return "";
  // Bare domain like kiri.ng or github.com
  if (/^[a-z0-9.-]+\.[a-z]{2,}(?:\/\S*)?$/i.test(company)) return "";
  if (company.length > 60) company = company.slice(0, 60).trim();
  return company;
}

/** Pull usable company / role / repo signals without dumping LinkedIn-style bios. */
export function extractOpeningSignals(dev: DeveloperContext): {
  language: string;
  company: string;
  roleHint: string;
  featuredRepo: string;
  signals: string[];
} {
  const language = String(dev.language || "").trim();
  let company = sanitizeEmployerName(dev.company);
  let roleHint = "";
  const featuredRepo = String(dev.featured_repo || "")
    .replace(/^@/, "")
    .trim();
  const featuredRepoDesc = String(dev.featured_repo_description || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 90);

  const bio = String(dev.bio || "").replace(/\s+/g, " ").trim();
  if (bio) {
    const parts = bio
      .split("|")
      .map((p) => p.replace(/\([^)]*\)/g, " ").replace(/\s+/g, " ").trim())
      .filter(Boolean);

    for (const part of parts) {
      const founder = part.match(/\b(?:founder|co-?founder|ceo|cto)\s+of\s+([^|,]+)/i);
      if (founder && !company) {
        company = sanitizeEmployerName(founder[1]);
      }
      const atCompany = part.match(/\b(?:at|@)\s+([A-Za-z0-9][\w.&' -]{1,40})/i);
      if (atCompany && !company) {
        company = sanitizeEmployerName(atCompany[1]);
      }
      if (
        !roleHint &&
        /\b(software engineer|full.?stack|frontend|backend|mobile|devops|engineer|developer|founder)\b/i.test(
          part
        )
      ) {
        const m = part.match(
          /\b((?:senior\s+)?(?:software engineer|full.?stack(?:\s+developer)?|frontend(?:\s+developer)?|backend(?:\s+developer)?|mobile developer|devops engineer|founder))\b/i
        );
        roleHint = m ? m[1] : part.slice(0, 50);
      }
    }

    // Single-segment bio that is actually descriptive
    if (!company && !roleHint && bio && !looksLikeNameBanner(bio, dev)) {
      roleHint = bio.slice(0, 70);
    }
  }

  const signals: string[] = [];
  // Strongest hooks first (research: specific work beats generic language)
  if (company) signals.push(`your work at ${company}`);
  if (featuredRepo) {
    signals.push(
      featuredRepoDesc
        ? `your ${featuredRepo} project (${featuredRepoDesc})`
        : `your work on ${featuredRepo}`
    );
  }
  if (language && signals.length < 2) {
    signals.push(`your ${prettyTechLabel(language)} background`);
  }
  if (roleHint && signals.length < 2) {
    signals.push(`your experience as a ${roleHint}`);
  }
  const location = String(dev.location || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 40);
  // Location is a weak hook — only use if we still have nothing stronger
  if (!signals.length && location && !/remote|worldwide|earth/i.test(location)) {
    signals.push(`your profile based in ${location}`);
  }
  if (!signals.length && /\bsoftware engineer\b/i.test(bio)) {
    signals.push("your software engineering background");
  }
  if (!signals.length) {
    signals.push(`your ${prettyTechLabel(language) || "engineering"} background`);
  }

  return { language, company, roleHint, featuredRepo, signals };
}

function emptyTrackScores(): Record<DevTrack, number> {
  return Object.keys(TRACK_PACKS).reduce(
    (acc, key) => {
      acc[key as DevTrack] = 0;
      return acc;
    },
    {} as Record<DevTrack, number>
  );
}

export function detectTrack(dev: DeveloperContext): DevTrack {
  const text = profileText(dev);
  const score = emptyTrackScores();
  const add = (track: DevTrack, n = 1) => {
    score[track] += n;
  };

  const rules: Array<[RegExp, DevTrack, number]> = [
    [/\b(react native)\b/, "mobile", 5],
    [/\b(next\.?js|react)\b/, "react", 6],
    [/\b(vue|nuxt)\b/, "vue", 6],
    [/\b(angular|rxjs)\b/, "angular", 6],
    [/\b(flutter|dart)\b/, "flutter", 5],
    [/\b(swift|swiftui|ios)\b/, "ios", 5],
    [/\b(kotlin|jetpack|android)\b/, "android", 5],
    [/\b(nestjs|express|fastify|node\.?js)\b/, "nodejs", 5],
    [/\b(django|fastapi|flask)\b/, "python", 5],
    [/\b(spring|hibernate)\b/, "java", 5],
    [/\b(asp\.?net|\.net|dotnet)\b/, "dotnet", 5],
    [/\bgolang\b/, "golang", 5],
    [/\bgo developer\b|\bgo engineer\b|\bgo lang\b/, "golang", 4],
    [/\brust\b/, "rust", 5],
    [/\b(laravel|symfony|\bphp\b)\b/, "php", 5],
    [/\b(rails|\bruby\b)\b/, "ruby", 5],
    [/\b(pytorch|tensorflow|llm|machine learning|deep learning|hugging ?face)\b/, "ml", 5],
    [/\b(data engineer|etl|airflow|dbt|spark|warehouse)\b/, "data", 5],
    [/\b(solidity|ethereum|web3|blockchain|smart contract)\b/, "blockchain", 5],
    [/\b(unity|unreal|godot|game dev)\b/, "game", 5],
    [/\b(embedded|firmware|rtos|microcontroller)\b/, "embedded", 5],
    [/\b(appsec|owasp|penetration|security engineer)\b/, "security", 5],
    [/\b(playwright|cypress|selenium|qa engineer|test automation)\b/, "qa", 5],
    [/\b(site reliability|sre)\b/, "sre", 5],
    [/\b(platform engineer|developer platform|internal developer)\b/, "platform", 5],
    [/\b(devops|ci\/cd|terraform|kubernetes|k8s|docker)\b/, "devops", 4],
    [/\b(aws|gcp|azure|cloud engineer)\b/, "cloud", 4],
    [/\b(frontend|front-end|ui engineer)\b/, "frontend", 4],
    [/\b(backend|back-end|api engineer)\b/, "backend", 3],
    [/\b(full.?stack|fullstack)\b/, "fullstack", 5],
    [/\b(mobile)\b/, "mobile", 3],
    [/\b(typescript)\b/, "typescript", 3],
    [/\bc#\b/, "csharp", 4],
  ];

  for (const [re, track, w] of rules) {
    if (re.test(text)) add(track, w);
  }

  const lang = (dev.language || "").toLowerCase();
  const langMap: Array<[string[], DevTrack, number]> = [
    [["typescript"], "typescript", 4],
    [["javascript", "html", "css"], "frontend", 3],
    [["vue"], "vue", 5],
    [["python"], "python", 4],
    [["java"], "java", 4],
    [["c#", "c-sharp"], "csharp", 5],
    [["go"], "golang", 5],
    [["rust"], "rust", 5],
    [["php"], "php", 5],
    [["ruby"], "ruby", 5],
    [["swift", "objective-c"], "ios", 5],
    [["kotlin"], "android", 5],
    [["dart"], "flutter", 5],
    [["c", "c++"], "embedded", 3],
    [["jupyter notebook", "r"], "data", 4],
    [["shell", "dockerfile", "hcl"], "devops", 3],
    [["solidity"], "blockchain", 5],
  ];

  for (const [langs, track, w] of langMap) {
    if (langs.includes(lang)) add(track, w);
  }

  if (score.frontend >= 3 && score.backend >= 3) add("fullstack", 4);
  if (score.react >= 3 && (score.nodejs >= 3 || score.backend >= 3)) {
    add("fullstack", 3);
  }

  // Prefer concrete frameworks over generic language tracks
  const hasFramework = ["react", "vue", "angular", "flutter", "ios", "android", "nodejs"].some(
    (t) => score[t as DevTrack] >= 5
  );
  if (hasFramework) {
    score.typescript = Math.min(score.typescript, 2);
    score.frontend = Math.min(score.frontend, 3);
    score.backend = Math.min(score.backend, 3);
  }

  if (score.ml >= 5) {
    score.python = Math.min(score.python, 3);
    score.data = Math.min(score.data, 3);
  }

  const ranked = (Object.entries(score) as [DevTrack, number][]).sort(
    (a, b) => b[1] - a[1]
  );
  if (ranked[0][1] === 0) return "fullstack";
  return ranked[0][0];
}

/** Prefer the developer's real stack + estimated experience in pack copy. */
export function personalizePackForDev(
  pack: TrackPack,
  dev: DeveloperContext,
  experience?: ExperienceEstimate
): TrackPack {
  const language = (dev.language || "").trim();
  const text = profileText(dev);
  const matchedHints = pack.stackHints.filter((h) => textHasHint(text, h));
  const exp =
    experience ||
    estimateExperienceFromGithub({
      created_at: dev.created_at,
      earliest_repo_at: dev.earliest_repo_at,
      public_repos: dev.public_repos,
      followers: dev.followers,
      language: dev.language,
      bio: dev.bio,
    });

  const roleTitle = adjustRoleTitleForExperience(pack.roleTitle, exp.band);

  const techLines = [...pack.techLines];
  const matchBits: string[] = [];
  const seen = new Set<string>();
  const addBit = (raw: string) => {
    const pretty = prettyTechLabel(raw);
    if (!pretty) return;
    // Skip aliases of the track itself ("nodejs" when track is Node.js)
    if (sameTech(pretty, pack.label)) return;
    const key = pretty.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    matchBits.push(escapeHtml(pretty));
  };
  if (language) addBit(language);
  for (const h of matchedHints.slice(0, 5)) addBit(h);

  if (matchBits.length) {
    techLines.unshift(
      `<strong>Relevant to your stack:</strong> ${matchBits.join(" · ")}`
    );
  }

  const lookingFor = [
    experienceRequirementBullet(pack.label, exp),
    ...pack.lookingFor.filter((line) => !/\byears?\b/i.test(line)),
  ];
  // Only add a language requirement when it adds info beyond the track name
  if (language && !sameTech(language, pack.label)) {
    lookingFor.splice(
      1,
      0,
      `Hands-on ${prettyTechLabel(language)} experience in production ${pack.label} work`
    );
  }

  const syncedBlurb = pack.roleBlurb.split(pack.roleTitle).join(roleTitle);
  const signals = extractOpeningSignals(dev);

  return {
    ...pack,
    roleTitle,
    subject: pickPersonalizedSubject(roleTitle, String(dev.login || pack.label), {
      language: language || undefined,
      company: signals.company || undefined,
      repo: signals.featuredRepo || undefined,
    }),
    roleBlurb: syncedBlurb,
    techLines,
    lookingFor,
  };
}

function defaultOpening(
  dev: DeveloperContext,
  pack: TrackPack,
  style: MessageStyle,
  experience?: ExperienceEstimate,
  prior?: { subject?: string | null; openingSnippet?: string | null } | null
): string {
  const { company, language, featuredRepo, signals } =
    extractOpeningSignals(dev);
  const exp =
    experience ||
    estimateExperienceFromGithub({
      created_at: dev.created_at,
      earliest_repo_at: dev.earliest_repo_at,
      public_repos: dev.public_repos,
      followers: dev.followers,
      language: dev.language,
      bio: dev.bio,
    });

  const seed = String(dev.login || pack.roleTitle);
  const role = pack.roleTitle;
  const stack = prettyTechLabel(language || "") || pack.label;

  // Prefer the strongest available signal (company > repo > language)
  const signal =
    signals[0] ||
    (company
      ? `your work at ${company}`
      : featuredRepo
        ? `your work on ${featuredRepo}`
        : language
          ? `your ${stack} background`
          : `your ${pack.label} background`);

  const bridge = roleMatchSentence({
    roleTitle: role,
    trackLabel: pack.label,
    experience: exp,
    language: language || null,
    company: company || null,
  });

  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h + seed.charCodeAt(i) * (i + 3)) % 97;

  const priorSubject = String(prior?.subject || "")
    .replace(/^Re:\s*/i, "")
    .trim()
    .slice(0, 72);
  const priorHook = priorSubject
    ? `my note about ${priorSubject}`
    : `the ${role} note I sent`;

  // Short / direct / concise: name the role once; signal does the rest
  if (style === "short" || style === "concise" || style === "direct") {
    const shortOpenings = [
      `I'm Faber with PivotalStacks Careers. We're hiring a ${role}, and ${signal} looked close to what the team needs.`,
      `Quick note from Faber (PivotalStacks Careers): we're hiring a ${role}. ${signal.charAt(0).toUpperCase()}${signal.slice(1)} looked worth a short note.`,
      `I'm Faber with PivotalStacks Careers. ${bridge}`,
      `Faber here from PivotalStacks Careers. Open ${role} role — ${signal} made me think this might be a useful fit.`,
      `I'm writing from PivotalStacks Careers about a ${role} opening. Based on ${signal}, I wanted to share a clear brief.`,
      `We're hiring a ${role} at PivotalStacks. I'm Faber on Careers — ${signal} seemed close enough to reach out.`,
      `Short note from Faber (PivotalStacks): ${role} search is active, and ${signal} stood out.`,
    ];
    return humanizeOpening(shortOpenings[h % shortOpenings.length]);
  }

  if (style === "curious") {
    const curious = [
      `I'm Faber with PivotalStacks Careers. Is a ${role} move on your radar? ${signal.charAt(0).toUpperCase()}${signal.slice(1)} looked close to what we're hiring for.`,
      `Curious if timing is open — Faber from PivotalStacks Careers. We're hiring a ${role}, and ${signal} seemed relevant.`,
      `Quick question from Faber (PivotalStacks Careers): would a ${role} role be worth a short look? ${bridge}`,
      `Not sure if you're looking, but ${signal} lined up with our ${role} search. I'm Faber with PivotalStacks Careers.`,
    ];
    return humanizeOpening(curious[h % curious.length]);
  }

  if (style === "peer") {
    const peer = [
      `I'm Faber with PivotalStacks Careers. The ${role} role is production ${stack} work with real ownership — ${signal} looked like a solid match.`,
      `Faber from PivotalStacks Careers. Sharing a ${role} brief: day-to-day is shipping ${stack} in production, not slide decks. ${bridge}`,
      `Writing from Careers at PivotalStacks about a ${role} seat. Team needs someone comfortable owning ${stack} services — ${signal} caught my eye.`,
      `I'm Faber (PivotalStacks Careers). ${role} opening for someone who likes clear scope and shipping. Based on ${signal}, this felt worth a note.`,
    ];
    return humanizeOpening(peer[h % peer.length]);
  }

  if (style === "followup") {
    const bumps = [
      `Following up briefly on ${priorHook} - still hiring, and ${signal} still looks relevant.`,
      `Quick bump from Faber (PivotalStacks Careers) on our ${role} opening. ${bridge}`,
      `Circling back once on ${priorHook}. No pressure if timing is off.`,
      `Still hiring for the ${role} role — bumping ${priorHook} once in case it got buried.`,
      `Faber again from PivotalStacks Careers. Soft follow-up on ${priorHook}; ${signal} still looks like a fit.`,
    ];
    return humanizeOpening(bumps[h % bumps.length]);
  }

  // Prefer "15-20 minutes" inline — avoid temporal const after callers
  if (style === "followup-value") {
    const valueNotes = [
      `One more note after ${priorHook}: you'd own real production work with a short first call (me + the hiring engineer). ${bridge}`,
      `Following ${priorHook} with one concrete detail: the ${role} seat includes end-to-end ownership, not only ticket queues.`,
      `Quick value add on ${priorHook}: first call is 15-20 minutes with recruiting and the hiring engineer — then a clear yes/no.`,
      `After ${priorHook}: day-to-day is ${stack} in production, small team, written scope. Happy to walk through if useful.`,
    ];
    return humanizeOpening(valueNotes[h % valueNotes.length]);
  }

  if (style === "followup-close") {
    const closes = [
      `Last note from me on ${priorHook} - I'll leave it here either way. If it's interesting, a short reply is enough.`,
      `Closing the loop on ${priorHook}. I won't keep chasing — reply if the ${role} still looks useful, otherwise take care.`,
      `Final note from Faber (PivotalStacks Careers) on ${priorHook}. Easy yes or no; I'll stop either way.`,
    ];
    return humanizeOpening(closes[h % closes.length]);
  }

  if (style === "technical") {
    const tech = [
      `I reviewed ${signal} while sourcing for a ${role}. I'm Faber with PivotalStacks Careers - the day-to-day is ${stack} work on production systems.`,
      `Sourcing for a ${role}: ${signal} looked aligned with the ${stack} work this team ships. I'm Faber with PivotalStacks Careers.`,
      `I'm Faber (PivotalStacks Careers). For the ${role} seat we need solid ${stack} instincts — ${signal} stood out.`,
      `Technical note from Faber at PivotalStacks Careers: ${role} role, production ${stack}. ${bridge}`,
    ];
    return humanizeOpening(tech[h % tech.length]);
  }

  if (style === "formal") {
    const formal = [
      `I'm Faber Ceron from PivotalStacks Careers. We're hiring for a ${role} position, and ${signal} looked relevant enough to share the scope honestly.`,
      `My name is Faber Ceron, Careers at PivotalStacks. I am writing regarding our ${role} opening. ${bridge}`,
      `Faber Ceron, PivotalStacks Careers. Enclosed is a concise brief for our ${role} role. Based on ${signal}, this may be of interest.`,
      `I am reaching out from PivotalStacks Careers concerning a ${role} vacancy. ${signal.charAt(0).toUpperCase()}${signal.slice(1)} prompted this note.`,
    ];
    return humanizeOpening(formal[h % formal.length]);
  }

  if (style === "warm") {
    // Greeting already has Hi/Hello — do not start opening with Hi
    const warm = [
      `I'm Faber with PivotalStacks Careers. We're hiring a ${role}. ${bridge}`,
      `Hope this finds you well — Faber from PivotalStacks Careers. Sharing a ${role} opening because ${signal} felt close.`,
      `I'm Faber on the Careers team at PivotalStacks. Thought the ${role} role might be worth a look given ${signal}.`,
      `Friendly note from Faber (PivotalStacks Careers) about our ${role} search. ${bridge}`,
    ];
    return humanizeOpening(warm[h % warm.length]);
  }

  const openings = [
    `I'm Faber with PivotalStacks Careers. We're hiring a ${role}, and ${signal} looked close enough that I wanted to share a clear brief.`,
    `Quick note from Faber (PivotalStacks Careers) about our ${role} opening - ${bridge}`,
    `Hope you're well. I'm Faber from PivotalStacks Careers. We're looking for a ${role}. Based on ${signal}, this felt worth a short note.`,
    `I'm writing from PivotalStacks Careers about a ${role} role we're actively filling. ${bridge}`,
    `Faber here (PivotalStacks Careers). ${role} hiring is open, and ${signal} looked like a relevant match.`,
    `Sharing a clear brief for our ${role} role at PivotalStacks. I'm Faber on Careers — ${signal} prompted the note.`,
    `We're filling a ${role} seat at PivotalStacks. I'm Faber; based on ${signal}, I wanted to send details without the fluff.`,
  ];
  return humanizeOpening(openings[h % openings.length]);
}

function buildPersonalizationFromTrack(
  dev: DeveloperContext,
  track: DevTrack,
  style: MessageStyle,
  overrides?: Partial<Personalization>,
  experience?: ExperienceEstimate,
  prior?: { subject?: string | null; openingSnippet?: string | null } | null
): Personalization {
  const exp =
    experience ||
    estimateExperienceFromGithub({
      created_at: dev.created_at,
      earliest_repo_at: dev.earliest_repo_at,
      public_repos: dev.public_repos,
      followers: dev.followers,
      language: dev.language,
      bio: dev.bio,
    });
  const basePack = packFromTrack(track);
  const pack = personalizePackForDev(basePack, dev, exp);
  const language = (dev.language || "").trim();
  const layoutSeed = String(dev.login || pack.roleTitle || "candidate");
  const followup = isFollowupStyle(style);
  // Single active content type for now (short). Tones still vary voice/CTA.
  const layoutId = resolveContentType(
    overrides?.layoutId || (isCompactStyle(style) ? "short" : undefined)
  );
  const compact = layoutId === "short" || isCompactStyle(style);
  // Follow-ups stay lean; first-touch short includes a real role brief.
  const leanFollowup = compact && followup;

  const responsibilities = leanFollowup
    ? []
    : overrides?.responsibilities?.length
      ? overrides.responsibilities.slice(0, compact ? 3 : undefined)
      : overrides?.responsibilitiesHtml
        ? htmlBulletsToLines(overrides.responsibilitiesHtml).slice(
            0,
            compact ? 3 : undefined
          )
        : pack.responsibilities.slice(0, compact ? 3 : undefined);
  const lookingFor = leanFollowup
    ? []
    : overrides?.lookingFor?.length
      ? overrides.lookingFor.slice(0, compact ? 3 : undefined)
      : overrides?.lookingForHtml
        ? htmlBulletsToLines(overrides.lookingForHtml).slice(
            0,
            compact ? 3 : undefined
          )
        : pack.lookingFor.slice(0, compact ? 3 : undefined);
  const offer = leanFollowup
    ? []
    : overrides?.offer?.length
      ? overrides.offer.slice(0, compact ? 3 : undefined)
      : overrides?.offerHtml
        ? htmlBulletsToLines(overrides.offerHtml).slice(0, compact ? 3 : undefined)
        : pickOfferBullets(layoutSeed, 4).slice(0, compact ? 3 : 4);
  const techFocus = leanFollowup
    ? []
    : overrides?.techFocus?.length
      ? overrides.techFocus.slice(0, compact ? 4 : undefined)
      : overrides?.techStackHtml
        ? htmlTechToLines(overrides.techStackHtml).slice(0, compact ? 4 : undefined)
        : pack.techLines
            .map((l) =>
              l
                .replace(/<[^>]+>/g, " ")
                .replace(/&amp;/gi, "&")
                .replace(/\s+/g, " ")
                .trim()
            )
            .slice(0, compact ? 4 : undefined);

  const whyUsRaw = overrides?.whyUs || pack.whyUs;
  let whyUs =
    whyUsRaw.length > 80
      ? whyUsRaw
      : enrichWhyUs(whyUsRaw, layoutSeed);
  if (leanFollowup) {
    whyUs = whyUs
      .replace(/\s+/g, " ")
      .trim()
      .replace(/\.$/, "");
    if (style === "followup-close") {
      whyUs = "Happy to share more if useful; otherwise I'll leave it here.";
    } else if (whyUs.length > 140) {
      whyUs = `${whyUs.slice(0, 137).replace(/\s+\S*$/, "")}...`;
    }
    if (!/[.!?]$/.test(whyUs)) whyUs = `${whyUs}.`;
  }

  const signals = extractOpeningSignals(dev);
  const subject =
    overrides?.subject ||
    (followup
      ? pickFollowupSubject(pack.roleTitle, layoutSeed)
      : pickPersonalizedSubject(pack.roleTitle, layoutSeed, {
          language: language || undefined,
          company: signals.company || undefined,
          repo: signals.featuredRepo || undefined,
        }));

  const roleBlurb = leanFollowup
    ? ""
    : overrides?.roleBlurb || pack.roleBlurb;

  return {
    subject,
    greeting: normalizeGreeting(overrides?.greeting || "Hi,", {
      name: dev.name,
      login: dev.login,
    }),
    opening: sanitizeOpening(
      overrides?.opening || defaultOpening(dev, pack, style, exp, prior),
      dev
    ),
    matchNotes:
      overrides?.matchNotes ||
      (compact
        ? `${followup ? "Follow-up" : "Short role brief"} · ${pack.label}${language ? ` · ${language}` : ""}${signals.featuredRepo ? ` · ${signals.featuredRepo}` : ""} · ${exp.label}`
        : `Role match · ${pack.label}${language ? ` · ${language}` : ""}${signals.featuredRepo ? ` · ${signals.featuredRepo}` : ""} · ${exp.label} GitHub estimate · ${styleLabel(style)} tone · ${layoutLabel(layoutId)} layout`),
    track,
    style,
    roleTitle: overrides?.roleTitle || pack.roleTitle,
    roleBlurb,
    responsibilities,
    techFocus,
    lookingFor,
    offer,
    responsibilitiesHtml:
      overrides?.responsibilitiesHtml || bulletsToHtml(responsibilities),
    techStackHtml:
      overrides?.techStackHtml || formatTechFocusLines(techFocus),
    lookingForHtml: overrides?.lookingForHtml || bulletsToHtml(lookingFor),
    offerHtml: overrides?.offerHtml || bulletsToHtml(offer),
    whyUs,
    closingLine:
      overrides?.closingLine ||
      (followup
        ? pickFollowupCta(overrides?.roleTitle || pack.roleTitle, layoutSeed)
        : pickCta(overrides?.roleTitle || pack.roleTitle, layoutSeed)),
    processNote: overrides?.processNote || COMPANY.process,
    companyNote: overrides?.companyNote || COMPANY.about,
    trackLabel: overrides?.trackLabel || pack.label,
    styleLabel: overrides?.styleLabel || styleLabel(style),
    layoutId,
    layoutSeed,
  };
}

function defaultHireHtml(): string {
  return `<!DOCTYPE html><html><body>
<p>{{GREETING}}</p><p>{{OPENING}}</p>
<div>{{ROLE_TITLE}}</div><div>{{ROLE_BLURB}}</div>
<div>{{RESPONSIBILITIES}}</div><div>{{TECH_STACK}}</div>
<div>{{LOOKING_FOR}}</div><div>{{OFFER}}</div><div>{{WHY_US}}</div>
<div>{{TRACK_LABEL}}</div><div>{{STYLE_LABEL}}</div>
</body></html>`;
}

export function listHireTemplates(): Array<{
  id: string;
  name: string;
  description: string;
  subject: string;
}> {
  try {
    const filePath = path.join(process.cwd(), "data", "templates.json");
    const raw = fs.readFileSync(filePath, "utf8");
    const templates = JSON.parse(raw) as Array<{
      id?: string;
      name?: string;
      description?: string;
      subject?: string;
      body?: string;
    }>;
    const listed = templates.map((t, i) => ({
      id: t.id || `template-${i}`,
      name: t.name || `Template ${i + 1}`,
      description: t.description || "",
      subject: t.subject || "Role at PivotalStacks matched to your profile",
    }));
    return [
      {
        id: "auto",
        name: "Auto (rotate)",
        description:
          "Uses a clean professional shell — content is written by the API, then filled in",
        subject: "{{ROLE_TITLE}} at PivotalStacks",
      },
      ...listed,
    ];
  } catch {
    return [
      {
        id: "auto",
        name: "Auto (rotate)",
        description:
          "Uses a clean professional shell — content is written by the API, then filled in",
        subject: "{{ROLE_TITLE}} at PivotalStacks",
      },
      {
        id: "outlook-safe",
        name: "Plain Outlook",
        description: "Simple left-aligned email",
        subject: "Role at PivotalStacks matched to your profile",
      },
    ];
  }
}

/** Stable template pick from seed when templateId is auto / missing. */
export function pickHireTemplateId(
  seed: string,
  preferred?: string | null,
  opts?: { compact?: boolean }
): string {
  const preferredId = String(preferred || "").trim();
  if (preferredId && preferredId !== "auto" && preferredId !== "random") {
    return preferredId;
  }
  const listed = listHireTemplates().filter((t) => t.id !== "auto");
  const allowIds = opts?.compact
    ? (SHORT_FRIENDLY_TEMPLATE_IDS as readonly string[])
    : (PROFESSIONAL_TEMPLATE_IDS as readonly string[]);
  const professional = listed.filter((t) => allowIds.includes(t.id));
  const pool = professional.length ? professional : listed;
  if (!pool.length) return "outlook-safe";
  const s = String(seed || "candidate");
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return pool[Math.abs(h) % pool.length].id;
}

function loadHireTemplate(
  templateId?: string,
  seed = "candidate",
  opts?: { compact?: boolean }
): HireTemplate {
  const defaultSubject = "Role at PivotalStacks matched to your profile";
  const defaultHtml = defaultHireHtml();
  const resolvedId = pickHireTemplateId(seed, templateId, opts);

  try {
    const filePath = path.join(process.cwd(), "data", "templates.json");
    const raw = fs.readFileSync(filePath, "utf8");
    const templates = JSON.parse(raw) as Array<{
      id?: string;
      name?: string;
      description?: string;
      subject?: string;
      body?: string;
      contentLayout?: string;
    }>;

    const byId = templates.find((t) => t.id === resolvedId);
    const hire =
      byId ||
      templates.find((t) => t.id === "outlook-safe") ||
      templates.find((t) => t.id === "plain-outlook") ||
      templates[0];

    const contentLayout = isEmailLayoutId(hire?.contentLayout)
      ? hire.contentLayout
      : undefined;

    return {
      id: hire?.id || "outlook-safe",
      name: hire?.name || "Plain Outlook",
      description: hire?.description,
      subject: hire?.subject || defaultSubject,
      bodyHtml: hire?.body || defaultHtml,
      contentLayout,
    };
  } catch {
    return {
      id: "outlook-safe",
      name: "Plain Outlook",
      subject: defaultSubject,
      bodyHtml: defaultHtml,
    };
  }
}

function packFromTrack(track: DevTrack): TrackPack {
  return TRACK_PACKS[track];
}

function styleLabel(style: MessageStyle): string {
  return MESSAGE_STYLES.find((s) => s.id === style)?.label || "Professional";
}

/** Re-export greeting helpers for tests / callers. */
export { extractFirstName, normalizeGreeting } from "./greeting";

/** Keep openings sounding like a person wrote them. */
export function humanizeOpening(text: string): string {
  return stripAiSlop(String(text || ""))
    .replace(/\bI am Faber\b/g, "I'm Faber")
    .replace(/\bWe are hiring\b/g, "We're hiring")
    .replace(/\bI(?:'m| am) reaching out from\b/gi, "I'm writing from")
    .replace(/\bI am writing from\b/gi, "I'm writing from")
    .replace(/\bbelow you will find details\.?/gi, "details are below.")
    .replace(/\bbelow you will find\b/gi, "here's")
    .replace(/\bplease find (a )?clear overview\b/gi, "here's the role")
    .replace(/\bplease find\b/gi, "see")
    .replace(/\bi've included a clear overview\b/gi, "I've included the details")
    .replace(/\bdetails are below details\.?/gi, "details are below.")
    .replace(/\bin particular\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+\./g, ".")
    .trim();
}

/** Strip awkward bio dumps the model sometimes pastes into openings. */
export function sanitizeOpening(text: string, dev?: DeveloperContext): string {
  let next = humanizeOpening(text);
  // Only strip long double-quoted dumps (never ASCII apostrophes like I've)
  next = next.replace(
    /(?:your focus around|noticed|noted)\s+[“"][^”"]{15,}[”"]/gi,
    "noticed your background"
  );
  next = next.replace(/[“"][^”"]{40,}[”"]/g, "your background");
  if (dev?.bio) {
    const bio = String(dev.bio).trim();
    if (bio.length > 24 && next.includes(bio.slice(0, 24))) {
      next = next.split(bio).join("your background");
    }
  }
  next = next
    .replace(/\bnoticed your background,\s*which\b/gi, "noticed your background, which")
    .replace(/\byour background around your background\b/gi, "your background")
    .replace(/\s{2,}/g, " ")
    .trim();
  return next;
}

function applyHireTemplate(
  hire: HireTemplate,
  personalization: Personalization
): GeneratedMessage {
  const greeting = normalizeGreeting(personalization.greeting);
  const opening = sanitizeOpening(personalization.opening);
  const openingHtml = formatOpeningHtml(opening);
  const layoutId = personalization.layoutId;
  const layoutSeed = personalization.layoutSeed || "candidate";

  const layoutContent = {
    greeting,
    openingHtml: inheritShellTextColor(openingHtml),
    roleTitle: personalization.roleTitle,
    roleBlurb: inheritShellTextColor(personalization.roleBlurb),
    trackLabel: personalization.trackLabel,
    styleLabel: personalization.styleLabel,
    responsibilities: personalization.responsibilities,
    techFocus: personalization.techFocus.map((line) =>
      inheritShellTextColor(line)
    ),
    lookingFor: personalization.lookingFor,
    offer: personalization.offer,
    whyUs: personalization.whyUs,
    closingLine: personalization.closingLine,
    processNote: personalization.processNote,
    companyNote: personalization.companyNote,
  };

  let html: string;
  if (hire.bodyHtml.includes("{{LAYOUT_BODY}}")) {
    html = hire.bodyHtml;
    const bodyMain = inheritShellTextColor(
      renderLayoutBody(layoutId, layoutContent, layoutSeed)
    );
    const replacements: Record<string, string> = {
      "{{LAYOUT_BODY}}": bodyMain,
      "{{ROLE_TITLE}}": escapeHtml(personalization.roleTitle),
      "{{TRACK_LABEL}}": escapeHtml(personalization.trackLabel),
      "{{STYLE_LABEL}}": escapeHtml(personalization.styleLabel),
    };
    for (const [token, value] of Object.entries(replacements)) {
      html = html.split(token).join(value);
    }
  } else if (hire.id === "outlook-safe") {
    html = renderOutlookDocument(layoutId, layoutContent, layoutSeed);
  } else {
    html = hire.bodyHtml;
    const replacements: Record<string, string> = {
      "{{GREETING}}": escapeHtml(greeting),
      "{{OPENING}}": openingHtml,
      "{{ROLE_TITLE}}": escapeHtml(personalization.roleTitle),
      "{{ROLE_BLURB}}": personalization.roleBlurb,
      "{{RESPONSIBILITIES}}": personalization.responsibilitiesHtml,
      "{{TECH_STACK}}": personalization.techStackHtml,
      "{{LOOKING_FOR}}": personalization.lookingForHtml,
      "{{OFFER}}": personalization.offerHtml,
      "{{WHY_US}}": escapeHtml(personalization.whyUs),
      "{{TRACK_LABEL}}": escapeHtml(personalization.trackLabel),
      "{{STYLE_LABEL}}": escapeHtml(personalization.styleLabel),
    };
    for (const [token, value] of Object.entries(replacements)) {
      html = html.split(token).join(value);
    }
  }

  const rawSubject = personalization.subject || hire.subject;
  const subjectWithTokens = rawSubject
    .split("{{ROLE_TITLE}}")
    .join(personalization.roleTitle)
    .split("{{TRACK_LABEL}}")
    .join(personalization.trackLabel)
    .split("{{STYLE_LABEL}}")
    .join(personalization.styleLabel);

  return {
    subject: sanitizeSubject(subjectWithTokens),
    body: html,
    matchNotes: personalization.matchNotes,
    greeting,
    opening,
    track: personalization.track,
    style: personalization.style,
    templateId: hire.id,
    templateName: hire.name,
    roleTitle: personalization.roleTitle,
    roleBlurb: personalization.roleBlurb,
    responsibilities: personalization.responsibilities,
    techFocus: personalization.techFocus,
    lookingFor: personalization.lookingFor,
    offer: personalization.offer,
    responsibilitiesHtml: personalization.responsibilitiesHtml,
    techStackHtml: personalization.techStackHtml,
    lookingForHtml: personalization.lookingForHtml,
    offerHtml: personalization.offerHtml,
    whyUs: personalization.whyUs,
    closingLine: personalization.closingLine,
    processNote: personalization.processNote,
    companyNote: personalization.companyNote,
    trackLabel: personalization.trackLabel,
    styleLabel: personalization.styleLabel,
    layoutId,
    layoutLabel: layoutLabel(layoutId),
  };
}

function extractPersonalization(
  text: string,
  track: DevTrack,
  pack: TrackPack,
  experience: ExperienceEstimate
): Partial<Personalization> | null {
  const candidate = extractJsonObject(text) || text.trim();

  const tryParse = (s: string): Partial<Personalization> | null => {
    try {
      const parsed = JSON.parse(s);
      if (!parsed?.greeting || !parsed?.opening) return null;

      const responsibilities = sanitizePlainBullets(
        parsed.responsibilities,
        pack.responsibilities,
        { min: 3, max: 5 }
      );
      const lookingFor = sanitizePlainBullets(parsed.lookingFor, pack.lookingFor, {
        min: 2,
        max: 4,
      });
      const yearsBullet = experienceRequirementBullet(pack.label, experience);
      const lookingMerged = [
        yearsBullet,
        ...lookingFor.filter((line) => !/\byears?\b/i.test(line)),
      ].slice(0, 6);

      const techRaw = Array.isArray(parsed.techFocus)
        ? parsed.techFocus
            .map((item: unknown) => String(item || "").trim())
            .filter(Boolean)
            .slice(0, 5)
        : [];
      const techLines =
        techRaw.length >= 2
          ? techRaw
          : pack.techLines.map((l) =>
            l
              .replace(/<[^>]+>/g, " ")
              .replace(/&amp;/gi, "&")
              .replace(/\s+/g, " ")
              .trim()
          );

      const offer = sanitizePlainBullets(
        parsed.offer,
        pickOfferBullets(pack.label, 4),
        { min: 3, max: 4 }
      );

      const whyUs = stripAiSlop(
        String(parsed.whyUs || "")
          .replace(/\s+/g, " ")
          .trim()
      );

      const closingLine = stripAiSlop(
        String(parsed.closingLine || "")
          .replace(/\s+/g, " ")
          .trim()
      );

      const roleBlurb = sanitizeRoleBlurbHtml(
        String(parsed.roleBlurb || ""),
        pack.roleBlurb
      );

      const whyUsFinal =
        whyUs.length >= 30 && whyUs.length <= 220 && !looksLikeAiSlop(whyUs)
          ? whyUs.endsWith(".")
            ? whyUs
            : `${whyUs}.`
          : pack.whyUs;

      return {
        subject: parsed.subject ? String(parsed.subject).trim() : undefined,
        greeting: normalizeGreeting(parsed.greeting),
        opening: sanitizeOpening(String(parsed.opening).trim()),
        matchNotes: parsed.matchNotes
          ? String(parsed.matchNotes).trim()
          : undefined,
        track,
        roleTitle: pack.roleTitle,
        roleBlurb,
        responsibilities,
        techFocus: techLines,
        lookingFor: lookingMerged,
        offer,
        responsibilitiesHtml: bulletsToHtml(responsibilities),
        techStackHtml: formatTechFocusLines(techLines),
        lookingForHtml: bulletsToHtml(lookingMerged),
        offerHtml: bulletsToHtml(offer),
        whyUs: whyUsFinal,
        closingLine:
          closingLine.length >= 40 &&
          closingLine.length <= 360 &&
          !looksLikeAiSlop(closingLine)
            ? closingLine
            : undefined,
        layoutId: isActiveContentType(parsed.layout)
          ? parsed.layout
          : undefined,
      };
    } catch {
      return null;
    }
  };

  return tryParse(candidate);
}

function normalizeTrack(value?: string): DevTrack | undefined {
  if (!value) return undefined;
  return value in TRACK_PACKS ? (value as DevTrack) : undefined;
}

function normalizeStyle(value?: string): MessageStyle {
  if (
    value === "warm" ||
    value === "concise" ||
    value === "professional" ||
    value === "technical" ||
    value === "direct" ||
    value === "formal" ||
    value === "short" ||
    value === "curious" ||
    value === "peer" ||
    value === "followup" ||
    value === "followup-value" ||
    value === "followup-close"
  ) {
    return value;
  }
  return "professional";
}

export async function enrichDeveloperExperience(
  developer: DeveloperContext
): Promise<{ developer: DeveloperContext; experience: ExperienceEstimate }> {
  const next: DeveloperContext = { ...developer };

  const needsUser =
    !next.created_at || next.public_repos == null || next.followers == null;
  // Skip optional GitHub hops when we already have a personalization signal —
  // repo/earliest fetches often add seconds (and 403 noise) for little gain.
  const hasSignal =
    !!sanitizeEmployerName(next.company) ||
    !!String(next.language || "").trim() ||
    !!String(next.featured_repo || "").trim();
  const needsEarliest = !next.earliest_repo_at && !next.created_at;
  const needsFeatured = !next.featured_repo && !hasSignal;

  const tasks: Array<Promise<void>> = [];

  if (needsUser) {
    tasks.push(
      (async () => {
        try {
          const user = await getUser(developer.login);
          next.created_at = next.created_at || user.created_at;
          next.public_repos =
            next.public_repos != null ? next.public_repos : user.public_repos;
          next.followers =
            next.followers != null ? next.followers : user.followers;
          next.bio = next.bio || user.bio;
          next.company = next.company || user.company;
          next.location = next.location || user.location;
          next.name = next.name || user.name;
        } catch {
          // keep partial context
        }
      })()
    );
  }

  if (needsEarliest) {
    tasks.push(
      (async () => {
        next.earliest_repo_at = await getEarliestRepoCreatedAt(developer.login);
      })()
    );
  }

  if (needsFeatured) {
    tasks.push(
      (async () => {
        const featured = await getFeaturedRepo(developer.login);
        if (featured) {
          next.featured_repo = featured.name;
          next.featured_repo_description = featured.description;
          next.featured_repo_language = featured.language;
        }
      })()
    );
  }

  if (tasks.length) await Promise.all(tasks);

  const experience = estimateExperienceFromGithub({
    created_at: next.created_at,
    earliest_repo_at: next.earliest_repo_at,
    public_repos: next.public_repos,
    followers: next.followers,
    language: next.language,
    bio: next.bio,
  });

  return { developer: next, experience };
}

export async function generateMatchedMessage(
  developer: DeveloperContext,
  options: GenerateOptions = {}
): Promise<GeneratedMessage> {
  const enriched = await enrichDeveloperExperience(developer);
  const track =
    normalizeTrack(options.track) || detectTrack(enriched.developer);
  const style = normalizeStyle(options.style);
  const hire = loadHireTemplate(
    options.templateId,
    enriched.developer.login || "candidate",
    { compact: isCompactStyle(style) }
  );
  const signals = extractOpeningSignals(enriched.developer);
  const prior = getLastSendForDeveloper(enriched.developer.login);
  const priorContext = prior
    ? {
        subject: prior.subject,
        openingSnippet: prior.openingSnippet,
        touchCount: getSendsForDeveloper(enriched.developer.login).length,
      }
    : null;
  const base = buildPersonalizationFromTrack(
    enriched.developer,
    track,
    style,
    undefined,
    enriched.experience,
    priorContext
  );
  const withExperience = (
    msg: GeneratedMessage,
    meta?: { generatedBy: "minimax" | "template"; aiModel?: string }
  ): GeneratedMessage => {
    const quality = assessMessageQuality({
      subject: msg.subject,
      greeting: msg.greeting,
      opening: msg.opening,
      bodyText: htmlToPlainApprox(msg.body),
      whyUs: msg.whyUs,
      closingLine: msg.closingLine,
      style: msg.style || style,
      hasCompanySignal: !!signals.company,
      hasRepoSignal: !!signals.featuredRepo,
      hasLanguageSignal: !!signals.language,
      hasFirstNameGreeting: /Hi,\s+\w|Hello,\s+\w/.test(msg.greeting || ""),
    });
    return {
      ...msg,
      experienceYears: enriched.experience.years,
      experienceLabel: enriched.experience.label,
      experienceBand: enriched.experience.band,
      requiredYearsText: enriched.experience.requiredYearsText,
      generatedBy: meta?.generatedBy || "template",
      aiModel: meta?.aiModel,
      quality,
      priorSendAt: prior?.sentAt || null,
    };
  };

  const strengthenWithTemplate = (
    weak: GeneratedMessage,
    meta?: { generatedBy: "minimax" | "template"; aiModel?: string }
  ): GeneratedMessage => {
    const forced = withExperience(
      applyHireTemplate(
        hire,
        buildPersonalizationFromTrack(
          enriched.developer,
          track,
          style,
          {
            ...base,
            // Force strongest template opening/subject; keep greeting if named
            greeting: weak.greeting || base.greeting,
            opening: undefined,
            subject: undefined,
            layoutId: resolveContentType(base.layoutId),
          },
          enriched.experience,
          priorContext
        )
      ),
      meta || { generatedBy: "template" }
    );
    if ((forced.quality?.score || 0) >= (weak.quality?.score || 0)) {
      return {
        ...forced,
        matchNotes: [
          forced.matchNotes,
          "Quality gate: reinforced opening/subject from profile signals",
        ]
          .filter(Boolean)
          .join(" · "),
      };
    }
    return weak;
  };

  if (!getMinimaxApiKey()) {
    const templated = withExperience(applyHireTemplate(hire, base), {
      generatedBy: "template",
    });
    return templated.quality?.label === "Weak"
      ? strengthenWithTemplate(templated)
      : templated;
  }

  const pack = personalizePackForDev(
    packFromTrack(track),
    enriched.developer,
    enriched.experience
  );
  const yearsLine = experienceRequirementBullet(pack.label, enriched.experience);
  const langPretty =
    prettyTechLabel(enriched.developer.language || "") || pack.label;
  const companyPretty = sanitizeEmployerName(enriched.developer.company);

  const packBlurbPlain = pack.roleBlurb
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
  const packTechPlain = pack.techLines
    .map((l) =>
      l
        .replace(/<[^>]+>/g, "")
        .replace(/&amp;/gi, "&")
        .replace(/\s+/g, " ")
        .trim()
    )
    .join(" | ");

  const signalHint = companyPretty
    ? `Mention ${companyPretty} once, factually.`
    : enriched.developer.featured_repo
      ? `Mention their repo "${enriched.developer.featured_repo}"${enriched.developer.featured_repo_description ? ` (${enriched.developer.featured_repo_description})` : ""} once, factually — do not invent other repos.`
      : langPretty
        ? `Mention ${langPretty} once, factually.`
        : "Do not invent employers, repos, or skills.";

  const firstNameHint =
    extractFirstName(enriched.developer.name, enriched.developer.login) || "none";
  const repoHint = enriched.developer.featured_repo
    ? `${enriched.developer.featured_repo}${enriched.developer.featured_repo_description ? ` — ${enriched.developer.featured_repo_description}` : ""}`
    : "n/a";

  const shortMode = isCompactStyle(style) || base.layoutId === "short";
  const followupMode = isFollowupStyle(style);
  const priorPromptBlock = priorContext
    ? `Prior outreach (do not repeat verbatim; reference lightly):
- Prior subject: ${priorContext.subject || "n/a"}
- Prior opening clip: ${priorContext.openingSnippet || "n/a"}
- Touch number: ${priorContext.touchCount + 1} (they already got ${priorContext.touchCount} email(s))
`
    : "";

  const buildPrompt = (strictSignal = false) =>
    shortMode
    ? `Write ${followupMode ? "FOLLOW-UP" : "SHORT role-brief"} recruiting CONTENT as JSON only (no HTML).
Goal: ${followupMode ? "~50-90 words, light nudge" : "compact but complete — opening + role substance (~150-220 words of content)"}.
You are Faber at PivotalStacks Careers. Natural contractions. No hype. No flattery.
${followupMode ? "Assume they already received a first email about this role. Do not re-pitch the full job." : "Include a clear role brief so they know day-to-day work, stack, and bar."}
${priorPromptBlock}
${strictSignal ? `CRITICAL RETRY: Opening MUST name a real signal from facts below (company, repo, or language). Never use a URL as a company.\n` : ""}
Tone: ${styleOpeningHint(style)}

Facts (use only these — do not invent):
- Role: ${pack.roleTitle}
- Signal rule: ${signalHint}
- Featured repo: ${repoHint}
- Company about: ${COMPANY.about}
- Email: ${COMPANY.careersEmail}
- Call length: ${COMPANY.interviewLength}
- Candidate login: ${enriched.developer.login}
- Name: ${enriched.developer.name || "n/a"}
- First name for greeting: ${firstNameHint}
- Profile company: ${companyPretty || "n/a"}
- Language: ${langPretty}
- Role blurb baseline: ${packBlurbPlain}
- Responsibilities baseline: ${pack.responsibilities.slice(0, 3).join("; ")}
- Tech baseline: ${packTechPlain}
- lookingFor[0] MUST be exactly: "${yearsLine}"
- whyUs baseline: ${pack.whyUs}

Return ONLY JSON:
{
  "layout": "short",
  "subject": "string",
  "greeting": "Hi, FirstName," or "Hello, FirstName," (or Hi,/Hello, if first name is none),
  "opening": "string",
  "roleBlurb": "string",
  "responsibilities": ["...","...","..."],
  "techFocus": ["Core: ...","...","..."],
  "lookingFor": ["${yearsLine}","...","..."],
  "offer": ["...","...","..."],
  "whyUs": "string",
  "closingLine": "string",
  "matchNotes": "string"
}

Rules:
- subject: ${followupMode ? `"Re: ${pack.roleTitle} at PivotalStacks" or a brief follow-up subject` : "4-8 words, specific (role + company OR repo OR stack)"}. Never "exciting opportunity".
- greeting: use First name when provided; never a GitHub username.
- opening: exactly 2 sentences. ${followupMode ? "Acknowledge prior note / keep it light." : "Who you are + role; then one real signal (never a URL as employer)."}${followupMode ? "\n- For follow-up you may leave roleBlurb/responsibilities/techFocus/lookingFor/offer as empty arrays/strings." : "\n- roleBlurb: 1-2 honest sentences about day-to-day ownership.\n- responsibilities: exactly 3 concrete bullets.\n- techFocus: 3-4 labeled lines; put their language in Core when it fits.\n- lookingFor: 3 bullets; first is the exact years line.\n- offer: 3 believable bullets (pay, remote, process/ownership)."}
- whyUs: 1 short sentence${followupMode ? " (or a polite close if last follow-up)" : " on what they would own"}.
- closingLine: one soft ask — resume + times (${COMPANY.careersEmail})${followupMode ? "; for last follow-up, make clear you will stop emailing" : ""}.
- No invented employers or repos.`
    : `Write the CONTENT fields for a recruiting email as JSON only.
No HTML, CSS, markdown fences, or a full email document.
The app will drop your fields into template "${hire.id}" (${hire.name}).

Write like a real person on a recruiting team - Faber at PivotalStacks Careers.
Natural email English. Use contractions where they feel natural (I'm, we're, I've).
Uneven sentence length is good. Perfect parallel bullet lists sound fake - vary how bullets start.

Primary goal: an engineer should believe this is a real role and feel respected.
Be specific about day-to-day work. Stay honest - do not oversell. Respect their time.
One personal signal is enough (${signalHint}). Flattery kills trust.
${priorPromptBlock}
${strictSignal ? `CRITICAL RETRY: Opening MUST include a concrete company, repo, or language signal from facts. No flattery.\n` : ""}
Tone for this message: ${styleOpeningHint(style)}

Facts you may use (do not invent more):
- Company: ${COMPANY.about}
- Process: ${COMPANY.process}
- Email: ${COMPANY.careersEmail}
- Candidate login: ${enriched.developer.login}
- Name: ${enriched.developer.name || "n/a"}
- First name for greeting: ${firstNameHint}
- Company on profile: ${companyPretty || "n/a"}
- Featured repo: ${repoHint}
- Language: ${langPretty}
- Bio clip: ${(enriched.developer.bio || "n/a").slice(0, 120)}
- Experience band: ${enriched.experience.band}
- ${signalHint}

Role: ${pack.roleTitle} (${pack.label})
lookingFor[0] MUST be exactly: "${yearsLine}"
layout MUST be: "${base.layoutId}"

Use this baseline as a starting point. Rewrite it so it sounds spoken by a human recruiter, not a template. Keep facts; change rhythm.
- roleBlurb: ${packBlurbPlain}
- responsibilities: ${pack.responsibilities.slice(0, 5).join("; ")}
- techFocus: ${packTechPlain}
- lookingFor (after years): ${pack.lookingFor.filter((l) => !/\byears?\b/i.test(l)).slice(0, 3).join("; ")}
- offer: ${pack.offer.slice(0, 4).join("; ")}
- whyUs: ${pack.whyUs}

Return ONLY JSON:
{
  "layout": "${base.layoutId}",
  "subject": "string",
  "greeting": "Hi, FirstName," or "Hello, FirstName," (or Hi,/Hello, if first name is none),
  "opening": "string",
  "roleBlurb": "string",
  "responsibilities": ["...","...","...","...","..."],
  "techFocus": ["Core: ...","...","...","..."],
  "lookingFor": ["${yearsLine}","...","...","..."],
  "offer": ["...","...","...","..."],
  "whyUs": "string",
  "closingLine": "string",
  "matchNotes": "string"
}

How to write each field (believable and good for the candidate):
- subject: specific, e.g. "${pack.roleTitle} at PivotalStacks" or mention company/repo/stack
- greeting: "Hi, FirstName," when a real first name is available; otherwise "Hi," or "Hello,". Never use a GitHub username.
- opening: 2 sentences. Name yourself, name the role, mention one real signal. Lead with substance, not flattery.
- roleBlurb: 1-2 honest sentences about day-to-day work. What they would own. No slogans.
- responsibilities: 5 concrete bullets. Mix lengths. Real work, not buzzwords. Do NOT start every bullet the same way.
- techFocus: 4 labeled lines; put their language in Core when it fits
- lookingFor: 4 bullets; first is the exact years line. Sound like a hiring bar, not a wishlist novel.
- offer: 4 short bullets a careful candidate would believe (pay, remote, first-call process, ownership)
- whyUs: one sentence from the candidate's point of view - why this role is worth their time
- closingLine: one or two sentences. Ask for resume + a few times for a ${COMPANY.interviewLength} call (${COMPANY.careersEmail}). Keep it low-pressure (a short no is fine / no cover letter needed). Include the real email.
- matchNotes: brief note on what you personalized

Good opening (trustworthy):
"I'm Faber with PivotalStacks Careers. We're hiring a ${pack.roleTitle}${companyPretty ? `, and your work at ${companyPretty} looked close to what the team needs` : enriched.developer.featured_repo ? `, and your work on ${enriched.developer.featured_repo} looked close to what the team needs` : langPretty ? `, and your ${langPretty} background looked close to what the team needs` : ""}."

Good closing:
"If this looks interesting, reply with your resume and 2-3 times for a ${COMPANY.interviewLength} call (${COMPANY.careersEmail}). If timing is off, a short no is fine."

Bad (machine / AI / untrustworthy):
"I came across your impressive profile and was excited by your passion for cutting-edge solutions. We believe you would be a strong fit for this exciting opportunity. Please find a clear overview below."

Never use: exciting, passionate, cutting-edge, leverage, synergy, delve, empower, unlock, thrilled, delighted, stood out, came across, strong fit, perfect fit, ideal candidate, shipping culture, game-changer, "Please find", "I've included a clear overview", world-class, rockstar, ninja.

Correct tech casing (Node.js, TypeScript, Ruby on Rails). No HTML. No invented employers or skills. Prefer concrete over impressive.`;

  const runMinimax = async () => {
    const result = await minimaxChatCompletion(
      [
        {
          role: "system",
          content:
            "You write recruiting outreach fields as JSON. Sound like a careful human recruiter: specific, honest, and respectful so a candidate will trust the email. Natural rhythm and contractions. Never sound like ChatGPT marketing copy. Never output HTML or markdown.",
        },
        { role: "user", content: buildPrompt(false) },
      ],
      {
        temperature: 0.35,
        // Short briefs need less completion budget → faster Minimax turns
        maxTokens: shortMode ? 1600 : 2800,
        timeoutMs: shortMode ? 12000 : 16000,
      }
    );
    if (!result) return null;
    const parsed = extractPersonalization(
      result.content,
      track,
      pack,
      enriched.experience
    );
    if (!parsed) {
      console.error(
        "Minimax returned unparseable personalization:",
        result.content.slice(0, 300)
      );
      return null;
    }
    return withExperience(
      applyHireTemplate(
        hire,
        buildPersonalizationFromTrack(
          enriched.developer,
          track,
          style,
          {
            ...parsed,
            layoutId: resolveContentType(parsed.layoutId),
          },
          enriched.experience,
          priorContext
        )
      ),
      { generatedBy: "minimax", aiModel: result.model }
    );
  };

  try {
    let msg = await runMinimax();
    if (!msg) {
      const fallback = withExperience(applyHireTemplate(hire, base), {
        generatedBy: "template",
      });
      return fallback.quality?.label === "Weak"
        ? strengthenWithTemplate(fallback)
        : fallback;
    }
    // No second Minimax round-trip — reinforce locally if quality is weak
    if (msg.quality?.label === "Weak") {
      msg = strengthenWithTemplate(msg, {
        generatedBy: msg.generatedBy || "minimax",
        aiModel: msg.aiModel,
      });
    }
    return msg;
  } catch (error) {
    console.error("Error generating Minimax message:", error);
    const fallback = withExperience(applyHireTemplate(hire, base), {
      generatedBy: "template",
    });
    return fallback.quality?.label === "Weak"
      ? strengthenWithTemplate(fallback)
      : fallback;
  }
}

/** Rebuild HTML after edits while keeping matched track sections */
export function rebuildHireHtml(
  greeting: string,
  opening: string,
  subject?: string,
  extras?: Partial<GeneratedMessage> & {
    track?: DevTrack;
    style?: MessageStyle;
    templateId?: string;
    layoutId?: EmailLayoutId;
  }
): GeneratedMessage {
  const track = normalizeTrack(extras?.track) || "fullstack";
  const style = normalizeStyle(extras?.style);
  const hire = loadHireTemplate(
    extras?.templateId,
    extras?.roleTitle || extras?.track || "candidate",
    { compact: isCompactStyle(style) }
  );
  const pack = packFromTrack(track);
  const layoutId = resolveContentType(extras?.layoutId);

  const rebuilt = applyHireTemplate(
    hire,
    buildPersonalizationFromTrack(
      { login: extras?.layoutId || "candidate" },
      track,
      style,
      {
        greeting: normalizeGreeting(greeting),
        opening,
        subject: subject || pack.subject,
        roleTitle: extras?.roleTitle || pack.roleTitle,
        roleBlurb: extras?.roleBlurb || pack.roleBlurb,
        responsibilitiesHtml:
          extras?.responsibilitiesHtml || bulletsToHtml(pack.responsibilities),
        techStackHtml:
          extras?.techStackHtml || linesToStackHtml(pack.techLines),
        lookingForHtml:
          extras?.lookingForHtml || bulletsToHtml(pack.lookingFor),
        offerHtml: extras?.offerHtml || bulletsToHtml(pack.offer),
        whyUs: extras?.whyUs || pack.whyUs,
        closingLine: extras?.closingLine,
        processNote: extras?.processNote || COMPANY.process,
        companyNote: extras?.companyNote || COMPANY.about,
        trackLabel: extras?.trackLabel || pack.label,
        styleLabel: extras?.styleLabel || styleLabel(style),
        matchNotes: extras?.matchNotes,
        layoutId,
      }
    )
  );

  const quality = assessMessageQuality({
    subject: rebuilt.subject,
    greeting: rebuilt.greeting,
    opening: rebuilt.opening,
    bodyText: htmlToPlainApprox(rebuilt.body),
    whyUs: rebuilt.whyUs,
    closingLine: rebuilt.closingLine,
    style,
    hasFirstNameGreeting: /Hi,\s+\w|Hello,\s+\w/.test(rebuilt.greeting || ""),
  });

  return { ...rebuilt, quality, priorSendAt: extras?.priorSendAt ?? null };
}
