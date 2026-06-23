// Tracks which users have already been sent today's email digest, so the digest
// cron is idempotent (safe to re-run). Best-effort: no-ops without a DB.

import { sql } from "../db";

// Claim today's digest slot for a user. Returns true only on the FIRST call
// today (the row was newly inserted) — callers should send the email only then.
// Weekly-digest recipients: users with an email + a saved site (their most
// recently used profile's URL). Bounded for the cron.
export async function weeklyDigestRecipients(limit = 50) {
  if (!sql) return [];
  try {
    return await sql`
      SELECT DISTINCT ON (u.id) u.id AS user_id, u.email, p.website_url
      FROM users u
      JOIN brand_profiles p ON p.user_id = u.id
        AND p.website_url IS NOT NULL AND p.website_url <> ''
      WHERE u.email IS NOT NULL
      ORDER BY u.id, p.last_used_at DESC NULLS LAST
      LIMIT ${limit}`;
  } catch {
    return [];
  }
}

export async function markDigestSent(userId, kind = "daily") {
  if (!sql || userId == null) return false;
  try {
    const rows = await sql`
      INSERT INTO digests (user_id, kind, sent_date)
      VALUES (${userId}, ${kind}, current_date)
      ON CONFLICT (user_id, kind, sent_date) DO NOTHING
      RETURNING user_id`;
    return rows.length > 0;
  } catch {
    return false;
  }
}
