import crypto from "node:crypto";

/**
 * AES-256-GCM encryption for SMTP passwords stored in SQLite.
 *
 * Key source: NEXTAUTH_SECRET env var (already present in .env.local).
 * If NEXTAUTH_SECRET is too short, we SHA-256 it to get exactly 32 bytes.
 */

const ALGORITHM = "aes-256-gcm";
const KEY_LEN = 32; // bytes — AES-256
const IV_LEN = 12;  // bytes — recommended for GCM
const TAG_LEN = 16; // bytes

function deriveKey(secret: string): Buffer {
  const s = process.env.NEXTAUTH_SECRET ?? "fallback-dev-secret-change-in-production!!";
  // If it's long enough, use it directly; otherwise SHA-256 it to 32 bytes.
  if (s.length >= KEY_LEN) return Buffer.from(s.slice(0, KEY_LEN), "utf8");
  return crypto.createHash("sha256").update(s).digest();
}

const KEY = deriveKey(process.env.NEXTAUTH_SECRET ?? "");

/**
 * Encrypt a plaintext string.
 * Returns { enc, iv, tag } all as base64 strings.
 */
export function encrypt(plaintext: string): { enc: string; iv: string; tag: string } {
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv, { authTagLength: TAG_LEN });
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    enc: enc.toString("base64"),
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
  };
}

/**
 * Decrypt a ciphertext produced by encrypt().
 */
export function decrypt(enc: string, iv: string, tag: string): string {
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    KEY,
    Buffer.from(iv, "base64"),
    { authTagLength: TAG_LEN }
  );
  decipher.setAuthTag(Buffer.from(tag, "base64"));
  const dec = Buffer.concat([
    decipher.update(Buffer.from(enc, "base64")),
    decipher.final(),
  ]);
  return dec.toString("utf8");
}
