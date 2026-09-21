import { randomUUID } from "crypto";
import { getDb } from "@/lib/db";

export interface IEmailSettings {
  _id: string;
  userId: string;
  email: string;
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpPassword: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

class EmailSettingsDocument implements IEmailSettings {
  _id!: string;
  userId!: string;
  email!: string;
  smtpHost!: string;
  smtpPort!: number;
  smtpSecure!: boolean;
  smtpPassword!: string;
  isActive!: boolean;
  createdAt!: Date;
  updatedAt!: Date;

  constructor(init: Partial<IEmailSettings> = {}) {
    Object.assign(this, init);
    if (!this._id) this._id = randomUUID();
    const now = new Date();
    if (!this.createdAt) this.createdAt = now;
    if (!this.updatedAt) this.updatedAt = now;
  }

  async save(): Promise<EmailSettingsDocument> {
    const db = getDb();
    const nowIso = new Date().toISOString();
    const existing = db
      .prepare("SELECT _id FROM email_settings WHERE _id = ?")
      .get(this._id);
    if (!existing) {
      db.prepare(
        `INSERT INTO email_settings
          (_id, userId, email, smtpHost, smtpPort, smtpSecure, smtpPassword,
           isActive, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        this._id, this.userId, this.email, this.smtpHost,
        this.smtpPort ?? 587, this.smtpSecure ? 1 : 0, this.smtpPassword,
        this.isActive === false ? 0 : 1,
        (this.createdAt ?? new Date()).toISOString(), nowIso
      );
    } else {
      db.prepare(
        `UPDATE email_settings SET
          userId = ?, email = ?, smtpHost = ?, smtpPort = ?, smtpSecure = ?,
          smtpPassword = ?, isActive = ?, updatedAt = ?
         WHERE _id = ?`
      ).run(
        this.userId, this.email, this.smtpHost, this.smtpPort ?? 587,
        this.smtpSecure ? 1 : 0, this.smtpPassword,
        this.isActive === false ? 0 : 1, nowIso, this._id
      );
      this.updatedAt = new Date(nowIso);
    }
    return this;
  }
}
class EmailSettingsModel {
  findOne(criteria: { userId?: string }): Promise<IEmailSettings | null> {
    const db = getDb();
    if (criteria.userId === undefined) return Promise.resolve(null);
    const row = db
      .prepare("SELECT * FROM email_settings WHERE userId = ? LIMIT 1")
      .get(criteria.userId) as EmailSettingsRow | undefined;
    return Promise.resolve(row ? (rowToDoc(row) as unknown as IEmailSettings) : null);
  }

  /**
   * mongoose-style upsert. Existing route uses `{ upsert: true, new: true }`
   * and ignores the return value, so we just persist and resolve.
   */
  findOneAndUpdate(
    criteria: { userId?: string },
    update: Partial<IEmailSettings>,
    _opts?: { upsert?: boolean; new?: boolean }
  ): Promise<IEmailSettings | null> {
    const db = getDb();
    const userId = criteria.userId ?? update.userId;
    if (!userId) return Promise.resolve(null);

    const existing = db
      .prepare("SELECT _id FROM email_settings WHERE userId = ?")
      .get(userId) as { _id: string } | undefined;

    const nowIso = new Date().toISOString();
    let payload: EmailSettingsDocument;

    if (existing) {
      const current = db
        .prepare("SELECT * FROM email_settings WHERE _id = ?")
        .get(existing._id) as EmailSettingsRow;
      payload = new EmailSettingsDocument({
        _id: current._id,
        userId: current.userId,
        email: update.email ?? current.email,
        smtpHost: update.smtpHost ?? current.smtpHost,
        smtpPort: update.smtpPort ?? current.smtpPort,
        smtpSecure: update.smtpSecure ?? (current.smtpSecure === 1),
        smtpPassword: update.smtpPassword ?? current.smtpPassword,
        isActive: update.isActive ?? (current.isActive === 1),
        createdAt: new Date(current.createdAt),
        updatedAt: new Date(nowIso),
      });
    } else {
      payload = new EmailSettingsDocument({
        ...update,
        userId,
      });
      payload._id = payload._id || randomUUID();
    }

    if (!existing) {
      db.prepare(
        `INSERT INTO email_settings
          (_id, userId, email, smtpHost, smtpPort, smtpSecure, smtpPassword,
           isActive, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        payload._id, payload.userId, payload.email, payload.smtpHost,
        payload.smtpPort ?? 587, payload.smtpSecure ? 1 : 0,
        payload.smtpPassword, payload.isActive === false ? 0 : 1,
        (payload.createdAt ?? new Date()).toISOString(), nowIso
      );
    } else {
      db.prepare(
        `UPDATE email_settings SET
          userId = ?, email = ?, smtpHost = ?, smtpPort = ?, smtpSecure = ?,
          smtpPassword = ?, isActive = ?, updatedAt = ?
         WHERE _id = ?`
      ).run(
        payload.userId, payload.email, payload.smtpHost,
        payload.smtpPort ?? 587, payload.smtpSecure ? 1 : 0,
        payload.smtpPassword, payload.isActive === false ? 0 : 1,
        nowIso, payload._id
      );
    }
    return Promise.resolve(payload as unknown as IEmailSettings);
  }

  deleteOne(criteria: { userId?: string }): Promise<{ deletedCount: number }> {
    const db = getDb();
    if (criteria.userId === undefined) return Promise.resolve({ deletedCount: 0 });
    const result = db
      .prepare("DELETE FROM email_settings WHERE userId = ?")
      .run(criteria.userId);
    return Promise.resolve({ deletedCount: result.changes });
  }
}

// `new EmailSettings({...})` constructor pattern - kept for completeness.
const EmailSettingsFactory = function (init: Partial<IEmailSettings>) {
  return new EmailSettingsDocument(init);
} as unknown as new (init: Partial<IEmailSettings>) => EmailSettingsDocument;

Object.assign(EmailSettingsFactory, new EmailSettingsModel());

const EmailSettings = EmailSettingsFactory as typeof EmailSettingsFactory & EmailSettingsModel;

export default EmailSettings;

interface EmailSettingsRow {
  _id: string;
  userId: string;
  email: string;
  smtpHost: string;
  smtpPort: number;
  smtpSecure: number;
  smtpPassword: string;
  isActive: number;
  createdAt: string;
  updatedAt: string;
}

function rowToDoc(row: EmailSettingsRow): EmailSettingsDocument {
  return new EmailSettingsDocument({
    _id: row._id,
    userId: row.userId,
    email: row.email,
    smtpHost: row.smtpHost,
    smtpPort: row.smtpPort,
    smtpSecure: row.smtpSecure === 1,
    smtpPassword: row.smtpPassword,
    isActive: row.isActive === 1,
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
  });
}