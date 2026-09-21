/**
 * Shared PivotalStacks company voice for hire outreach.
 * Goal: a candidate should believe this is a real role and feel respected.
 */

export const COMPANY = {
  name: "PivotalStacks",
  careersEmail: "careers@pivotalstacks.com",
  site: "https://pivotalstacks.com",
  about:
    "PivotalStacks builds product platforms and developer tooling that teams run in production.",
  process:
    "First step is a short intro with me (Faber). If it looks like a fit, you talk with the hiring engineer next. We aim to reply within a few business days either way.",
  interviewLength: "15-20 minutes",
} as const;

/** Offer lines candidates can believe - concrete, not brochure fluff. */
export const OFFER_POOL = [
  "Pay set to experience, location, and current market rates",
  "Remote-first; hybrid if you and the team prefer it",
  "First call includes recruiting and the hiring engineer",
  "Own real services end to end - not only ticket queues",
  "Day-to-day stack: AWS, containers, and CI/CD",
  "Mostly async; we keep meetings light when we can",
  "Flexible hours, with a shared overlap window for pairing",
  "Room to weigh in on architecture, not only implement tickets",
  "Learning budget for courses and conferences",
  "Small teams, so your decisions show up in production fast",
  "A named buddy for the first weeks of onboarding",
  "Written goals for the first 30/60/90 days - no mystery onboarding",
  "Equipment stipend and a quiet home-office setup stipend where needed",
  "PTO that people actually take; we plan coverage in advance",
  "You talk to the people you'd work with before any offer",
];

export const LOOKING_SOFT_SKILLS = [
  "Comfortable writing in English for async work (C1+ is ideal)",
  "Can own work remotely without needing constant check-ins",
];

function hashSeed(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

export function pickOfferBullets(seed = "default", count = 4): string[] {
  const core = OFFER_POOL.slice(0, 2);
  const rest = OFFER_POOL.slice(2);
  const h = hashSeed(seed);
  const rotated = [...rest];
  for (let i = rotated.length - 1; i > 0; i--) {
    const j = (h + i * 17) % (i + 1);
    [rotated[i], rotated[j]] = [rotated[j], rotated[i]];
  }
  return [...core, ...rotated].slice(
    0,
    Math.max(3, Math.min(count, OFFER_POOL.length))
  );
}

export function enrichWhyUs(trackWhy: string, _seed = "default"): string {
  const base = String(trackWhy || "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\.$/, "");
  if (base) return `${base}.`;
  return "You'll get clear scope, a short first call, and a straight answer on next steps.";
}

export function companyIntroSentence(roleTitle: string): string {
  return `I'm Faber with ${COMPANY.name} Careers. We're hiring a ${roleTitle}.`;
}

/** Openings that feel like a real recruiter, not a blast. */
export const INTRO_POOL = [
  (role: string) =>
    `I'm Faber with ${COMPANY.name} Careers. We're hiring a ${role} and I thought this might be worth a look.`,
  (role: string) =>
    `Quick note from Faber (${COMPANY.name} Careers) about our ${role} opening - happy to keep this short.`,
  (role: string) =>
    `I'm writing from ${COMPANY.name} Careers about a ${role} role we're actively filling.`,
  (role: string) =>
    `Hope you're well. I'm Faber from ${COMPANY.name} Careers. We have a ${role} opening I'd like to share.`,
  (role: string) =>
    `${COMPANY.name} is hiring a ${role}. I'm Faber on the careers team - details below if useful.`,
  (role: string) =>
    `Faber here from ${COMPANY.name} Careers. Open ${role} role on a product team - sharing the brief in case the fit is close.`,
  (role: string) =>
    `I'm Faber (Careers at ${COMPANY.name}). Saw a possible match for our ${role} search and wanted to send a clear note.`,
  (role: string) =>
    `Short note: ${COMPANY.name} is hiring a ${role}. I'm Faber - happy to keep the first step light.`,
];

export function pickIntro(roleTitle: string, seed = "default"): string {
  const fn = INTRO_POOL[hashSeed(seed) % INTRO_POOL.length];
  return fn(roleTitle);
}

export const SUBJECT_POOL = [
  (role: string) => `${role} at PivotalStacks`,
  (role: string) => `${role} - quick note`,
  (role: string) => `PivotalStacks ${role}`,
  (role: string) => `Open to a brief chat about ${role}?`,
  (role: string) => `${role} role - worth a look?`,
  (role: string) => `${role} · hiring now`,
  (role: string) => `From Faber · ${role}`,
  (role: string) => `${role} - clear brief inside`,
  (role: string) => `Possible fit: ${role}`,
  (role: string) => `${role} at PivotalStacks (short note)`,
];

export function pickSubject(roleTitle: string, seed = "default"): string {
  const fn = SUBJECT_POOL[hashSeed(seed + ":subj") % SUBJECT_POOL.length];
  return fn(roleTitle);
}

/** Engineer-friendly subject when we have a stack/company/repo signal. */
export function pickPersonalizedSubject(
  roleTitle: string,
  seed = "default",
  signal?: { language?: string; company?: string; repo?: string }
): string {
  const lang = String(signal?.language || "").trim();
  const company = String(signal?.company || "")
    .replace(/^@/, "")
    .trim();
  const repo = String(signal?.repo || "").trim();
  const options: string[] = [];
  if (repo) {
    options.push(`${roleTitle} - saw your ${repo} work`);
    options.push(`Your ${repo} work / ${roleTitle}`);
    options.push(`${repo} → ${roleTitle}?`);
  }
  if (company) {
    options.push(`${roleTitle} - your work at ${company}`);
    options.push(`${company} → ${roleTitle} at PivotalStacks`);
    options.push(`From ${company} background → ${roleTitle}`);
  }
  if (lang) {
    options.push(`${lang} / ${roleTitle} at PivotalStacks`);
    options.push(`${roleTitle} (${lang})`);
    options.push(`${lang} engineer · ${roleTitle}`);
  }
  if (!options.length) return pickSubject(roleTitle, seed);
  return options[hashSeed(seed + ":psubj") % options.length];
}

/** Low-pressure CTAs: clear ask, real email, easy out. Keep short. */
export const CTA_POOL = [
  (role: string) =>
    `If the ${role} role looks interesting, reply with your resume and 2–3 times for a ${COMPANY.interviewLength} call (${COMPANY.careersEmail}). A short no is fine.`,
  (role: string) =>
    `Want a quick walkthrough of the ${role} scope? Send resume + a few times to ${COMPANY.careersEmail} (${COMPANY.interviewLength}, me + hiring engineer).`,
  (role: string) =>
    `Curious enough for a first chat? Resume and 2–3 slots to ${COMPANY.careersEmail} is enough — ${COMPANY.interviewLength}.`,
  (role: string) =>
    `Reply here or ${COMPANY.careersEmail} with your resume if you want to discuss the ${role} role. No cover letter needed.`,
  (role: string) =>
    `Worth ${COMPANY.interviewLength}? Send your resume and 2–3 times that work to ${COMPANY.careersEmail}.`,
  (role: string) =>
    `If timing works, email ${COMPANY.careersEmail} with a resume and availability. Happy to keep the first ${role} call to ${COMPANY.interviewLength}.`,
  (role: string) =>
    `Interested in the ${role} opening? One reply with resume + times to ${COMPANY.careersEmail} starts it. Easy out if not.`,
  (role: string) =>
    `Next step if useful: resume → ${COMPANY.careersEmail}, then a ${COMPANY.interviewLength} intro. Skip if this isn't relevant.`,
];

export function pickCta(roleTitle: string, seed = "default"): string {
  const fn = CTA_POOL[hashSeed(seed) % CTA_POOL.length];
  return fn(roleTitle);
}

export const FOLLOWUP_CTA_POOL = [
  (role: string) =>
    `Still open to a ${COMPANY.interviewLength} chat about the ${role} role? Resume + 2 times to ${COMPANY.careersEmail}.`,
  (role: string) =>
    `If useful, send a resume and a couple of times to ${COMPANY.careersEmail} — first call stays ${COMPANY.interviewLength}.`,
  (role: string) =>
    `Either way works. If yes, resume + times to ${COMPANY.careersEmail} is enough.`,
  (role: string) =>
    `One more soft ask: ${COMPANY.careersEmail} with resume and availability if the ${role} still looks relevant.`,
  (role: string) =>
    `Happy to leave it here. If you want the ${role} chat, reply with times (${COMPANY.careersEmail}).`,
];

export function pickFollowupCta(roleTitle: string, seed = "default"): string {
  const fn = FOLLOWUP_CTA_POOL[hashSeed(seed + ":fu") % FOLLOWUP_CTA_POOL.length];
  return fn(roleTitle);
}

export function pickFollowupSubject(roleTitle: string, seed = "default"): string {
  const options = [
    `Re: ${roleTitle} at PivotalStacks`,
    `${roleTitle} - following up briefly`,
    `Quick follow-up on the ${roleTitle} role`,
    `Still hiring · ${roleTitle}`,
    `Checking in · ${roleTitle}`,
    `Re: ${roleTitle} (short bump)`,
  ];
  return options[hashSeed(seed + ":fusubj") % options.length];
}

/** Templates that read as serious recruiting mail (used by Auto). */
export const PROFESSIONAL_TEMPLATE_IDS = [
  "outlook-safe",
  "executive",
  "personal-letter",
  "memo",
  "left-rail",
  "product-sheet",
  "split-banner",
  "footer-title",
  "wide-report",
  "two-column",
  "quote-frame",
  "cta-first",
  "card-stack",
  "sequential-blocks",
  "badge-header",
  "center-hero",
  "quiet-note",
  "hire-brief",
  "inbox-clean",
  "simple-serif",
] as const;

/** Quiet chrome for short / follow-up — no giant title + big CTA button. */
export const SHORT_FRIENDLY_TEMPLATE_IDS = [
  "outlook-safe",
  "personal-letter",
  "compact-threads",
  "executive",
  "quiet-note",
  "hire-brief",
  "inbox-clean",
  "simple-serif",
] as const;
