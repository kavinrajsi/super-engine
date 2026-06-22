// At-rest encryption for user-supplied AI provider API keys (AES-256-GCM).
//
// The 32-byte key is derived from AI_KEY_SECRET (falling back to
// GOOGLE_CLIENT_SECRET so prod works without an extra env). Mirrors the GSC
// token encryption in src/lib/gsc/tokens.js. A DB leak alone doesn't expose
// the plaintext keys.

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

function key() {
  const secret = process.env.AI_KEY_SECRET || process.env.GOOGLE_CLIENT_SECRET || "";
  return createHash("sha256").update(secret).digest();
}

export function encrypt(plain) {
  if (plain == null || plain === "") return null;
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const enc = Buffer.concat([cipher.update(String(plain), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64url")}.${tag.toString("base64url")}.${enc.toString("base64url")}`;
}

export function decrypt(blob) {
  if (!blob) return null;
  try {
    const [ivB, tagB, dataB] = blob.split(".");
    const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(ivB, "base64url"));
    decipher.setAuthTag(Buffer.from(tagB, "base64url"));
    return Buffer.concat([
      decipher.update(Buffer.from(dataB, "base64url")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    return null;
  }
}
