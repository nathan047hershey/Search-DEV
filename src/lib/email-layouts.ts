import { pickCta } from "./company-voice";

/**
 * Content body types (structure of the message).
 * Only ACTIVE types are used in generation — add a new id to
 * ACTIVE_CONTENT_TYPE_IDS when you introduce a clearly different shape.
 */

export const EMAIL_LAYOUT_IDS = [
  "classic",
  "letter",
  "brief",
  "pitch",
  "checklist",
  "invite",
  "timeline",
  "split",
  "spotlight",
  "short",
] as const;

export type EmailLayoutId = (typeof EMAIL_LAYOUT_IDS)[number];

/**
 * Shipped content types. Right now: short first-touch only.
 * To add another type: append its id here and wire renderer + generator.
 */
export const ACTIVE_CONTENT_TYPE_IDS = ["short"] as const;
export type ActiveContentTypeId = (typeof ACTIVE_CONTENT_TYPE_IDS)[number];

export const DEFAULT_CONTENT_TYPE: ActiveContentTypeId = "short";

export interface LayoutContent {
  greeting: string;
  openingHtml: string;
  roleTitle: string;
  roleBlurb: string;
  trackLabel: string;
  styleLabel: string;
  responsibilities: string[];
  techFocus: string[];
  lookingFor: string[];
  offer: string[];
  whyUs: string;
  closingLine?: string;
  processNote?: string;
  companyNote?: string;
}

function escapeHtml(text: string): string {
  return String(text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function p(html: string, margin = "0 0 14px"): string {
  return `<p style="margin:${margin};">${html}</p>`;
}

function strongLabel(label: string): string {
  return `<p style="margin:14px 0 6px;"><strong>${escapeHtml(label)}</strong></p>`;
}

function bullets(items: string[]): string {
  const rows = items
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .map(
      (item) =>
        `<tr><td style="padding:0 0 8px;font-size:14px;">• ${escapeHtml(item)}</td></tr>`
    )
    .join("");
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0;">${rows}</table>`;
}

function plainTechLine(lines: string[]): string {
  return lines
    .map((line) =>
      String(line || "")
        .replace(/<[^>]+>/g, "")
        .replace(/&amp;/gi, "&")
        .replace(/&lt;/gi, "<")
        .replace(/&gt;/gi, ">")
        .replace(/&quot;/gi, '"')
        .replace(/\s+/g, " ")
        .trim()
    )
    .filter(Boolean)
    .join(" · ");
}

export function isEmailLayoutId(value: unknown): value is EmailLayoutId {
  return (
    typeof value === "string" &&
    (EMAIL_LAYOUT_IDS as readonly string[]).includes(value)
  );
}

export function isActiveContentType(
  value: unknown
): value is ActiveContentTypeId {
  return (
    typeof value === "string" &&
    (ACTIVE_CONTENT_TYPE_IDS as readonly string[]).includes(value)
  );
}

/** Resolve to an active content type (defaults to short). */
export function resolveContentType(
  preferred?: string | null
): ActiveContentTypeId {
  if (isActiveContentType(preferred)) return preferred;
  return DEFAULT_CONTENT_TYPE;
}

/**
 * Content type for a message. Inactive legacy layouts are ignored so every
 * send shares one structure until you activate more types.
 */
export function pickEmailLayout(
  _seed: string,
  preferred?: string | null
): EmailLayoutId {
  return resolveContentType(preferred);
}

export function ctaForLayout(
  layout: EmailLayoutId,
  seed: string,
  roleTitle = "role",
  closingLine?: string
): string {
  const custom = String(closingLine || "").trim();
  if (custom.length >= 40 && custom.length <= 360) return custom;
  return pickCta(roleTitle, `${layout}:${seed}`);
}

export function layoutLabel(layout: EmailLayoutId): string {
  const labels: Record<EmailLayoutId, string> = {
    classic: "Sectioned overview",
    letter: "Prose letter",
    brief: "Short note",
    pitch: "Opportunity pitch",
    checklist: "Checklist",
    invite: "Invitation",
    timeline: "Numbered timeline",
    split: "Split role / fit",
    spotlight: "Spotlight blurb",
    short: "Short first-touch",
  };
  return labels[layout];
}

/** Parse • bullets from previously rendered hire HTML. */
export function htmlBulletsToLines(html: string): string[] {
  if (!html) return [];
  const matches = [...String(html).matchAll(/•\s*([^<]+)/g)];
  return matches
    .map((m) =>
      m[1]
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/\s+/g, " ")
        .trim()
    )
    .filter((line) => line.length >= 4);
}

/** Parse tech focus lines from stack HTML (strong labels or plain text). */
export function htmlTechToLines(html: string): string[] {
  if (!html) return [];
  const fromPs = [...String(html).matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)].map((m) =>
    m[1]
      .replace(/<[^>]+>/g, "")
      .replace(/&amp;/gi, "&")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/\s+/g, " ")
      .trim()
  );
  const cleaned = fromPs.filter(Boolean);
  if (cleaned.length) return cleaned;
  return String(html)
    .replace(/<[^>]+>/g, "\n")
    .split(/\n+/)
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter((l) => l.length >= 4);
}

function techParagraphs(lines: string[]): string {
  return lines
    .map((line) =>
      String(line || "")
        .replace(/<\/?strong>/gi, "")
        .replace(/&amp;/gi, "&")
        .replace(/\s+/g, " ")
        .trim()
    )
    .filter(Boolean)
    .map((plain, i, arr) => {
      const m = plain.match(/^([^:]{2,48}):\s*(.+)$/);
      const html = m
        ? `<strong>${escapeHtml(m[1])}:</strong> ${escapeHtml(m[2])}`
        : escapeHtml(plain);
      return `<p style="margin:${i === arr.length - 1 ? "0" : "0 0 8px"};font-size:14px;">${html}</p>`;
    })
    .join("");
}

function renderClassic(c: LayoutContent, cta: string): string {
  return [
    p(escapeHtml(c.greeting), "0 0 12px"),
    p(c.openingHtml, "0 0 16px"),
    p(
      `<strong>${escapeHtml(c.roleTitle)}</strong> · ${escapeHtml(c.trackLabel)}`,
      "0 0 8px"
    ),
    p(c.roleBlurb, "0 0 16px"),
    strongLabel("Responsibilities"),
    bullets(c.responsibilities.slice(0, 6)),
    strongLabel("Technical focus"),
    techParagraphs(c.techFocus),
    strongLabel("What we look for"),
    bullets(c.lookingFor.slice(0, 6)),
    strongLabel("What we offer"),
    bullets(c.offer.slice(0, 6)),
    c.companyNote
      ? p(`<strong>About PivotalStacks.</strong> ${escapeHtml(c.companyNote)}`, "14px 0 12px")
      : "",
    p(escapeHtml(c.whyUs), "0 0 12px"),
    c.processNote
      ? p(`<strong>Hiring process.</strong> ${escapeHtml(c.processNote)}`, "0 0 14px")
      : "",
    p(escapeHtml(cta), "0 0 16px"),
  ]
    .filter(Boolean)
    .join("\n");
}

function renderLetter(c: LayoutContent, cta: string): string {
  const highlights = [
    ...c.responsibilities.slice(0, 3),
    ...c.lookingFor.slice(0, 2),
  ].filter(Boolean);
  return [
    p(escapeHtml(c.greeting), "0 0 12px"),
    p(c.openingHtml, "0 0 14px"),
    p(c.roleBlurb, "0 0 14px"),
    p(escapeHtml(c.whyUs), "0 0 14px"),
    p(
      `<strong>Key points — ${escapeHtml(c.roleTitle)}</strong>`,
      "0 0 8px"
    ),
    bullets(highlights.slice(0, 5)),
    strongLabel("What we offer"),
    bullets(c.offer.slice(0, 4)),
    c.processNote
      ? p(escapeHtml(c.processNote), "12px 0 14px")
      : "",
    p(escapeHtml(cta), "0 0 16px"),
  ]
    .filter(Boolean)
    .join("\n");
}

function renderBrief(c: LayoutContent, cta: string): string {
  const highlights = [
    ...c.responsibilities.slice(0, 3),
    c.lookingFor[0],
    c.lookingFor[1],
  ].filter(Boolean);
  const stack = plainTechLine(c.techFocus);
  return [
    p(escapeHtml(c.greeting), "0 0 12px"),
    p(c.openingHtml, "0 0 14px"),
    p(`<strong>${escapeHtml(c.roleTitle)}</strong> · ${escapeHtml(c.trackLabel)}`, "0 0 10px"),
    p(c.roleBlurb, "0 0 12px"),
    bullets(highlights.slice(0, 5)),
    stack ? p(escapeHtml(`Stack: ${stack}`), "12px 0 10px") : "",
    strongLabel("What we offer"),
    bullets(c.offer.slice(0, 4)),
    p(escapeHtml(c.whyUs), "12px 0 12px"),
    p(escapeHtml(cta), "0 0 16px"),
  ]
    .filter(Boolean)
    .join("\n");
}

function renderPitch(c: LayoutContent, cta: string): string {
  const fitExtra = c.lookingFor[0] ? ` ${c.lookingFor[0]}.` : "";
  const stack = plainTechLine(c.techFocus);
  return [
    p(escapeHtml(c.greeting), "0 0 12px"),
    p(c.openingHtml, "0 0 14px"),
    p(`<strong>Role summary.</strong> ${c.roleBlurb}`, "0 0 14px"),
    p(
      `<strong>Why we contacted you.</strong> ${escapeHtml(c.whyUs)}${escapeHtml(fitExtra)}`,
      "0 0 14px"
    ),
    p("<strong>Main responsibilities</strong>", "0 0 6px"),
    bullets(c.responsibilities.slice(0, 4)),
    stack ? p(escapeHtml(`Stack: ${stack}`), "12px 0 10px") : "",
    strongLabel("What we offer"),
    bullets(c.offer.slice(0, 4)),
    c.processNote
      ? p(`<strong>Process.</strong> ${escapeHtml(c.processNote)}`, "12px 0 12px")
      : "",
    p(escapeHtml(cta), "0 0 16px"),
  ]
    .filter(Boolean)
    .join("\n");
}

function renderChecklist(c: LayoutContent, cta: string): string {
  const mixed = [
    ...c.responsibilities.slice(0, 4),
    ...c.lookingFor.slice(0, 3),
  ];
  return [
    p(escapeHtml(c.greeting), "0 0 12px"),
    p(c.openingHtml, "0 0 14px"),
    p(c.roleBlurb, "0 0 12px"),
    bullets(mixed.slice(0, 7)),
    techParagraphs(c.techFocus.slice(0, 3)),
    p(escapeHtml(c.whyUs), "12px 0 10px"),
    strongLabel("What we offer"),
    bullets(c.offer.slice(0, 4)),
    p(escapeHtml(cta), "12px 0 16px"),
  ].join("\n");
}

function renderInvite(c: LayoutContent, cta: string): string {
  return [
    p(escapeHtml(c.greeting), "0 0 12px"),
    p(c.openingHtml, "0 0 14px"),
    p(
      `We are hiring for a <strong>${escapeHtml(c.roleTitle)}</strong> (${escapeHtml(c.trackLabel)}) and wanted to share the brief.`,
      "0 0 12px"
    ),
    p(c.roleBlurb, "0 0 12px"),
    p("<strong>Responsibilities</strong>", "0 0 6px"),
    bullets(c.responsibilities.slice(0, 5)),
    p("<strong>Technical focus</strong>", "12px 0 6px"),
    techParagraphs(c.techFocus),
    p("<strong>Requirements</strong>", "12px 0 6px"),
    bullets(c.lookingFor.slice(0, 4)),
    strongLabel("What we offer"),
    bullets(c.offer.slice(0, 4)),
    p(escapeHtml(c.whyUs), "12px 0 10px"),
    c.processNote
      ? p(escapeHtml(c.processNote), "0 0 12px")
      : "",
    p(escapeHtml(cta), "0 0 16px"),
  ]
    .filter(Boolean)
    .join("\n");
}

function renderTimeline(c: LayoutContent, cta: string): string {
  const step = (n: number, title: string, body: string) =>
    [
      p(
        `<strong style="color:inherit;">${n}. ${escapeHtml(title)}</strong>`,
        "0 0 6px"
      ),
      body,
    ].join("\n");

  return [
    p(escapeHtml(c.greeting), "0 0 12px"),
    step(1, "Introduction", p(c.openingHtml, "0 0 14px")),
    step(
      2,
      "Role",
      [
        p(
          `<strong>${escapeHtml(c.roleTitle)}</strong> · ${escapeHtml(c.trackLabel)}`,
          "0 0 8px"
        ),
        p(c.roleBlurb, "0 0 14px"),
      ].join("\n")
    ),
    step(3, "Responsibilities", bullets(c.responsibilities.slice(0, 5))),
    step(4, "Technical focus", techParagraphs(c.techFocus.slice(0, 3))),
    step(5, "Offer", bullets(c.offer.slice(0, 4))),
    p(escapeHtml(c.whyUs), "14px 0 10px"),
    p(escapeHtml(cta), "0 0 16px"),
  ].join("\n");
}

function renderSplit(c: LayoutContent, cta: string): string {
  return [
    p(escapeHtml(c.greeting), "0 0 12px"),
    p(c.openingHtml, "0 0 16px"),
    `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 16px;">
<tr>
<td width="50%" valign="top" style="padding:0 10px 0 0;font-size:14px;line-height:1.55;">
<p style="margin:0 0 6px;"><strong>Role</strong></p>
<p style="margin:0 0 8px;"><strong>${escapeHtml(c.roleTitle)}</strong></p>
<p style="margin:0;">${c.roleBlurb}</p>
</td>
<td width="50%" valign="top" style="padding:0 0 0 10px;font-size:14px;line-height:1.55;border-left:1px solid #cbd5e1;">
<p style="margin:0 0 6px;"><strong>Background</strong></p>
<p style="margin:0 0 8px;">${escapeHtml(c.trackLabel)} · ${escapeHtml(c.styleLabel)}</p>
<p style="margin:0;">${escapeHtml(c.whyUs)}</p>
</td>
</tr>
</table>`,
    strongLabel("Responsibilities"),
    bullets(c.responsibilities.slice(0, 4)),
    strongLabel("Requirements"),
    bullets(c.lookingFor.slice(0, 4)),
    strongLabel("What we offer"),
    bullets(c.offer.slice(0, 4)),
    p(escapeHtml(cta), "14px 0 16px"),
  ].join("\n");
}

function renderSpotlight(c: LayoutContent, cta: string): string {
  return [
    p(escapeHtml(c.greeting), "0 0 12px"),
    p(c.openingHtml, "0 0 16px"),
    `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 16px;">
<tr><td style="padding:14px 16px;border-left:4px solid #0f766e;font-size:15px;line-height:1.65;">
${c.roleBlurb}
</td></tr></table>`,
    p(
      `<strong>${escapeHtml(c.roleTitle)}</strong> · ${escapeHtml(c.trackLabel)}`,
      "0 0 10px"
    ),
    p("<strong>Responsibilities</strong>", "0 0 6px"),
    bullets(c.responsibilities.slice(0, 4)),
    p(
      `<strong>Stack:</strong> ${escapeHtml(plainTechLine(c.techFocus))}`,
      "12px 0 10px"
    ),
    strongLabel("What we offer"),
    bullets(c.offer.slice(0, 4)),
    p(escapeHtml(c.whyUs), "12px 0 10px"),
    p(escapeHtml(cta), "0 0 16px"),
  ].join("\n");
}

function renderShort(c: LayoutContent, cta: string): string {
  const roleBlurbPlain = String(c.roleBlurb || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
  const stackLine = plainTechLine(c.techFocus || []).slice(0, 220);
  const duties = (c.responsibilities || []).slice(0, 3);
  const bar = (c.lookingFor || []).slice(0, 3);
  const offers = (c.offer || []).slice(0, 3);
  const isLean = !roleBlurbPlain && duties.length === 0;

  if (isLean) {
    return [
      p(escapeHtml(c.greeting), "0 0 12px"),
      p(c.openingHtml, "0 0 14px"),
      c.whyUs ? p(escapeHtml(c.whyUs), "0 0 12px") : "",
      offers.length
        ? [
            p("<strong>Quick context</strong>", "0 0 6px"),
            bullets(offers.slice(0, 2)),
          ].join("\n")
        : "",
      p(escapeHtml(cta), "12px 0 16px"),
    ]
      .filter(Boolean)
      .join("\n");
  }

  return [
    p(escapeHtml(c.greeting), "0 0 12px"),
    p(c.openingHtml, "0 0 14px"),
    p(
      `<strong>${escapeHtml(c.roleTitle)}</strong> · ${escapeHtml(c.trackLabel)}`,
      "0 0 8px"
    ),
    roleBlurbPlain ? p(escapeHtml(roleBlurbPlain), "0 0 12px") : "",
    duties.length
      ? [p("<strong>Day-to-day</strong>", "0 0 6px"), bullets(duties)].join("\n")
      : "",
    stackLine
      ? p(`<strong>Stack:</strong> ${escapeHtml(stackLine)}`, "12px 0 10px")
      : "",
    bar.length
      ? [
          p("<strong>What we're looking for</strong>", "0 0 6px"),
          bullets(bar),
        ].join("\n")
      : "",
    c.whyUs ? p(escapeHtml(c.whyUs), "12px 0 10px") : "",
    offers.length
      ? [p("<strong>What we offer</strong>", "0 0 6px"), bullets(offers)].join(
          "\n"
        )
      : "",
    p(escapeHtml(cta), "12px 0 16px"),
  ]
    .filter(Boolean)
    .join("\n");
}

export function renderLayoutBody(
  layout: EmailLayoutId,
  content: LayoutContent,
  seed = "candidate"
): string {
  const cta = ctaForLayout(
    layout,
    seed,
    content.roleTitle,
    content.closingLine
  );
  switch (layout) {
    case "letter":
      return renderLetter(content, cta);
    case "brief":
      return renderBrief(content, cta);
    case "pitch":
      return renderPitch(content, cta);
    case "checklist":
      return renderChecklist(content, cta);
    case "invite":
      return renderInvite(content, cta);
    case "timeline":
      return renderTimeline(content, cta);
    case "split":
      return renderSplit(content, cta);
    case "spotlight":
      return renderSpotlight(content, cta);
    case "short":
      return renderShort(content, cta);
    case "classic":
    default:
      return renderClassic(content, cta);
  }
}

/** Full outlook-safe document when the shell is minimal. */
export function renderOutlookDocument(
  layout: EmailLayoutId,
  content: LayoutContent,
  seed = "candidate"
): string {
  const body = renderLayoutBody(layout, content, seed);
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>${escapeHtml(content.roleTitle)}</title></head>
<body style="margin:0;padding:16px;background:#ffffff;font-family:Arial,Helvetica,sans-serif;color:#222222;font-size:15px;line-height:1.6;">
${body}
<p style="margin:0 0 2px;">Best regards,</p>
<p style="margin:0 0 2px;"><strong>Faber Ceron</strong></p>
<p style="margin:0 0 16px;color:#555555;">HR Recruiter · PivotalStacks</p>
<p style="margin:0;font-size:12px;color:#777777;">PivotalStacks · https://pivotalstacks.com · Tone: ${escapeHtml(content.styleLabel)}<br/>Reply “unsubscribe” if you prefer not to receive recruiting notes from us.</p>
</body></html>`;
}
