import { db, nowMs } from "./sqlite";
import bcrypt from "bcryptjs";

export interface User {
  id: string; email: string; name: string|null; image: string|null;
  passwordHash: string|null; emailVerified: number|null; createdAt: number; updatedAt: number;
}

export function getUserByEmail(email: string): User|undefined {
  return db.prepare(`SELECT * FROM users WHERE email = ?`).get(email.toLowerCase().trim()) as User|undefined;
}

export function getUserById(id: string): User|undefined {
  return db.prepare(`SELECT * FROM users WHERE id = ?`).get(id) as User|undefined;
}

export async function createUser(email: string, password: string, name?: string): Promise<User> {
  const id = Math.random().toString(36).slice(2) + Date.now().toString(36);
  const passwordHash = await bcrypt.hash(password, 12);
  const now = nowMs();
  db.prepare(`INSERT INTO users (id,email,name,passwordHash,createdAt,updatedAt) VALUES (?,?,?,?,?,?)`)
    .run(id, email.toLowerCase().trim(), name ?? null, passwordHash, now, now);
  return getUserById(id)!;
}

export async function verifyPassword(user: User, password: string): Promise<boolean> {
  if (!user.passwordHash) return false;
  return bcrypt.compare(password, user.passwordHash);
}

export async function upsertGithubUser(email: string, name: string|null, image: string|null): Promise<User> {
  const existing = getUserByEmail(email);
  if (existing) {
    db.prepare(`UPDATE users SET name=?, image=?, updatedAt=? WHERE id=?`).run(name, image, nowMs(), existing.id);
    return getUserById(existing.id)!;
  }
  const id = Math.random().toString(36).slice(2) + Date.now().toString(36);
  const now = nowMs();
  db.prepare(`INSERT INTO users (id,email,name,image,createdAt,updatedAt) VALUES (?,?,?,?,?,?)`)
    .run(id, email.toLowerCase().trim(), name, image, now, now);
  return getUserById(id)!;
}