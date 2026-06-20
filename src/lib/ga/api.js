// Google Analytics (GA4) REST client + pure report transforms.
//   - listProperties(token)              -> GA4 properties the user can access
//   - runReport(token, property, body)   -> raw Data API report
//   - buildGaReport(token, property, days) -> shaped { totals, deltas, trend, top* }
//
// Two Google APIs are involved (both covered by analytics.readonly):
//   Admin API (analyticsadmin) — accountSummaries, to discover properties.
//   Data API  (analyticsdata)  — runReport, for the metrics themselves.

const ADMIN_BASE = "https://analyticsadmin.googleapis.com/v1beta";
const DATA_BASE = "https://analyticsdata.googleapis.com/v1beta";

async function gaFetch(base, token, path, init = {}) {
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...init.headers },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json.error?.message || `Analytics API error (${res.status})`);
  }
  return json;
}

// Flatten accountSummaries -> a flat list of { property, displayName, account }.
// `property` is the resource name ("properties/123456") used by the Data API.
export async function listProperties(token) {
  const json = await gaFetch(ADMIN_BASE, token, "/accountSummaries?pageSize=200");
  const out = [];
  for (const acct of json.accountSummaries || []) {
    for (const p of acct.propertySummaries || []) {
      if (!p.property) continue;
      out.push({
        property: p.property,
        displayName: p.displayName || p.property,
        account: acct.displayName || "",
      });
    }
  }
  return out.sort((a, b) => a.displayName.localeCompare(b.displayName));
}

export function runReport(token, property, body) {
  // property is "properties/123456"; the Data API path is <property>:runReport.
  return gaFetch(DATA_BASE, token, `/${property}:runReport`, {
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
// Current window of `days` ending yesterday (GA4 same-day data is incomplete),
// and the equal-length window immediately before it for deltas.
export function dateRanges(days) {
  const end = daysAgo(1);
  const start = daysAgo(days);
  const prevEnd = daysAgo(days + 1);
  const prevStart = daysAgo(days * 2);
  return {
    current: { startDate: iso(start), endDate: iso(end) },
    previous: { startDate: iso(prevStart), endDate: iso(prevEnd) },
  };
}

// The metric set we pull for the summary cards. Conservative — every GA4
// property has these, so runReport never 400s on a missing custom metric.
const SUMMARY_METRICS = [
  "activeUsers",
  "sessions",
  "screenPageViews",
  "engagementRate",
  "averageSessionDuration",
];

// ---- pure transforms over Data API responses ----

// Map a single report row to { metricName: number } using the header order.
function rowToMetrics(headers, row) {
  const out = {};
  (headers || []).forEach((h, i) => {
    out[h.name] = Number(row.metricValues?.[i]?.value || 0);
  });
  return out;
}

// A no-dimension report returns one totals row; GA computes rates/averages
// correctly there, so we don't have to weight them ourselves.
export function totalsFromReport(json) {
  const headers = json.metricHeaders || [];
  const row = (json.rows || [])[0];
  const base = { activeUsers: 0, sessions: 0, screenPageViews: 0, engagementRate: 0, averageSessionDuration: 0 };
  return row ? { ...base, ...rowToMetrics(headers, row) } : base;
}

// GA4 date dimension comes back as "YYYYMMDD"; chart wants "YYYY-MM-DD".
function fmtDate(s) {
  return s && s.length === 8 ? `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}` : s;
}

export function trendFromReport(json) {
  const headers = json.metricHeaders || [];
  return (json.rows || [])
    .map((r) => ({ date: fmtDate(r.dimensionValues?.[0]?.value), ...rowToMetrics(headers, r) }))
    .sort((a, b) => (a.date < b.date ? -1 : 1));
}

// Top rows keyed by the (single) dimension value: { key, label: key, ...metrics }.
export function topRows(json, label) {
  const headers = json.metricHeaders || [];
  return (json.rows || []).map((r) => {
    const key = r.dimensionValues?.[0]?.value ?? "";
    return { key, [label]: key, ...rowToMetrics(headers, r) };
  });
}

function delta(curr, prev) {
  return { value: curr, prev, change: curr - prev, pct: prev ? (curr - prev) / prev : null };
}

export function compareTotals(curr, prev) {
  const out = {};
  for (const m of SUMMARY_METRICS) out[m] = delta(curr[m] || 0, prev[m] || 0);
  return out;
}

// One report per dimension we need, all in parallel.
export async function buildGaReport(token, property, days) {
  const { current, previous } = dateRanges(days);
  const metrics = SUMMARY_METRICS.map((name) => ({ name }));

  const totalsBody = (range) => ({ dateRanges: [range], metrics });
  const dimBody = (range, dimension, metricNames, limit) => ({
    dateRanges: [range],
    dimensions: [{ name: dimension }],
    metrics: metricNames.map((name) => ({ name })),
    orderBys: [{ metric: { metricName: metricNames[0] }, desc: true }],
    limit,
  });

  const [totalsR, prevTotalsR, trendR, pagesR, channelsR, countriesR] = await Promise.all([
    runReport(token, property, totalsBody(current)),
    runReport(token, property, totalsBody(previous)),
    runReport(token, property, {
      dateRanges: [current],
      dimensions: [{ name: "date" }],
      metrics: [{ name: "activeUsers" }, { name: "sessions" }, { name: "screenPageViews" }],
      orderBys: [{ dimension: { dimensionName: "date" } }],
      limit: 1000,
    }),
    runReport(token, property, dimBody(current, "pagePath", ["screenPageViews", "activeUsers"], 25)),
    runReport(token, property, dimBody(current, "sessionDefaultChannelGroup", ["sessions", "activeUsers"], 12)),
    runReport(token, property, dimBody(current, "country", ["activeUsers", "sessions"], 12)),
  ]);

  const totals = totalsFromReport(totalsR);
  const prevTotals = totalsFromReport(prevTotalsR);
  return {
    range: current,
    days,
    totals,
    deltas: compareTotals(totals, prevTotals),
    trend: trendFromReport(trendR),
    topPages: topRows(pagesR, "page"),
    topChannels: topRows(channelsR, "channel"),
    topCountries: topRows(countriesR, "country"),
  };
}

// Channel-group names GA4 reports that we treat as "AI assistant" traffic
// (LLM-driven referrals). GA has no native AI channel, so this is best-effort.
const AI_CHANNEL_RE = /\b(ai|assistant|llm|chatgpt|gemini|perplexity|copilot)\b/i;

// Combine a GSC report (search impressions/clicks) and a GA4 report (sessions/
// users + channel mix) into the okara-style "how people found you" funnel plus a
// channel breakdown. Pure: both args are the shaped report objects from
// buildReport (gsc) and buildGaReport (ga); either may be null.
export function buildTrafficFunnel(gscReport, gaReport) {
  const impressions = gscReport?.totals?.impressions ?? null;
  const searchClicks = gscReport?.totals?.clicks ?? null;
  const sessions = gaReport?.totals?.sessions ?? null;
  const users = gaReport?.totals?.activeUsers ?? null;

  const stages = [
    { key: "impressions", label: "Saw you in Google", value: impressions },
    { key: "clicks", label: "Clicked through", value: searchClicks },
    { key: "sessions", label: "Visited your site", value: sessions },
    { key: "users", label: "Unique visitors", value: users },
  ].filter((s) => s.value != null);

  // Rates between adjacent known stages.
  const ctr =
    impressions && searchClicks != null ? searchClicks / impressions : null;

  const channelRows = gaReport?.topChannels || [];
  const channelTotal = channelRows.reduce((n, c) => n + (c.sessions || 0), 0);
  const channels = channelRows.map((c) => ({
    name: c.channel || c.key || "(other)",
    sessions: c.sessions || 0,
    share: channelTotal ? (c.sessions || 0) / channelTotal : 0,
  }));

  const aiAssistant = channels
    .filter((c) => AI_CHANNEL_RE.test(c.name))
    .reduce((n, c) => n + c.sessions, 0);

  return {
    stages,
    ctr,
    channels,
    aiAssistant: { sessions: aiAssistant, share: channelTotal ? aiAssistant / channelTotal : 0 },
    hasSearch: !!gscReport,
    hasAnalytics: !!gaReport,
  };
}
