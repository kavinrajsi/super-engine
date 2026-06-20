// Best-effort persistence for the computed records (GSC reports + connections,
// performance runs). Every function no-ops when Neon (sql) isn't configured and
// swallows errors — saving a record must never break a response.

import { sql } from "../db";

// One row per Search Console report pull.
export async function saveGscReport({ sessionId, email, siteUrl, days, report }) {
  if (!sql || !report) return;
  try {
    await sql`
      INSERT INTO gsc_reports
        (session_id, email, site_url, days, range_start, range_end, clicks, impressions, report)
      VALUES (
        ${sessionId || null}, ${email || null}, ${siteUrl}, ${days},
        ${report.range?.startDate || null}, ${report.range?.endDate || null},
        ${Math.round(report.totals?.clicks || 0)}, ${Math.round(report.totals?.impressions || 0)},
        ${JSON.stringify(report)}::jsonb
      )`;
  } catch {
    /* best-effort */
  }
}

// Upsert the connected account + its property list (latest known per session).
export async function saveGscConnection({ sessionId, email, properties }) {
  if (!sql || !sessionId) return;
  try {
    await sql`
      INSERT INTO gsc_connections (session_id, email, properties, updated_at)
      VALUES (${sessionId}, ${email || null}, ${JSON.stringify(properties || [])}::jsonb, now())
      ON CONFLICT (session_id) DO UPDATE SET
        email = EXCLUDED.email,
        properties = EXCLUDED.properties,
        updated_at = now()`;
  } catch {
    /* best-effort */
  }
}

// One row per GA4 (Analytics) report pull (history + trends over time).
export async function saveGaReport({ sessionId, email, property, days, report }) {
  if (!sql || !report) return;
  try {
    await sql`
      INSERT INTO ga_reports
        (session_id, email, property, days, range_start, range_end, active_users, sessions, report)
      VALUES (
        ${sessionId || null}, ${email || null}, ${property}, ${days},
        ${report.range?.startDate || null}, ${report.range?.endDate || null},
        ${Math.round(report.totals?.activeUsers || 0)}, ${Math.round(report.totals?.sessions || 0)},
        ${JSON.stringify(report)}::jsonb
      )`;
  } catch {
    /* best-effort */
  }
}

// One row per PageSpeed test run.
export async function savePerformanceRun({ url, strategy, result }) {
  if (!sql || !result) return;
  try {
    await sql`
      INSERT INTO performance_runs (url, strategy, performance, result)
      VALUES (${url}, ${strategy}, ${result.scores?.performance ?? null}, ${JSON.stringify(result)}::jsonb)`;
  } catch {
    /* best-effort */
  }
}

// --- Backlinks / SERP snapshots (external provider, TTL-reused) ---

export async function saveBacklinksSnapshot({ domain, provider, data }) {
  if (!sql || !domain || !data) return;
  try {
    await sql`
      INSERT INTO backlinks_snapshots (domain, provider, data)
      VALUES (${domain}, ${provider || null}, ${JSON.stringify(data)}::jsonb)`;
  } catch {
    /* best-effort */
  }
}

export async function latestBacklinksSnapshot(domain, maxAgeMins = 1440) {
  if (!sql || !domain) return null;
  try {
    const rows = await sql`
      SELECT data FROM backlinks_snapshots
      WHERE domain = ${domain} AND created_at > now() - make_interval(mins => ${maxAgeMins})
      ORDER BY created_at DESC LIMIT 1`;
    return rows[0]?.data || null;
  } catch {
    return null;
  }
}

export async function saveSerpSnapshot({ domain, provider, data }) {
  if (!sql || !domain || !data) return;
  try {
    await sql`
      INSERT INTO serp_snapshots (domain, provider, data)
      VALUES (${domain}, ${provider || null}, ${JSON.stringify(data)}::jsonb)`;
  } catch {
    /* best-effort */
  }
}

export async function latestSerpSnapshot(domain, maxAgeMins = 1440) {
  if (!sql || !domain) return null;
  try {
    const rows = await sql`
      SELECT data FROM serp_snapshots
      WHERE domain = ${domain} AND created_at > now() - make_interval(mins => ${maxAgeMins})
      ORDER BY created_at DESC LIMIT 1`;
    return rows[0]?.data || null;
  } catch {
    return null;
  }
}

