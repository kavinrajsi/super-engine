// Per-user Cloudflare API token (bring-your-own, read-only Analytics token).
// Stored AES-256-GCM encrypted (reusing the AI-key crypto); never returned to
// the client. All best-effort — no-ops without a DB.

import { sql } from "../db";
import { encrypt, decrypt } from "../ai/crypto";

async function getRow(userId) {
  const rows = userId
    ? await sql`SELECT * FROM cloudflare_settings WHERE user_id = ${userId} LIMIT 1`
    : await sql`SELECT * FROM cloudflare_settings WHERE user_id IS NULL ORDER BY updated_at DESC LIMIT 1`;
  return rows[0] || null;
}

export async function hasCloudflareToken(userId = null) {
  if (!sql) return false;
  try {
    return !!(await getRow(userId))?.token_enc;
  } catch {
    return false;
  }
}

// Returns the decrypted token string, or null.
export async function getCloudflareToken(userId = null) {
  if (!sql) return null;
  try {
    const row = await getRow(userId);
    return row?.token_enc ? decrypt(row.token_enc) : null;
  } catch {
    return null;
  }
}

export async function saveCloudflareToken(userId, token) {
  if (!sql) return false;
  try {
    const enc = encrypt(token);
    if (!enc) return false;
    const existing = await getRow(userId);
    if (existing) {
      await sql`UPDATE cloudflare_settings SET token_enc = ${enc}, updated_at = now() WHERE id = ${existing.id}`;
    } else {
      await sql`INSERT INTO cloudflare_settings (user_id, token_enc) VALUES (${userId}, ${enc})`;
    }
    return true;
  } catch {
    return false;
  }
}

export async function clearCloudflareToken(userId = null) {
  if (!sql) return false;
  try {
    const existing = await getRow(userId);
    if (!existing) return false;
    await sql`UPDATE cloudflare_settings SET token_enc = NULL, updated_at = now() WHERE id = ${existing.id}`;
    return true;
  } catch {
    return false;
  }
}
