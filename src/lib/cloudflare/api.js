// Cloudflare analytics client + pure transforms. Pulls Web Analytics (RUM) and
// zone HTTP traffic from the GraphQL Analytics API, with zone discovery via the
// REST API. Token is a user-supplied read-only Analytics token (Bearer auth).

const API_BASE = "https://api.cloudflare.com/client/v4";
const GRAPHQL = `${API_BASE}/graphql`;

// YYYY-MM-DD for `daysAgo` days back (0 = today), UTC.
function daysAgoIso(daysAgo) {
  const d = new Date(Date.now() - daysAgo * 86400000);
  return d.toISOString().slice(0, 10);
}

async function cloudflareRest(token, path) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(20_000),
  });
  return res.json().catch(() => ({ success: false }));
}

async function cloudflareGraphQL(token, query, variables) {
  const res = await fetch(GRAPHQL, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
    signal: AbortSignal.timeout(25_000),
  });
  const json = await res.json().catch(() => ({}));
  if (json.errors?.length) throw new Error(json.errors[0]?.message || "Cloudflare GraphQL error");
  return json.data;
}

// Is the token valid + active? (GET /user/tokens/verify)
export async function verifyToken(token) {
  try {
    const json = await cloudflareRest(token, "/user/tokens/verify");
    return !!json?.success && json?.result?.status === "active";
  } catch {
    return false;
  }
}

// Find the zone matching a domain on the user's account. Returns { id, name } | null.
export async function findZone(token, domain) {
  if (!domain) return null;
  try {
    const json = await cloudflareRest(token, `/zones?name=${encodeURIComponent(domain)}&status=active`);
    const z = json?.result?.[0];
    return z ? { id: z.id, name: z.name } : null;
  } catch {
    return null;
  }
}

// Web Analytics (RUM): page views (count) + visits, daily.
async function webAnalytics(token, zoneTag, days) {
  const query = `query($zoneTag:String!,$start:Date!,$end:Date!){
    viewer{ zones(filter:{zoneTag:$zoneTag}){
      rumPageloadEventsAdaptiveGroups(filter:{date_geq:$start,date_leq:$end}, limit:1000, orderBy:[date_ASC]){
        count
        sum{ visits }
        dimensions{ date }
      }
    }}
  }`;
  const data = await cloudflareGraphQL(token, query, { zoneTag, start: daysAgoIso(days), end: daysAgoIso(0) });
  const groups = data?.viewer?.zones?.[0]?.rumPageloadEventsAdaptiveGroups || [];
  const trend = groups.map((g) => ({
    date: g.dimensions.date,
    pageViews: g.count || 0,
    visits: g.sum?.visits || 0,
  }));
  return {
    totals: {
      pageViews: trend.reduce((n, d) => n + d.pageViews, 0),
      visits: trend.reduce((n, d) => n + d.visits, 0),
    },
    trend,
  };
}

// Zone HTTP traffic: requests, bandwidth, cache, threats — daily (httpRequests1dGroups).
async function zoneHttp(token, zoneTag, days) {
  const query = `query($zoneTag:String!,$start:String!,$end:String!){
    viewer{ zones(filter:{zoneTag:$zoneTag}){
      httpRequests1dGroups(filter:{date_geq:$start,date_leq:$end}, limit:1000, orderBy:[date_ASC]){
        dimensions{ date }
        sum{ requests bytes cachedRequests threats }
        uniq{ uniques }
      }
    }}
  }`;
  const data = await cloudflareGraphQL(token, query, { zoneTag, start: daysAgoIso(days), end: daysAgoIso(0) });
  const groups = data?.viewer?.zones?.[0]?.httpRequests1dGroups || [];
  const trend = groups.map((g) => ({
    date: g.dimensions.date,
    requests: g.sum?.requests || 0,
    bytes: g.sum?.bytes || 0,
    cachedRequests: g.sum?.cachedRequests || 0,
    threats: g.sum?.threats || 0,
    uniques: g.uniq?.uniques || 0,
  }));
  const requests = trend.reduce((n, d) => n + d.requests, 0);
  const cached = trend.reduce((n, d) => n + d.cachedRequests, 0);
  return {
    totals: {
      requests,
      bytes: trend.reduce((n, d) => n + d.bytes, 0),
      threats: trend.reduce((n, d) => n + d.threats, 0),
      uniques: trend.reduce((n, d) => n + d.uniques, 0),
      cacheRatio: requests ? cached / requests : null,
    },
    trend,
  };
}

// Build the combined report for a domain. Resolves the zone, then pulls both
// datasets (each tolerated independently). Returns { connected, zone, webAnalytics,
// zoneHttp } or { error } / { zoneFound:false }.
export async function buildCloudflareReport(token, domain, days = 28) {
  const zone = await findZone(token, domain);
  if (!zone) return { zoneFound: false, domain };
  const [wa, zh] = await Promise.all([
    webAnalytics(token, zone.id, days).catch(() => null),
    zoneHttp(token, zone.id, days).catch(() => null),
  ]);
  return { zoneFound: true, zone, days, webAnalytics: wa, zoneHttp: zh };
}
