import fs from "fs";
import path from "path";
import { readSentHistory } from "./sent-history";

export interface SendCooldown {
  allowed: boolean;
  gapMinutes: number;
  lastSentAt: string | null;
  retryAfterSeconds: number | null;
  nextSendAt: string | null;
  message: string | null;
  presets: number[];
  recommendedMinutes: number;
}

interface SendLimitsFile {
  gapMinutes?: number;
  updatedAt?: string;
  note?: string;
  /** Per-user last successful send — survives server restart */
  lastSentAtByUser?: Record<string, string>;
}

const DATA_DIR = path.join(process.cwd(), "data");
const SETTINGS_FILE = "send-limits.json";
const PRESETS = [3, 5, 8, 10, 15, 20, 30];
const RECOMMENDED = 10;
const MIN_GAP = 2;
const MAX_GAP = 60;

function settingsPath() {
  return path.join(DATA_DIR, SETTINGS_FILE);
}

function ensureDataDir() {
  if (!fs.existsSync(/*turbopackIgnore: true*/ DATA_DIR)) {
    fs.mkdirSync(/*turbopackIgnore: true*/ DATA_DIR, { recursive: true });
  }
}

function readSettingsFile(): SendLimitsFile {
  try {
    if (!fs.existsSync(/*turbopackIgnore: true*/ settingsPath())) {
      return {};
    }
    const raw = fs.readFileSync(/*turbopackIgnore: true*/ settingsPath(), "utf8");
    const parsed = JSON.parse(raw) as SendLimitsFile;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeSettingsFile(data: SendLimitsFile) {
  ensureDataDir();
  fs.writeFileSync(
    /*turbopackIgnore: true*/ settingsPath(),
    JSON.stringify(data, null, 2),
    "utf8"
  );
}

function envDefaultMinutes(): number {
  const raw = process.env.EMAIL_SEND_GAP_MINUTES;
  if (!raw) return RECOMMENDED;
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n)) return RECOMMENDED;
  return Math.min(MAX_GAP, Math.max(MIN_GAP, n));
}

function normalizeUserKey(email?: string | null): string | null {
  const key = String(email || "")
    .toLowerCase()
    .trim();
  return key || null;
}

export function getGapMinutes(): number {
  const parsed = readSettingsFile();
  const n = Number(parsed.gapMinutes);
  if (!Number.isFinite(n)) return envDefaultMinutes();
  return Math.min(MAX_GAP, Math.max(MIN_GAP, Math.round(n)));
}

export function setGapMinutes(minutes: number): number {
  const gapMinutes = Math.min(
    MAX_GAP,
    Math.max(MIN_GAP, Math.round(Number(minutes) || RECOMMENDED))
  );
  const prev = readSettingsFile();
  writeSettingsFile({
    ...prev,
    gapMinutes,
    updatedAt: new Date().toISOString(),
    note: "Minimum minutes between outbound messages to reduce account blocking risk",
    lastSentAtByUser: prev.lastSentAtByUser || {},
  });
  return gapMinutes;
}

/** Persist last send time so cooldown survives stop/restart. */
export function recordLastSendAt(sentByEmail?: string | null, at = new Date()): string {
  const iso = at.toISOString();
  const key = normalizeUserKey(sentByEmail) || "_default";
  const prev = readSettingsFile();
  const map = { ...(prev.lastSentAtByUser || {}) };
  map[key] = iso;
  writeSettingsFile({
    ...prev,
    gapMinutes: getGapMinutes(),
    updatedAt: iso,
    note:
      prev.note ||
      "Minimum minutes between outbound messages to reduce account blocking risk",
    lastSentAtByUser: map,
  });
  return iso;
}

function lastSendFromSettings(sentByEmail?: string | null): number | null {
  const map = readSettingsFile().lastSentAtByUser || {};
  const key = normalizeUserKey(sentByEmail);
  const candidates: number[] = [];
  if (key && map[key]) {
    const t = Date.parse(map[key]);
    if (Number.isFinite(t)) candidates.push(t);
  }
  if (map._default) {
    const t = Date.parse(map._default);
    if (Number.isFinite(t)) candidates.push(t);
  }
  if (!candidates.length) return null;
  return Math.max(...candidates);
}

function lastSendFromHistory(sentByEmail?: string | null): number | null {
  let items = readSentHistory();
  const email = normalizeUserKey(sentByEmail);
  if (email) {
    items = items.filter((i) => !i.sentBy || i.sentBy.toLowerCase() === email);
  }
  const last = items
    .map((i) => Date.parse(i.sentAt))
    .filter((t) => Number.isFinite(t))
    .sort((a, b) => b - a)[0];
  return last || null;
}

function formatWait(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s ? `${m}m ${s}s` : `${m}m`;
}

/** Cooldown between sends — uses saved lastSentAt (and history as backup). */
export function getSendCooldown(sentByEmail?: string | null): SendCooldown {
  const gapMinutes = getGapMinutes();
  const gapMs = gapMinutes * 60 * 1000;
  const now = Date.now();

  const fromSettings = lastSendFromSettings(sentByEmail);
  const fromHistory = lastSendFromHistory(sentByEmail);
  const last =
    fromSettings != null && fromHistory != null
      ? Math.max(fromSettings, fromHistory)
      : fromSettings ?? fromHistory;

  if (!last) {
    return {
      allowed: true,
      gapMinutes,
      lastSentAt: null,
      retryAfterSeconds: null,
      nextSendAt: null,
      message: null,
      presets: PRESETS,
      recommendedMinutes: RECOMMENDED,
    };
  }

  const elapsed = now - last;
  if (elapsed >= gapMs) {
    return {
      allowed: true,
      gapMinutes,
      lastSentAt: new Date(last).toISOString(),
      retryAfterSeconds: null,
      nextSendAt: null,
      message: null,
      presets: PRESETS,
      recommendedMinutes: RECOMMENDED,
    };
  }

  const retryAfterSeconds = Math.max(1, Math.ceil((gapMs - elapsed) / 1000));
  const nextSendAt = new Date(last + gapMs).toISOString();

  return {
    allowed: false,
    gapMinutes,
    lastSentAt: new Date(last).toISOString(),
    retryAfterSeconds,
    nextSendAt,
    message: `Wait ${formatWait(retryAfterSeconds)} before the next send (gap: ${gapMinutes} min). This spacing helps avoid provider blocks.`,
    presets: PRESETS,
    recommendedMinutes: RECOMMENDED,
  };
}
