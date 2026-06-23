// Per-visitor GSC token storage (Neon) + at-rest encryption for refresh tokens.
//
// Keyed by a random session id held in an httpOnly cookie. The refresh token is
// encrypted with AES-256-GCM using a key derived from GOOGLE_CLIENT_SECRET, so
// no extra env var is needed and a DB leak alone doesn't expose refresh tokens.
// Everything no-ops when Neon (sql) isn't configured.

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";
import { sql } from "../db";
import { refreshAccessToken } from "./oauth";

function key() {
  // 32-byte key from the client secret (stable, secret, already required).
  return createHash("sha256").update(process.env.GOOGLE_CLIENT_SECRET || "").digest();
}

export function encrypt(plain) {
  if (plain == null) return null;
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const enc = Buffer.concat([cipher.update(String(plain), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  // iv.tag.ciphertext, all base64url.
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

export function newSessionId() {
  return randomBytes(24).toString("base64url");
}

// Persist a fresh OAuth grant. `tokens` is Google's token-endpoint response.
export async function saveTokens(sessionId, tokens, email) {
  if (!sql) return false;
  const expiry = new Date(Date.now() + (tokens.expires_in || 3600) * 1000);
  const refreshEnc = encrypt(tokens.refresh_token);
  await sql`
    INSERT INTO gsc_tokens (session_id, email, access_token, access_expiry, refresh_token_enc, scope, updated_at)
    VALUES (${sessionId}, ${email}, ${tokens.access_token}, ${expiry.toISOString()},
            ${refreshEnc}, ${tokens.scope || null}, now())
    ON CONFLICT (session_id) DO UPDATE SET
      email = EXCLUDED.email,
      access_token = EXCLUDED.access_token,
      access_expiry = EXCLUDED.access_expiry,
      -- keep the existing refresh token if Google didn't return a new one
      refresh_token_enc = COALESCE(EXCLUDED.refresh_token_enc, gsc_tokens.refresh_token_enc),
      scope = EXCLUDED.scope,
      updated_at = now()`;
  return true;
}

// Associate a GSC session with the signed-in app user, so background jobs can
// later find this user's token by user_id. Called from the OAuth callback when
// a user is logged in (GSC connect itself isn't login-gated).
export async function setTokenUser(sessionId, userId) {
  if (!sql || !sessionId || userId == null) return;
  try {
    await sql`UPDATE gsc_tokens SET user_id = ${userId} WHERE session_id = ${sessionId}`;
  } catch {
    /* best-effort */
  }
}

// Live access token for a user (newest linked session) — for crons with no
// cookie. Returns null when the user never connected GSC while logged in.
export async function getValidAccessTokenByUserId(userId) {
  if (!sql || userId == null) return null;
  try {
    const rows = await sql`
      SELECT session_id FROM gsc_tokens
      WHERE user_id = ${userId} ORDER BY updated_at DESC LIMIT 1`;
    return rows[0]?.session_id ? getValidAccessToken(rows[0].session_id) : null;
  } catch {
    return null;
  }
}

export async function deleteTokens(sessionId) {
  if (!sql || !sessionId) return;
  await sql`DELETE FROM gsc_tokens WHERE session_id = ${sessionId}`;
}

export async function getSession(sessionId) {
  if (!sql || !sessionId) return null;
  const rows = await sql`SELECT * FROM gsc_tokens WHERE session_id = ${sessionId} LIMIT 1`;
  return rows[0] || null;
}

// Return a live access token for this session, refreshing + persisting when the
// stored one is expired (or about to). Returns null when not connected.
export async function getValidAccessToken(sessionId) {
  const row = await getSession(sessionId);
  if (!row) return null;

  const expiresAt = row.access_expiry ? new Date(row.access_expiry).getTime() : 0;
  if (row.access_token && expiresAt - Date.now() > 60_000) {
    return { accessToken: row.access_token, email: row.email };
  }

  const refreshToken = decrypt(row.refresh_token_enc);
  if (!refreshToken) return null;

  const refreshed = await refreshAccessToken(refreshToken);
  const expiry = new Date(Date.now() + (refreshed.expires_in || 3600) * 1000);
  await sql`
    UPDATE gsc_tokens
    SET access_token = ${refreshed.access_token}, access_expiry = ${expiry.toISOString()}, updated_at = now()
    WHERE session_id = ${sessionId}`;
  return { accessToken: refreshed.access_token, email: row.email };
}
