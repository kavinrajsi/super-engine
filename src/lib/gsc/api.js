// Google Search Console REST client + pure report transforms.
//   - listSites(token)                  -> properties the user owns
//   - searchAnalytics(token, site, body) -> raw Search Analytics rows
//   - buildReport(...)                   -> shaped { totals, deltas, top*, trend, strikingDistance }
//   - listSitemaps(token, siteUrl)       -> { sitemaps, totalSubmitted }
//   - inspectUrl(token, siteUrl, url)    -> per-URL indexing status via URL Inspection API
//   - buildIndexingReport(token, siteUrl) -> { sitemaps, totalSubmitted, inspections, summary }

const BASE = "https://www.googleapis.com/webmasters/v3";
const SC_BASE = "https://searchconsole.googleapis.com/v1";

async function scFetch(token, path, init = {}) {
  const res = await fetch(`${SC_BASE}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...init.headers },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json.error?.message || `Search Console API error (${res.status})`);
  }
  return json;
}

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

export async function listSitemaps(token, siteUrl) {
  const json = await gscFetch(token, `/sites/${encodeURIComponent(siteUrl)}/sitemaps`);
  const sitemapEntries = json.sitemap || [];
  let totalSubmitted = 0;
  const sitemaps = sitemapEntries.map((s) => {
    const webContents = (s.contents || []).filter((c) => c.type === "WEB");
    const submitted = webContents.reduce((n, c) => n + (parseInt(c.submitted, 10) || 0), 0);
    totalSubmitted += submitted;
    return { path: s.path, lastSubmitted: s.lastSubmitted || null, submitted };
  });
  return { sitemaps, totalSubmitted };
}

// Map URL Inspection API response fields to a human-readable reason + source pair.
// Priority order: specific pageFetchState wins over generic coverageState.
function deriveReason(result) {
  const { pageFetchState: pfs, robotsTxtState, indexingState, coverageState, googleCanonical, userCanonical } = result;
  if (pfs === "NOT_FOUND") return { reason: "Not found (404)", source: "Website" };
  if (pfs === "ACCESS_FORBIDDEN" || pfs === "ACCESS_DENIED") return { reason: "403 Forbidden", source: "Website" };
  if (pfs === "SERVER_ERROR") return { reason: "5xx server error", source: "Website" };
  if (pfs === "SOFT_404") return { reason: "Soft 404", source: "Website" };
  if (pfs === "BLOCKED_ROBOTS_TXT") return { reason: "Blocked by robots.txt", source: "Website" };
  if (robotsTxtState === "DISALLOWED") return { reason: "Blocked by robots.txt", source: "Website" };
  if (indexingState === "BLOCKED_BY_META_TAG" || indexingState === "BLOCKED_BY_HTTP_HEADER")
    return { reason: "Excluded by noindex", source: "Website" };
  if (pfs === "REDIRECT_ERROR") return { reason: "Page with redirect", source: "Website" };
  if (coverageState?.includes("Duplicate")) {
    if (userCanonical && googleCanonical && userCanonical !== googleCanonical)
      return { reason: "Duplicate, Google chose different canonical", source: "Google systems" };
    return { reason: "Duplicate without user-selected canonical", source: "Google systems" };
  }
  if (coverageState?.includes("Alternate")) return { reason: "Alternate page with proper canonical tag", source: "Website" };
  if (coverageState?.includes("Crawled")) return { reason: "Crawled – currently not indexed", source: "Google systems" };
  if (coverageState?.includes("Discovered")) return { reason: "Discovered – currently not indexed", source: "Google systems" };
  return { reason: coverageState || "Unknown", source: "Google systems" };
}

export async function inspectUrl(token, siteUrl, inspectionUrl) {
  const json = await scFetch(token, "/urlInspection/index:inspect", {
    method: "POST",
    body: JSON.stringify({ inspectionUrl, siteUrl, languageCode: "en-US" }),
  });
  const r = json.inspectionResult?.indexStatusResult || {};
  const indexed = r.verdict === "PASS";
  const { reason, source } = indexed ? { reason: null, source: null } : deriveReason(r);
  return {
    url: inspectionUrl,
    verdict: r.verdict || null,
    coverageState: r.coverageState || null,
    robotsTxtState: r.robotsTxtState || null,
    indexingState: r.indexingState || null,
    pageFetchState: r.pageFetchState || null,
    lastCrawlTime: r.lastCrawlTime || null,
    googleCanonical: r.googleCanonical || null,
    userCanonical: r.userCanonical || null,
    crawledAs: r.crawledAs || null,
    reason,
    source,
    indexed,
  };
}

export async function buildIndexingReport(token, siteUrl) {
  // Derive a fetchable origin from siteUrl (which may be "sc-domain:example.com")
  let origin;
  if (siteUrl.startsWith("sc-domain:")) {
    origin = `https://${siteUrl.slice("sc-domain:".length)}`;
  } else {
    origin = siteUrl.replace(/\/$/, "");
  }

  // Fetch sitemaps metadata and sitemap URLs in parallel
  const [sitemapMeta, sitemapData] = await Promise.all([
    listSitemaps(token, siteUrl).catch(() => ({ sitemaps: [], totalSubmitted: 0 })),
    import("../seo/sitemap.js").then((m) => m.fetchSitemap(origin)).catch(() => ({ urls: [] })),
  ]);

  // Sample up to 50 URLs, filtered to the property origin
  const prefix = origin.endsWith("/") ? origin : `${origin}/`;
  const allUrls = (sitemapData.urls || []).map((u) => (typeof u === "string" ? u : u.url)).filter(Boolean);
  const candidates = [...new Set(allUrls)]
    .filter((u) => u === origin || u.startsWith(prefix))
    .slice(0, 50);

  // Inspect all candidates in parallel (allSettled so one failure doesn't abort the rest)
  const settled = await Promise.allSettled(candidates.map((u) => inspectUrl(token, siteUrl, u)));
  const inspections = settled.map((r, i) =>
    r.status === "fulfilled"
      ? r.value
      : { url: candidates[i], verdict: null, reason: "Inspection failed", source: null, indexed: false, error: r.reason?.message }
  );

  // Aggregate reasons for non-indexed pages
  const byReason = {};
  inspections.filter((i) => !i.indexed).forEach((i) => {
    if (i.reason) byReason[i.reason] = (byReason[i.reason] || 0) + 1;
  });
  const indexed = inspections.filter((i) => i.indexed).length;

  return {
    sitemaps: sitemapMeta.sitemaps,
    totalSubmitted: sitemapMeta.totalSubmitted,
    inspections,
    summary: {
      total: inspections.length,
      indexed,
      notIndexed: inspections.length - indexed,
      byReason,
    },
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
