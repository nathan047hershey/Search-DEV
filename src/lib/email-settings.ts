import { db } from "./sqlite";
import { decrypt } from "./crypto";
export interface EmailSettings {
  id: number; userId: string; provider: string; fromName: string;
  fromEmail: string; smtpHost: string; smtpPort: number; smtpSecure: number;
  smtpUser: string; smtpPassEnc: string; smtpPassIv: string;
  smtpPassTag: string; isActive: number; createdAt: number; updatedAt: number;
}
export interface DecryptedSettings extends Omit<EmailSettings,"smtpPassEnc"|"smtpPassIv"|"smtpPassTag"> { smtpPass: string; }
export function getEmailSettings(userId: string): DecryptedSettings|null {
  const row=db.prepare(`SELECT * FROM email_settings WHERE userId = ?`).get(userId) as EmailSettings|undefined;
  if(!row)return null;
  return{...row,smtpPass:decrypt(row.smtpPassEnc,row.smtpPassIv,row.smtpPassTag)};
}