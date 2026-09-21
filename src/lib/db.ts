import path from "path";
import fs from "fs";
import crypto from "crypto";

const DB_PATH = process.env.SQLITE_DB_PATH || path.join(process.cwd(), "data", "app.db");

type AnyDb = any;

interface DbConnection {
  type: "sqlite";
  db: AnyDb;
  ready: boolean;
}

declare global {
  // eslint-disable-next-line no-var
  var __sqlite: DbConnection | undefined;
}

function tableHasColumn(db: AnyDb, table: string, column: string): boolean {
  const rows = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  return rows.some((r) => r.name === column);
}

function initSchema(db: AnyDb) {
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      _id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      name TEXT,
      image TEXT,
      password TEXT,
      passwordHash TEXT,
      emailVerified TEXT,
      verificationToken TEXT,
      accounts TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
  `);

  // Migrate favorites if an older merge schema is present
  const favoritesExists = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='favorites'")
    .get();
  if (favoritesExists && !tableHasColumn(db, "favorites", "githubId")) {
    db.exec("DROP TABLE favorites");
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS favorites (
      _id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      githubId INTEGER NOT NULL,
      login TEXT NOT NULL,
      avatarUrl TEXT NOT NULL,
      name TEXT,
      bio TEXT,
      location TEXT,
      publicRepos INTEGER NOT NULL DEFAULT 0,
      followers INTEGER NOT NULL DEFAULT 0,
      following INTEGER NOT NULL DEFAULT 0,
      htmlUrl TEXT NOT NULL,
      email TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      UNIQUE(userId, githubId)
    );

    CREATE INDEX IF NOT EXISTS idx_favorites_userId ON favorites(userId);
  `);

  // Migrate email_settings if an older merge schema is present
  const emailSettingsExists = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='email_settings'")
    .get();
  if (emailSettingsExists && !tableHasColumn(db, "email_settings", "smtpHost")) {
    db.exec("DROP TABLE email_settings");
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS email_settings (
      _id TEXT PRIMARY KEY,
      userId TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL,
      smtpHost TEXT NOT NULL,
      smtpPort INTEGER NOT NULL DEFAULT 587,
      smtpSecure INTEGER NOT NULL DEFAULT 0,
      smtpPassword TEXT NOT NULL,
      isActive INTEGER NOT NULL DEFAULT 1,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_email_settings_userId ON email_settings(userId);
  `);
}

function openConnection(): DbConnection {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const Database = require("better-sqlite3");
  const db = new Database(DB_PATH);
  initSchema(db);
  return { type: "sqlite", db, ready: true };
}

if (!global.__sqlite) {
  global.__sqlite = openConnection();
  console.log("[db] Using SQLite database at", DB_PATH);
} else if (!global.__sqlite.ready) {
  global.__sqlite = openConnection();
}

export class DbNotReadyError extends Error {
  constructor() {
    super("Database is not ready.");
    this.name = "DbNotReadyError";
  }
}

export async function connectToDatabase(): Promise<AnyDb> {
  if (!global.__sqlite?.ready) throw new DbNotReadyError();
  return global.__sqlite.db;
}

export function getDb(): AnyDb {
  if (!global.__sqlite?.ready) throw new DbNotReadyError();
  return global.__sqlite.db;
}

export function isDbReady(): boolean {
  return Boolean(global.__sqlite?.ready);
}

export function getDbType(): "sqlite" {
  return "sqlite";
}

export function generateId(): string {
  return crypto.randomUUID();
}
