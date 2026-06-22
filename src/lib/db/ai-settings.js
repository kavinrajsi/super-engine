// Per-user AI provider settings (bring-your-own-key). The API key is stored
// encrypted (api_key_enc). All best-effort — no-ops when the DB is unavailable.

import { sql } from "../db";

async function getRow(userId) {
  const rows = userId
    ? await sql`SELECT * FROM ai_settings WHERE user_id = ${userId} LIMIT 1`
    : await sql`SELECT * FROM ai_settings WHERE user_id IS NULL ORDER BY updated_at DESC LIMIT 1`;
  return rows[0] || null;
}

// Returns { provider, model, api_key_enc } or null.
export async function getAiSettings(userId = null) {
  if (!sql) return null;
  try {
    return await getRow(userId);
  } catch {
    return null;
  }
}

// Manual upsert (handles both a real user_id and the NULL/anonymous row).
// apiKeyEnc === null means "leave the stored key unchanged".
export async function saveAiSettings(userId, { provider, model, apiKeyEnc = null }) {
  if (!sql) return null;
  try {
    const existing = await getRow(userId);
    if (existing) {
      const rows = await sql`
        UPDATE ai_settings
        SET provider = ${provider},
            model = ${model},
            api_key_enc = COALESCE(${apiKeyEnc}, api_key_enc),
            updated_at = now()
        WHERE id = ${existing.id}
        RETURNING *`;
      return rows[0] || null;
    }
    const rows = await sql`
      INSERT INTO ai_settings (user_id, provider, model, api_key_enc)
      VALUES (${userId}, ${provider}, ${model}, ${apiKeyEnc})
      RETURNING *`;
    return rows[0] || null;
  } catch {
    return null;
  }
}

// Clear the stored key (keeps the provider/model choice).
export async function clearAiKey(userId) {
  if (!sql) return false;
  try {
    const existing = await getRow(userId);
    if (!existing) return false;
    await sql`UPDATE ai_settings SET api_key_enc = NULL, updated_at = now() WHERE id = ${existing.id}`;
    return true;
  } catch {
    return false;
  }
}
