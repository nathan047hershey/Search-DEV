/**
 * Lightweight QA for recruiting outreach quality.
 * Scores what research says drives replies: specificity, length, CTA, anti-slop.
 */

export interface MessageQualityIssue {
  level: "warn" | "info";
  message: string;
}

export interface MessageQualityReport {
  score: number; // 0-100
  label: "Weak" | "OK" | "Strong";
  issues: MessageQualityIssue[];
  strengths: string[];
}

const SLOP =
  /\b(exciting|passionate|cutting[- ]edge|leverage|synergy|delve|thrilled|delighted|stood out|came across|strong fit|perfect fit|ideal candidate|game[- ]changer|rockstar|ninja|world-class)\b/i;

export function assessMessageQuality(input: {
  subject?: string;
  greeting?: string;
  opening?: string;
  bodyText?: string;
  whyUs?: string;
  closingLine?: string;
  style?: string;
  hasCompanySignal?: boolean;
  hasRepoSignal?: boolean;
  hasLanguageSignal?: boolean;
  hasFirstNameGreeting?: boolean;
}): MessageQualityReport {
  const issues: MessageQualityIssue[] = [];
  const strengths: string[] = [];
  let score = 55;

  const subject = String(input.subject || "").trim();
  const opening = String(input.opening || "").trim();
  const body = String(input.bodyText || "").replace(/\s+/g, " ").trim();
  const whyUs = String(input.whyUs || "").trim();
  const closing = String(input.closingLine || "").trim();
  const greeting = String(input.greeting || "").trim();
  const compact =
    input.style === "short" ||
    String(input.style || "").startsWith("followup");

  // Subject
  if (!subject) {
    issues.push({ level: "warn", message: "Missing subject line." });
    score -= 12;
  } else if (/exciting opportunity|quick question\b/i.test(subject)) {
    issues.push({
      level: "warn",
      message: "Subject looks generic — use role + company/repo/stack.",
    });
    score -= 10;
  } else if (subject.split(/\s+/).length <= 8) {
    strengths.push("Subject is short and scannable");
    score += 6;
  }

  // Greeting
  if (/Hi,\s+[A-Z]|Hello,\s+[A-Z]/.test(greeting)) {
    strengths.push("Greeting uses first name");
    score += 8;
  } else if (/^Hi,$|^Hello,$/i.test(greeting)) {
    issues.push({
      level: "info",
      message: "No first name in greeting (OK if profile has no real name).",
    });
  }

  // Opening specificity
  const hasSignal =
    input.hasCompanySignal ||
    input.hasRepoSignal ||
    input.hasLanguageSignal ||
    /\b(your work (at|on)|your .+ background|your experience as)\b/i.test(
      opening
    );
  if (hasSignal) {
    strengths.push("Opening includes a personalization signal");
    score += 12;
  } else {
    issues.push({
      level: "warn",
      message: "Opening lacks a specific signal (company, repo, or stack).",
    });
    score -= 14;
  }

  if (SLOP.test(opening) || SLOP.test(body)) {
    issues.push({
      level: "warn",
      message: "AI/marketing phrasing detected — rewrite for a calmer tone.",
    });
    score -= 15;
  } else {
    strengths.push("Tone avoids common AI slop");
    score += 5;
  }

  // Length
  const words = body ? body.split(/\s+/).filter(Boolean).length : opening.split(/\s+/).length;
  if (compact) {
    if (words > 0 && words <= 260) {
      strengths.push("Compact length fits first-touch / follow-up");
      score += 10;
    } else if (words > 320) {
      issues.push({
        level: "warn",
        message: `Body is ~${words} words — trim toward ~200 for cold outreach.`,
      });
      score -= 10;
    }
  } else if (words > 280) {
    issues.push({
      level: "info",
      message: `Full brief is long (~${words} words). Consider Short first-touch for cold sends.`,
    });
    score -= 4;
  }

  // CTA
  if (
    /careers@pivotalstacks\.com/i.test(closing + body) ||
    /resume|reply|times that work|time slots/i.test(closing + body)
  ) {
    strengths.push("Clear next step / CTA");
    score += 8;
  } else {
    issues.push({
      level: "warn",
      message: "CTA should ask for resume + times and include careers email.",
    });
    score -= 10;
  }

  if (whyUs && whyUs.length >= 24) {
    strengths.push("Includes a candidate-facing why line");
    score += 5;
  }

  score = Math.max(0, Math.min(100, score));
  const label = score >= 78 ? "Strong" : score >= 58 ? "OK" : "Weak";

  return {
    score,
    label,
    issues: issues.slice(0, 4),
    strengths: strengths.slice(0, 4),
  };
}

/** Plain text from HTML for rough word counts. */
export function htmlToPlainApprox(html: string): string {
  return String(html || "")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}
