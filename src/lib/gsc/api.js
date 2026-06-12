// Google Search Console REST client + pure report transforms.
//   - listSites(token)                  -> properties the user owns
//   - searchAnalytics(token, site, body) -> raw Search Analytics rows
//   - buildReport(...)                   -> shaped { totals, deltas, top*, trend, strikingDistance }

const BASE = "https://www.googleapis.com/webmasters/v3";

async function gscFetch(token, path, init = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...init.headers },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json.error?.message || `Search Console API error (${res.status})`);
  }
  return json;
}

export async function listSites(token) {
  const json = await gscFetch(token, "/sites");
  return (json.siteEntry || [])
    .filter((s) => s.permissionLevel && s.permissionLevel !== "siteUnverifiedUser")
    .map((s) => s.siteUrl)
    .sort();
}

export function searchAnalytics(token, siteUrl, body) {
  return gscFetch(token, `/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

// ---- date helpers (YYYY-MM-DD) ----
function iso(d) {
  return d.toISOString().slice(0, 10);
}
function daysAgo(n) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d;
}
// Current window of `days` ending 2 days back (GSC data lags ~2 days), and the
// equal-length window immediately before it.
export function dateRanges(days) {
  const end = daysAgo(2);
  const start = daysAgo(2 + days - 1);
  const prevEnd = daysAgo(2 + days);
  const prevStart = daysAgo(2 + days * 2 - 1);
  return {
    current: { startDate: iso(start), endDate: iso(end) },
    previous: { startDate: iso(prevStart), endDate: iso(prevEnd) },
  };
}

// ---- pure transforms over Search Analytics rows ----
function rowToMetric(r) {
  return {
    clicks: r.clicks || 0,
    impressions: r.impressions || 0,
    ctr: r.ctr || 0,
    position: r.position || 0,
  };
}

export function topRows(json, label) {
  return (json.rows || []).map((r) => ({ key: r.keys?.[0] ?? "", [label]: r.keys?.[0] ?? "", ...rowToMetric(r) }));
}

export function totalsFromRows(json) {
  const rows = json.rows || [];
  const sum = (k) => rows.reduce((n, r) => n + (r[k] || 0), 0);
  const clicks = sum("clicks");
  const impressions = sum("impressions");
  // CTR/position are weighted by impressions across the date rows.
  const weighted = (k) =>
    impressions ? rows.reduce((n, r) => n + (r[k] || 0) * (r.impressions || 0), 0) / impressions : 0;
  return { clicks, impressions, ctr: weighted("ctr"), position: weighted("position") };
}

export function trendFromRows(json) {
  return (json.rows || []).map((r) => ({
    date: r.keys?.[0] ?? "",
    clicks: r.clicks || 0,
    impressions: r.impressions || 0,
  }));
}

// Queries hovering just off page one (avg position ~5–20) with real demand —
// the quickest ranking wins.
export function strikingDistance(json) {
  return (json.rows || [])
    .map((r) => ({ query: r.keys?.[0] ?? "", ...rowToMetric(r) }))
    .filter((r) => r.position >= 4.5 && r.position <= 20 && r.impressions >= 10)
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 25);
}

function delta(curr, prev) {
  return { value: curr, prev, change: curr - prev, pct: prev ? (curr - prev) / prev : null };
}

export function compareTotals(curr, prev) {
  return {
    clicks: delta(curr.clicks, prev.clicks),
    impressions: delta(curr.impressions, prev.impressions),
    ctr: delta(curr.ctr, prev.ctr),
    position: delta(curr.position, prev.position),
  };
}

// One round-trip per report: pull all the dimensions we need in parallel.
export async function buildReport(token, siteUrl, days) {
  const { current, previous } = dateRanges(days);
  const [byDate, prevByDate, queries, pages, strike] = await Promise.all([
    searchAnalytics(token, siteUrl, { ...current, dimensions: ["date"], rowLimit: 1000 }),
    searchAnalytics(token, siteUrl, { ...previous, dimensions: ["date"], rowLimit: 1000 }),
    searchAnalytics(token, siteUrl, { ...current, dimensions: ["query"], rowLimit: 25 }),
    searchAnalytics(token, siteUrl, { ...current, dimensions: ["page"], rowLimit: 25 }),
    searchAnalytics(token, siteUrl, { ...current, dimensions: ["query"], rowLimit: 250 }),
  ]);

  const totals = totalsFromRows(byDate);
  const prevTotals = totalsFromRows(prevByDate);
  return {
    range: current,
    days,
    totals,
    deltas: compareTotals(totals, prevTotals),
    trend: trendFromRows(byDate),
    topQueries: topRows(queries, "query"),
    topPages: topRows(pages, "page"),
    strikingDistance: strikingDistance(strike),
  };
}
