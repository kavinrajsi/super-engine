// Tracks which users have already been sent today's email digest, so the digest
// cron is idempotent (safe to re-run). Best-effort: no-ops without a DB.

import { sql } from "../db";

// Claim today's digest slot for a user. Returns true only on the FIRST call
// today (the row was newly inserted) — callers should send the email only then.
export async function markDigestSent(userId) {
  if (!sql || userId == null) return false;
  try {
    const rows = await sql`
      INSERT INTO digests (user_id, sent_date)
      VALUES (${userId}, current_date)
      ON CONFLICT (user_id, sent_date) DO NOTHING
      RETURNING user_id`;
    return rows.length > 0;
  } catch {
    return false;
  }
}
