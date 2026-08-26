import { db, nowMs, SqliteRow } from "./sqlite";

export interface Favorite {
  id: number;
  userId: string;
  githubId: number;
  githubLogin: string;
  name: string | null;
  bio: string | null;
  avatarUrl: string | null;
  htmlUrl: string | null;
  location: string | null;
  publicRepos: number;
  followers: number;
  following: number;
  email: string | null;
  messagedAt: number | null;
  lastMessageId: number | null;
  resumeUrl: string | null;
  portfolioUrl: string | null;
  createdAt: number;
}

export interface FavoriteInput {
  githubId: number;
  githubLogin: string;
  name?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
  htmlUrl?: string;
  location?: string | null;
  publicRepos?: number;
  followers?: number;
  following?: number;
  email?: string | null;
  resumeUrl?: string | null;
  portfolioUrl?: string | null;
}

// GET all favorites for a user
export function getFavorites(userId: string): SqliteRow<Favorite>[] {
  return db
    .prepare(`SELECT * FROM favorites WHERE userId = ? ORDER BY createdAt DESC`)
    .all(userId) as SqliteRow<Favorite>[];
}

// GET one favorite by userId + githubLogin
export function getFavorite(userId: string, githubLogin: string): SqliteRow<Favorite> | undefined {
  return db
    .prepare(`SELECT * FROM favorites WHERE userId = ? AND githubLogin = ?`)
    .get(userId, githubLogin) as SqliteRow<Favorite> | undefined;
}

// POST — add a favorite (upsert by githubLogin so refreshing the search re-favorites)
export function addFavorite(userId: string, input: FavoriteInput): SqliteRow<Favorite> {
  const now = nowMs();
  const existing = getFavorite(userId, input.githubLogin);

  if (existing) {
    // Update in case profile data changed on GitHub
    db.prepare(`
      UPDATE favorites SET
        githubId=?, name=?, bio=?, avatarUrl=?, htmlUrl=?,
        location=?, publicRepos=?, followers=?, following=?, email=?,
        resumeUrl=?, portfolioUrl=?
      WHERE id=?
    `).run(
      input.githubId, input.name ?? null, input.bio ?? null,
      input.avatarUrl ?? null, input.htmlUrl ?? null,
      input.location ?? null,
      input.publicRepos ?? 0, input.followers ?? 0, input.following ?? 0,
      input.email ?? null,
      input.resumeUrl ?? null, input.portfolioUrl ?? null,
      existing.id
    );
    return { ...existing, ...input } as SqliteRow<Favorite>;
  }

  const result = db.prepare(`
    INSERT INTO favorites
      (userId, githubId, githubLogin, name, bio, avatarUrl, htmlUrl,
       location, publicRepos, followers, following, email, resumeUrl, portfolioUrl, createdAt)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).run(
    userId, input.githubId, input.githubLogin,
    input.name ?? null, input.bio ?? null, input.avatarUrl ?? null,
    input.htmlUrl ?? null, input.location ?? null,
    input.publicRepos ?? 0, input.followers ?? 0, input.following ?? 0,
    input.email ?? null, input.resumeUrl ?? null, input.portfolioUrl ?? null, now
  );

  return db.prepare(`SELECT * FROM favorites WHERE id=?`).get(result.lastInsertRowid) as SqliteRow<Favorite>;
}

// DELETE — remove a favorite
export function removeFavorite(userId: string, githubLogin: string): boolean {
  const info = db
    .prepare(`DELETE FROM favorites WHERE userId=? AND githubLogin=?`)
    .run(userId, githubLogin);
  return info.changes > 0;
}

// GET favorites with messagedAt set (already contacted)
export function getMessagedFavorites(userId: string): SqliteRow<Favorite>[] {
  return db
    .prepare(`SELECT * FROM favorites WHERE userId=? AND messagedAt IS NOT NULL ORDER BY messagedAt DESC`)
    .all(userId) as SqliteRow<Favorite>[];
}

// MARK a favorite as messaged
export function markFavoriteMessaged(favoriteId: number, historyId: number): void {
  db.prepare(`UPDATE favorites SET messagedAt=?, lastMessageId=? WHERE id=?`)
    .run(nowMs(), historyId, favoriteId);
}
