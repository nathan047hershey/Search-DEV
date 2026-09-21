import { randomUUID } from "crypto";
import { getDb } from "@/lib/db";

export interface IFavorite {
  _id: string;
  userId: string;
  githubId: number;
  login: string;
  avatarUrl: string;
  name: string | null;
  bio: string | null;
  location: string | null;
  publicRepos: number;
  followers: number;
  following: number;
  htmlUrl: string;
  email: string | null;
  createdAt: Date;
  updatedAt: Date;
}

class FavoriteDocument implements IFavorite {
  _id!: string;
  userId!: string;
  githubId!: number;
  login!: string;
  avatarUrl!: string;
  name!: string | null;
  bio!: string | null;
  location!: string | null;
  publicRepos!: number;
  followers!: number;
  following!: number;
  htmlUrl!: string;
  email!: string | null;
  createdAt!: Date;
  updatedAt!: Date;

  constructor(init: Partial<IFavorite> = {}) {
    Object.assign(this, init);
    if (!this._id) this._id = randomUUID();
    const now = new Date();
    if (!this.createdAt) this.createdAt = now;
    if (!this.updatedAt) this.updatedAt = now;
  }

  async save(): Promise<FavoriteDocument> {
    const db = getDb();
    const nowIso = new Date().toISOString();
    const existing = db.prepare("SELECT _id FROM favorites WHERE _id = ?").get(this._id);
    if (!existing) {
      db.prepare(
        `INSERT INTO favorites
          (_id, userId, githubId, login, avatarUrl, name, bio, location,
           publicRepos, followers, following, htmlUrl, email, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        this._id, this.userId, this.githubId, this.login, this.avatarUrl,
        this.name ?? null, this.bio ?? null, this.location ?? null,
        this.publicRepos ?? 0, this.followers ?? 0, this.following ?? 0,
        this.htmlUrl, this.email ?? null,
        (this.createdAt ?? new Date()).toISOString(), nowIso
      );
    } else {
      db.prepare(
        `UPDATE favorites SET
          userId = ?, githubId = ?, login = ?, avatarUrl = ?, name = ?,
          bio = ?, location = ?, publicRepos = ?, followers = ?,
          following = ?, htmlUrl = ?, email = ?, updatedAt = ?
         WHERE _id = ?`
      ).run(
        this.userId, this.githubId, this.login, this.avatarUrl,
        this.name ?? null, this.bio ?? null, this.location ?? null,
        this.publicRepos ?? 0, this.followers ?? 0, this.following ?? 0,
        this.htmlUrl, this.email ?? null, nowIso, this._id
      );
      this.updatedAt = new Date(nowIso);
    }
    return this;
  }
}

interface FavoriteRow {
  _id: string; userId: string; githubId: number; login: string;
  avatarUrl: string; name: string | null; bio: string | null;
  location: string | null; publicRepos: number; followers: number;
  following: number; htmlUrl: string; email: string | null;
  createdAt: string; updatedAt: string;
}

function rowToDoc(row: FavoriteRow): FavoriteDocument {
  return new FavoriteDocument({
    _id: row._id, userId: row.userId, githubId: row.githubId,
    login: row.login, avatarUrl: row.avatarUrl,
    name: row.name, bio: row.bio, location: row.location,
    publicRepos: row.publicRepos, followers: row.followers,
    following: row.following, htmlUrl: row.htmlUrl, email: row.email,
    createdAt: new Date(row.createdAt), updatedAt: new Date(row.updatedAt),
  });
}
function buildWhere(criteria: Record<string, unknown>): { sql: string; params: unknown[] } {
  const where: string[] = [];
  const params: unknown[] = [];
  for (const [key, value] of Object.entries(criteria)) {
    if (value === undefined) continue;
    where.push(`${key} = ?`);
    params.push(value);
  }
  return {
    sql: where.length ? " WHERE " + where.join(" AND ") : "",
    params,
  };
}
class FavoriteQuery {
  private criteria: Record<string, unknown>;
  private sortField?: string;
  private sortDir: "ASC" | "DESC" = "DESC";

  constructor(criteria: Record<string, unknown>) {
    this.criteria = criteria;
  }

  sort(spec: Record<string, 1 | -1>): FavoriteQuery {
    const [field, dir] = Object.entries(spec)[0];
    this.sortField = field;
    this.sortDir = dir === 1 ? "ASC" : "DESC";
    return this;
  }

  lean(): FavoriteQuery {
    return this;
  }

  async exec(): Promise<IFavorite[]> {
    const db = getDb();
    const { sql: whereSql, params } = buildWhere(this.criteria);
    let sql = "SELECT * FROM favorites" + whereSql;
    if (this.sortField) sql += ` ORDER BY ${this.sortField} ${this.sortDir}`;
    const rows = db.prepare(sql).all(...params) as FavoriteRow[];
    return rows.map((r) => rowToDoc(r) as unknown as IFavorite);
  }

  then<TResult1 = IFavorite[], TResult2 = never>(
    onfulfilled?: ((value: IFavorite[]) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): PromiseLike<TResult1 | TResult2> {
    return this.exec().then(onfulfilled as never, onrejected as never);
  }
}
class FavoriteModel {
  find(criteria: Record<string, unknown>): FavoriteQuery {
    return new FavoriteQuery(criteria);
  }
  findOne(criteria: Record<string, unknown>): Promise<IFavorite | null> {
    const db = getDb();
    const { sql: whereSql, params } = buildWhere(criteria);
    const sql = "SELECT * FROM favorites" + whereSql + " LIMIT 1";
    const row = db.prepare(sql).get(...params) as FavoriteRow | undefined;
    return Promise.resolve(row ? (rowToDoc(row) as unknown as IFavorite) : null);
  }
  findOneAndDelete(criteria: Record<string, unknown>): Promise<IFavorite | null> {
    const db = getDb();
    const { sql: whereSql, params } = buildWhere(criteria);
    const sql = "SELECT * FROM favorites" + whereSql + " LIMIT 1";
    const row = db.prepare(sql).get(...params) as FavoriteRow | undefined;
    if (!row) return Promise.resolve(null);
    db.prepare("DELETE FROM favorites WHERE _id = ?").run(row._id);
    return Promise.resolve(rowToDoc(row) as unknown as IFavorite);
  }
}

const FavoriteFactory = function (init: Partial<IFavorite>) {
  return new FavoriteDocument(init);
} as unknown as new (init: Partial<IFavorite>) => FavoriteDocument;

Object.assign(FavoriteFactory, new FavoriteModel());

export const Favorite = FavoriteFactory as typeof FavoriteFactory & FavoriteModel;