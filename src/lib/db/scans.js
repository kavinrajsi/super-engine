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

// Most recent saved scan for a URL within the last `maxAgeMins`, scoped to the
// user (or anonymous rows when userId is null). Powers the /seo dashboard's
// "reuse a recent audit instead of re-scanning on every property switch".
//
// `urls` is one URL or a list of candidates (the stored `url` is the canonical
// rootUrl, which can differ from the requested URL after a www/https redirect —
// the caller passes the likely variants so the cache still hits).
export async function latestScanForUrl(urls, userId = null, maxAgeMins = 60) {
  const candidates = (Array.isArray(urls) ? urls : [urls]).filter(Boolean);
  if (!sql || !candidates.length) return null;
  try {
    const rows = userId
      ? await sql`
          SELECT result FROM scans
          WHERE url = ANY(${candidates}) AND user_id = ${userId}
            AND created_at > now() - make_interval(mins => ${maxAgeMins})
          ORDER BY created_at DESC LIMIT 1`
      : await sql`
          SELECT result FROM scans
          WHERE url = ANY(${candidates}) AND user_id IS NULL
            AND created_at > now() - make_interval(mins => ${maxAgeMins})
          ORDER BY created_at DESC LIMIT 1`;
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
