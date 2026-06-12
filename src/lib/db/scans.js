// Scan persistence: save a scan (returns a share token), load by token, list recent.
// All best-effort — returns null/[] when the DB is unavailable.

import { randomBytes } from "crypto";
import { sql } from "../db";

function makeToken() {
  return randomBytes(8).toString("base64url").slice(0, 10);
}

export async function saveScan(result, userId = null) {
  if (!sql) return null;
  const token = makeToken();
  try {
    await sql`
      INSERT INTO scans (share_token, url, site_score, ai_overall, pages_count, result, user_id)
      VALUES (
        ${token},
        ${result.rootUrl},
        ${result.siteScore ?? null},
        ${result.aiReadiness?.overall ?? null},
        ${result.pages?.length ?? 0},
        ${JSON.stringify(result)}::jsonb,
        ${userId}
      )`;
    return token;
  } catch {
    return null;
  }
}

export async function getScanByToken(token) {
  if (!sql) return null;
  try {
    const rows = await sql`SELECT result FROM scans WHERE share_token = ${token} LIMIT 1`;
    return rows[0]?.result || null;
  } catch {
    return null;
  }
}

// Recent scans for one user (history is a Pro feature, scoped per user).
export async function recentScans(userId, limit = 30) {
  if (!sql || !userId) return [];
  try {
    return await sql`
      SELECT share_token, url, site_score, ai_overall, pages_count, created_at
      FROM scans WHERE user_id = ${userId} ORDER BY created_at DESC LIMIT ${limit}`;
  } catch {
    return [];
  }
}
