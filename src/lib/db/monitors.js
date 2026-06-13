// Scheduled-monitor persistence. All best-effort — no-op (null/[]) when the DB
// is unavailable. Score history is read from the `scans` table; this module
// only owns the monitor config + last-observed scores.

import { sql } from "../db";

const CADENCE_DAYS = { daily: 1, weekly: 7, monthly: 30 };

export async function listMonitors(userId) {
  if (!sql || !userId) return [];
  try {
    return await sql`
      SELECT id, url, deep, cadence, enabled, last_run_at, last_score, last_ai_overall, created_at
      FROM monitors WHERE user_id = ${userId} ORDER BY created_at DESC`;
  } catch {
    return [];
  }
}

export async function addMonitor(userId, { url, deep = false, cadence = "weekly" }) {
  if (!sql || !userId || !url) return null;
  const c = CADENCE_DAYS[cadence] ? cadence : "weekly";
  try {
    const rows = await sql`
      INSERT INTO monitors (user_id, url, deep, cadence)
      VALUES (${userId}, ${url}, ${deep}, ${c})
      RETURNING id`;
    return rows[0]?.id || null;
  } catch {
    return null;
  }
}

export async function deleteMonitor(userId, id) {
  if (!sql || !userId || !id) return;
  try {
    await sql`DELETE FROM monitors WHERE id = ${id} AND user_id = ${userId}`;
  } catch {
    /* best-effort */
  }
}

export async function setMonitorEnabled(userId, id, enabled) {
  if (!sql || !userId || !id) return;
  try {
    await sql`UPDATE monitors SET enabled = ${!!enabled} WHERE id = ${id} AND user_id = ${userId}`;
  } catch {
    /* best-effort */
  }
}

// Monitors whose cadence window has elapsed (or which have never run). Joins the
// owner's email for alerting. Used by the cron route.
export async function dueMonitors(limit = 50) {
  if (!sql) return [];
  try {
    return await sql`
      SELECT m.id, m.user_id, m.url, m.deep, m.cadence, m.last_score, m.last_ai_overall,
             u.email AS user_email
      FROM monitors m
      JOIN users u ON u.id = m.user_id
      WHERE m.enabled = true
        AND (
          m.last_run_at IS NULL
          OR m.last_run_at < now() - (
            CASE m.cadence WHEN 'daily' THEN interval '1 day'
                           WHEN 'monthly' THEN interval '30 days'
                           ELSE interval '7 days' END
          )
        )
      ORDER BY m.last_run_at ASC NULLS FIRST
      LIMIT ${limit}`;
  } catch {
    return [];
  }
}

// Record the outcome of a monitor run (called by the cron route after re-scan).
export async function recordMonitorRun(id, { score, aiOverall }) {
  if (!sql || !id) return;
  try {
    await sql`
      UPDATE monitors
      SET last_run_at = now(), last_score = ${score ?? null}, last_ai_overall = ${aiOverall ?? null}
      WHERE id = ${id}`;
  } catch {
    /* best-effort */
  }
}
