import dns from "dns/promises";
import * as emailValidator from "email-validator";

const EMAIL_RE =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

/** Major providers — always treated as deliverable if format is valid */
const KNOWN_MAIL_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "yahoo.com",
  "yahoo.co.uk",
  "yahoo.ca",
  "yahoo.fr",
  "ymail.com",
  "rocketmail.com",
  "outlook.com",
  "hotmail.com",
  "live.com",
  "msn.com",
  "icloud.com",
  "me.com",
  "mac.com",
  "aol.com",
  "proton.me",
  "protonmail.com",
  "zoho.com",
  "gmx.com",
  "gmx.net",
  "mail.com",
  "fastmail.com",
]);

const DISPOSABLE = new Set([
  "mailinator.com",
  "guerrillamail.com",
  "10minutemail.com",
  "tempmail.com",
  "temp-mail.org",
  "yopmail.com",
  "trashmail.com",
  "sharklasers.com",
  "discard.email",
  "getnada.com",
  "mailnesia.com",
  "maildrop.cc",
  "throwaway.email",
  "fakeinbox.com",
]);

const ROLE_LOCALS = new Set([
  "noreply",
  "no-reply",
  "donotreply",
  "do-not-reply",
  "mailer-daemon",
  "postmaster",
  "abuse",
]);

const TYPO_HINTS: Record<string, string> = {
  "gmial.com": "gmail.com",
  "gmal.com": "gmail.com",
  "gamil.com": "gmail.com",
  "gnail.com": "gmail.com",
  "gmail.co": "gmail.com",
  "hotmial.com": "hotmail.com",
  "hotmal.com": "hotmail.com",
  "hotmail.co": "hotmail.com",
  "outlok.com": "outlook.com",
  "outllok.com": "outlook.com",
  "outlook.co": "outlook.com",
  "yahooo.com": "yahoo.com",
  "yaho.com": "yahoo.com",
  "icloud.co": "icloud.com",
};

const SPAMMY_SUBJECT =
  /\b(free|winner|act now|limited time|matched to your profile|guaranteed|congrats)\b/i;

/** Public resolvers — local/VPN DNS often returns empty MX or fake IPs */
function publicResolver() {
  const resolver = new dns.Resolver();
  resolver.setServers(["1.1.1.1", "8.8.8.8", "9.9.9.9"]);
  return resolver;
}

export interface EmailValidationResult {
  email: string;
  valid: boolean;
  formatOk: boolean;
  mxOk: boolean | null;
  disposable: boolean;
  roleAddress: boolean;
  suggestion: string | null;
  errors: string[];
  warnings: string[];
}

export function normalizeEmail(value: string): string {
  return String(value || "").trim().toLowerCase();
}

export function isValidEmailFormat(email: string): boolean {
  const value = normalizeEmail(email);
  if (!value || value.length > 254) return false;
  if (value.includes("..")) return false;
  if (!EMAIL_RE.test(value)) return false;
  if (!emailValidator.validate(value)) return false;
  const [local, domain] = value.split("@");
  if (!local || !domain) return false;
  if (local.length > 64) return false;
  if (domain.startsWith("-") || domain.endsWith("-")) return false;
  if (!domain.includes(".")) return false;
  return true;
}

export function suggestEmailCorrection(email: string): string | null {
  const value = normalizeEmail(email);
  const at = value.lastIndexOf("@");
  if (at < 0) return null;
  const local = value.slice(0, at);
  const domain = value.slice(at + 1);
  const fixed = TYPO_HINTS[domain];
  return fixed ? `${local}@${fixed}` : null;
}

export function isDisposableEmail(email: string): boolean {
  const value = normalizeEmail(email);
  const domain = value.split("@")[1] || "";
  return DISPOSABLE.has(domain);
}

export function isRoleAddress(email: string): boolean {
  const local = normalizeEmail(email).split("@")[0] || "";
  return ROLE_LOCALS.has(local);
}

export function isKnownMailDomain(domain: string): boolean {
  return KNOWN_MAIL_DOMAINS.has(String(domain || "").toLowerCase());
}

export async function domainHasMx(domain: string): Promise<boolean> {
  const host = String(domain || "").toLowerCase().trim();
  if (!host) return false;

  // Bypass flaky local/VPN DNS for major inbox providers
  if (isKnownMailDomain(host)) return true;

  const resolver = publicResolver();

  try {
    const records = await resolver.resolveMx(host);
    if (Array.isArray(records) && records.length > 0) return true;
  } catch {
    // try A/AAAA next
  }

  try {
    const a = await resolver.resolve4(host);
    if (Array.isArray(a) && a.length > 0) return true;
  } catch {
    // continue
  }

  try {
    const aaaa = await resolver.resolve6(host);
    if (Array.isArray(aaaa) && aaaa.length > 0) return true;
  } catch {
    // continue
  }

  return false;
}

export function sanitizeSubject(subject: string): string {
  let next = String(subject || "")
    .replace(/[\r\n]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!next) {
    next = "Engineering role at PivotalStacks";
  }

  // Soften common spammy recruiting phrases
  next = next
    .replace(/\bmatched to your profile\b/gi, "at PivotalStacks")
    .replace(/!{2,}/g, "!")
    .replace(/\$+/g, "");

  if (SPAMMY_SUBJECT.test(next)) {
    next = next.replace(SPAMMY_SUBJECT, "").replace(/\s{2,}/g, " ").trim();
  }

  if (next.length > 120) next = `${next.slice(0, 117)}...`;
  return next || "Engineering role at PivotalStacks";
}

export async function validateRecipientEmail(
  raw: string,
  options: { checkMx?: boolean } = {}
): Promise<EmailValidationResult> {
  const email = normalizeEmail(raw);
  const errors: string[] = [];
  const warnings: string[] = [];
  const suggestion = suggestEmailCorrection(email);
  const formatOk = isValidEmailFormat(email);
  const disposable = formatOk ? isDisposableEmail(email) : false;
  const roleAddress = formatOk ? isRoleAddress(email) : false;

  if (!email) {
    errors.push("Enter a recipient email address.");
  } else if (!formatOk) {
    errors.push("That does not look like a valid email address.");
  }

  if (suggestion) {
    warnings.push(`Did you mean ${suggestion}?`);
  }

  if (disposable) {
    errors.push("Disposable / temporary email addresses are not allowed.");
  }

  if (roleAddress) {
    warnings.push(
      "This looks like a role/system address (noreply). Prefer a personal work email."
    );
  }

  let mxOk: boolean | null = null;
  if (formatOk && !disposable && options.checkMx !== false) {
    const domain = email.split("@")[1];
    mxOk = await domainHasMx(domain);
    if (!mxOk) {
      errors.push(
        `No mail server found for @${domain}. Check the address before sending.`
      );
    }
  }

  if (formatOk) {
    const domain = email.split("@")[1] || "";
    if (/(outlook|hotmail|live|msn)\.com$|office365|microsoft/i.test(domain)) {
      warnings.push(
        "Outlook/Hotmail often files cold outreach in Junk unless SPF, DKIM, and DMARC are verified for your sending domain in Resend. Prefer the Outlook Safe template."
      );
    }
  }

  return {
    email,
    valid: errors.length === 0,
    formatOk,
    mxOk,
    disposable,
    roleAddress,
    suggestion,
    errors,
    warnings,
  };
}

/** Plain-text body that stays readable for spam filters / Outlook */
export function htmlToPlainText(html: string): string {
  return String(html)
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|tr|h[1-6]|li)>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<a[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, "$2 ($1)")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}
