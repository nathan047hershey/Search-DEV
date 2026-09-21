import { randomUUID } from "crypto";
import { getDb } from "@/lib/db";

export interface IUser {
  _id: string;
  email: string;
  name?: string | null;
  image?: string | null;
  password?: string | null;
  emailVerified?: Date | null;
  accounts?: {
    provider: string;
    providerAccountId: string;
    access_token?: string;
    refresh_token?: string;
    expires_at?: number;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

class UserDocument implements IUser {
  _id!: string;
  email!: string;
  name?: string | null;
  image?: string | null;
  password?: string | null;
  emailVerified?: Date | null;
  accounts?: IUser["accounts"];
  createdAt!: Date;
  updatedAt!: Date;

  constructor(init: Partial<IUser> = {}) {
    Object.assign(this, init);
    if (!this._id) this._id = randomUUID();
    const now = new Date();
    if (!this.createdAt) this.createdAt = now;
    if (!this.updatedAt) this.updatedAt = now;
  }

  toString() {
    return this._id;
  }

  async save(): Promise<UserDocument> {
    const db = getDb();
    const nowIso = new Date().toISOString();
    const existing = db
      .prepare("SELECT _id FROM users WHERE _id = ?")
      .get(this._id);
    if (!existing) {
      db.prepare(
        `INSERT INTO users
          (_id, email, name, image, password, passwordHash, emailVerified, accounts, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        this._id,
        this.email,
        this.name ?? null,
        this.image ?? null,
        this.password ?? null,
        this.password ?? null,
        this.emailVerified ? this.emailVerified.toISOString() : null,
        this.accounts ? JSON.stringify(this.accounts) : null,
        (this.createdAt ?? new Date()).toISOString(),
        nowIso
      );
    } else {
      db.prepare(
        `UPDATE users SET
          email = ?, name = ?, image = ?, password = ?, passwordHash = ?,
          emailVerified = ?, accounts = ?, updatedAt = ?
         WHERE _id = ?`
      ).run(
        this.email,
        this.name ?? null,
        this.image ?? null,
        this.password ?? null,
        this.password ?? null,
        this.emailVerified ? this.emailVerified.toISOString() : null,
        this.accounts ? JSON.stringify(this.accounts) : null,
        nowIso,
        this._id
      );
      this.updatedAt = new Date(nowIso);
    }
    return this;
  }
}

interface UserRow {
  _id: string;
  email: string;
  name: string | null;
  image: string | null;
  password: string | null;
  passwordHash: string | null;
  emailVerified: string | null;
  accounts: string | null;
  createdAt: string;
  updatedAt: string;
}

function rowToDoc(row: UserRow): UserDocument {
  return new UserDocument({
    _id: row._id,
    email: row.email,
    name: row.name,
    image: row.image,
    password: row.password,
    emailVerified: row.emailVerified ? new Date(row.emailVerified) : null,
    accounts: row.accounts ? JSON.parse(row.accounts) : undefined,
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
  });
}

interface UserStatics {
  findOne(criteria: { email?: string; _id?: string }): Promise<UserDocument | null>;
}

const UserFactory = function (init: Partial<IUser>) {
  return new UserDocument(init);
} as unknown as (new (init: Partial<IUser>) => UserDocument) & UserStatics;

UserFactory.findOne = async (
  criteria: { email?: string; _id?: string }
): Promise<UserDocument | null> => {
  const db = getDb();
  if (criteria.email !== undefined) {
    const row = db
      .prepare("SELECT * FROM users WHERE email = ? LIMIT 1")
      .get(criteria.email.toLowerCase()) as UserRow | undefined;
    return row ? rowToDoc(row) : null;
  }
  if (criteria._id !== undefined) {
    const row = db
      .prepare("SELECT * FROM users WHERE _id = ? LIMIT 1")
      .get(criteria._id) as UserRow | undefined;
    return row ? rowToDoc(row) : null;
  }
  return null;
};

export default UserFactory;


