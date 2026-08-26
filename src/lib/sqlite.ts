import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "app.db");

declare global {
  // eslint-disable-next-line no-var
  var __sqlite: Database.Database | undefined;
}

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function createTables(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE,
      name TEXT, image TEXT, passwordHash TEXT, emailVerified INTEGER,
      createdAt INTEGER NOT NULL, updatedAt INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS favorites (
      id INTEGER PRIMARY KEY AUTOINCREMENT, userId TEXT NOT NULL,
      githubId INTEGER NOT NULL, githubLogin TEXT NOT NULL,
      name TEXT, bio TEXT, avatarUrl TEXT, htmlUrl TEXT,
      location TEXT, publicRepos INTEGER DEFAULT 0, followers INTEGER DEFAULT 0,
      following INTEGER DEFAULT 0, email TEXT, messagedAt INTEGER,
      lastMessageId INTEGER, resumeUrl TEXT, portfolioUrl TEXT,
      createdAt INTEGER NOT NULL,
      UNIQUE(userId, githubLogin)
    );
    CREATE INDEX IF NOT EXISTS idx_fav_user ON favorites(userId);
    CREATE TABLE IF NOT EXISTS email_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT, userId TEXT NOT NULL UNIQUE,
      provider TEXT NOT NULL, fromName TEXT, fromEmail TEXT NOT NULL,
      smtpHost TEXT NOT NULL, smtpPort INTEGER NOT NULL,
      smtpSecure INTEGER NOT NULL DEFAULT 0, smtpUser TEXT NOT NULL,
      smtpPassEnc TEXT NOT NULL, smtpPassIv TEXT NOT NULL,
      smtpPassTag TEXT NOT NULL, isActive INTEGER NOT NULL DEFAULT 1,
      createdAt INTEGER NOT NULL, updatedAt INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS email_templates (
      id TEXT PRIMARY KEY, userId TEXT NOT NULL,
      name TEXT NOT NULL, subject TEXT NOT NULL, body TEXT NOT NULL,
      isDefault INTEGER NOT NULL DEFAULT 0,
      createdAt INTEGER NOT NULL, updatedAt INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_tmpl_user ON email_templates(userId);
    CREATE TABLE IF NOT EXISTS sent_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT, userId TEXT NOT NULL,
      toEmail TEXT NOT NULL, toName TEXT, subject TEXT NOT NULL,
      body TEXT NOT NULL, hash TEXT NOT NULL,
      providerMessageId TEXT, favoriteId INTEGER, sentAt INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_hist_hash ON sent_history(userId, hash);
    CREATE INDEX IF NOT EXISTS idx_hist_email ON sent_history(userId, toEmail);
    CREATE INDEX IF NOT EXISTS idx_hist_sentAt ON sent_history(sentAt);
  `);
}

function seedDefaultTemplates(db: Database.Database) {
  const row = db.prepare(`SELECT COUNT(*) as n FROM email_templates WHERE userId = ''`).get() as { n: number };
  if (row.n > 0) return;
  const now = Date.now();
  const defaults = [
    { id: "welcome", name: "Welcome Email", subject: "Welcome to {{company}}",
      body: "Hello {{name}},\n\nWelcome to our community! We're excited to have you on board.\n\nBest regards,\nThe Team" },
    { id: "newsletter", name: "Newsletter", subject: "Our Latest Updates - {{date}}",
      body: "Hi {{name}},\n\nHere's what's new:\n\n- Update 1\n- Update 2\n- Update 3\n\nBest,\n{{company}}" },
    { id: "followup", name: "Follow Up", subject: "Following up on our conversation",
      body: "Hi {{name}},\n\nI wanted to follow up on our recent conversation. Please let me know if you have any questions.\n\nBest regards,\n{{sender}}" },
  ];
  const ins = db.prepare(`INSERT OR IGNORE INTO email_templates (id,userId,name,subject,body,isDefault,createdAt,updatedAt) VALUES (?,'',?,?,?,1,?,?)`);
  const tx = db.transaction((rows: typeof defaults) => {
    for (const t of rows) ins.run(t.id, t.name, t.subject, t.body, now, now);
  });
  tx(defaults);
}

function getDb(): Database.Database {
  if (global.__sqlite) return global.__sqlite;
  ensureDataDir();
  const db = new Database(DB_FILE);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  createTables(db);

  // Idempotent migration: add resume/portfolio columns to favorites if missing
  const favoriteCols = db.prepare("PRAGMA table_info(favorites)").all() as { name: string }[];
  const hasCol = (n: string) => favoriteCols.some((col) => col.name === n);
  if (!hasCol("resumeUrl")) {
    try { db.exec("ALTER TABLE favorites ADD COLUMN resumeUrl TEXT"); } catch {}
  }
  if (!hasCol("portfolioUrl")) {
    try { db.exec("ALTER TABLE favorites ADD COLUMN portfolioUrl TEXT"); } catch {}
  }
  seedDefaultTemplates(db);
  global.__sqlite = db;
  return db;
}

export const db = getDb();

export function nowMs(): number { return Date.now(); }

export function newId(prefix = ""): string {
  return prefix + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export type SqliteRow<T> = T & Record<string, unknown>;
export type SqliteDB = Database.Database;
