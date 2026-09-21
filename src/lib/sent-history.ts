import fs from "fs";
import path from "path";
import crypto from "crypto";

export interface SentMessage {
  id: string;
  to: string;
  subject: string;
  body: string;
  emailId?: string | null;
  sentAt: string;
  sentBy?: string | null;
  developerLogin?: string | null;
  developerName?: string | null;
  hash?: string;
  /** Message tone used when sent (short, followup, …) */
  style?: string | null;
  /** First ~160 chars of opening for follow-up continuity */
  openingSnippet?: string | null;
}

const DATA_DIR = path.join(process.cwd(), "data");
const HISTORY_FILE = "sent-history.json";

function historyPath() {
  return path.join(DATA_DIR, HISTORY_FILE);
}

function ensureFile() {
  if (!fs.existsSync(/*turbopackIgnore: true*/ DATA_DIR)) {
    fs.mkdirSync(/*turbopackIgnore: true*/ DATA_DIR, { recursive: true });
  }
  const file = historyPath();
  if (!fs.existsSync(/*turbopackIgnore: true*/ file)) {
    fs.writeFileSync(/*turbopackIgnore: true*/ file, "[]", "utf8");
  }
}

export function readSentHistory(): SentMessage[] {
  ensureFile();
  try {
    const raw = fs.readFileSync(/*turbopackIgnore: true*/ historyPath(), "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function addSentMessage(
  entry: Omit<SentMessage, "id" | "sentAt" | "hash"> & {
    id?: string;
    sentAt?: string;
  }
): SentMessage {
  ensureFile();
  const list = readSentHistory();
  const body = entry.body || "";
  const record: SentMessage = {
    id: entry.id || crypto.randomUUID(),
    to: entry.to,
    subject: entry.subject,
    body,
    emailId: entry.emailId ?? null,
    sentAt: entry.sentAt || new Date().toISOString(),
    sentBy: entry.sentBy ?? null,
    developerLogin: entry.developerLogin ?? null,
    developerName: entry.developerName ?? null,
    style: entry.style ?? null,
    openingSnippet: entry.openingSnippet
      ? String(entry.openingSnippet).replace(/\s+/g, " ").trim().slice(0, 160)
      : null,
    hash: crypto.createHash("sha256").update(body).digest("hex").slice(0, 16),
  };
  list.unshift(record);
  fs.writeFileSync(
    /*turbopackIgnore: true*/ historyPath(),
    JSON.stringify(list.slice(0, 500), null, 2),
    "utf8"
  );
  return record;
}

function loginKey(login: string): string {
  return String(login || "")
    .trim()
    .toLowerCase();
}

/** All sends to this developer login, newest first. */
export function getSendsForDeveloper(login: string): SentMessage[] {
  const key = loginKey(login);
  if (!key) return [];
  return readSentHistory().filter(
    (m) => String(m.developerLogin || "").trim().toLowerCase() === key
  );
}

/** Most recent send to this developer login (if any). */
export function getLastSendForDeveloper(login: string): SentMessage | null {
  return getSendsForDeveloper(login)[0] || null;
}

/** Pure ladder: 0→short, 1→bump, 2→value, 3+→close. */
export function nextStyleAfterTouchCount(n: number): string {
  if (n <= 0) return "short";
  if (n === 1) return "followup";
  if (n === 2) return "followup-value";
  return "followup-close";
}

/**
 * Next tone after N prior sends: short → bump → value → close.
 * Used when opening the composer for a previously contacted login.
 */
export function suggestNextOutreachStyle(login: string): string {
  return nextStyleAfterTouchCount(getSendsForDeveloper(login).length);
}

/** Logins + emails already contacted (for hiding from search results) */
export function getContactedDevelopers(sentByEmail?: string | null): {
  logins: string[];
  emails: string[];
} {
  let items = readSentHistory();
  const email = sentByEmail?.toLowerCase();
  if (email) {
    items = items.filter((i) => !i.sentBy || i.sentBy.toLowerCase() === email);
  }

  const logins = new Set<string>();
  const emails = new Set<string>();

  for (const item of items) {
    const login = (item.developerLogin || "").trim().toLowerCase();
    if (login && login !== "candidate") logins.add(login);
    const to = (item.to || "").trim().toLowerCase();
    if (to) emails.add(to);
  }

  return {
    logins: Array.from(logins),
    emails: Array.from(emails),
  };
}
