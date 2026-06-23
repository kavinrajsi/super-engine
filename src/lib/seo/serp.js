// Live SERP snapshot (actual Google rank for keywords) via a pluggable provider.
//
// GSC only reports a site's *own* average position; a live SERP snapshot means
// querying Google for a keyword and finding where the domain actually ranks —
// which needs a SERP provider (DataForSEO, SerpApi, …). Provider-agnostic and
// no-ops to { configured:false } until creds are set, so the UI shows a "connect
// a provider" card rather than failing.

import { domainOf, dataForSeoPost } from "./dataforseo";
import { candidateKeywords } from "./keywords";

// DataForSEO Google organic SERP defaults (US / English).
const SERP_LOCATION_CODE = 2840;
const SERP_LANGUAGE_CODE = "en";
const SERP_DEPTH = 50;

// Re-exported so existing importers can keep pulling it from here.
export { candidateKeywords };

export function serpProvider() {
  if (process.env.SERP_PROVIDER) return process.env.SERP_PROVIDER;
  if (process.env.DATAFORSEO_LOGIN && process.env.DATAFORSEO_PASSWORD) return "dataforseo";
  return null;
}

export function isSerpConfigured() {
  return !!serpProvider();
}

// --- DataForSEO live SERP ------------------------------------------------
// Is this organic item our domain? (exact host or a subdomain of it.)
function itemMatchesDomain(itemDomain, domain) {
  const d = (itemDomain || "").replace(/^www\./, "").toLowerCase();
  return d === domain || d.endsWith(`.${domain}`);
}

// One organic SERP lookup per keyword; find where `domain` ranks (top SERP_DEPTH).
async function fetchDataForSeo(domain, keywords) {
  return Promise.all(
    keywords.map(async (keyword) => {
      try {
        const result = await dataForSeoPost("/serp/google/organic/live/advanced", {
          keyword,
          location_code: SERP_LOCATION_CODE,
          language_code: SERP_LANGUAGE_CODE,
          depth: SERP_DEPTH,
        });
        const hit = (result?.items || []).find(
          (it) => it.type === "organic" && itemMatchesDomain(it.domain, domain)
        );
        return hit
          ? { keyword, position: hit.rank_group ?? hit.rank_absolute ?? null, url: hit.url || null, found: true }
          : { keyword, position: null, url: null, found: false };
      } catch {
        return { keyword, position: null, url: null, found: false };
      }
    })
  );
}

// Look up live organic rank for each keyword. Returns { configured, provider,
// fetchedAt, results:[{keyword, position, url, found}] } or { configured:false }.
export async function fetchSerp(input, keywords = []) {
  const provider = serpProvider();
  if (!provider) return { configured: false };

  const domain = domainOf(input);
  const kws = (Array.isArray(keywords) ? keywords : [keywords]).filter(Boolean).slice(0, 10);
  if (!kws.length) return { configured: true, provider, domain, results: [] };

  try {
    let results;
    if (provider === "dataforseo") results = await fetchDataForSeo(domain, kws);
    else results = kws.map((keyword) => ({ keyword, position: null, url: null, found: false }));
    return { configured: true, provider, domain, results };
  } catch (e) {
    return { configured: true, provider, domain, error: e.message };
  }
}

// Pivot stored serp_snapshot rows ([{ created_at, data:{results} }], oldest→newest)
// into per-keyword position series for charting rank movement over time.
// Returns { keywords: [{ keyword, points: [{ date, position }] }], dates: [...] }.
export function pivotSerpHistory(rows) {
  const series = new Map(); // keyword -> [{date, position}]
  const dates = [];
  for (const row of rows || []) {
    const date = (row.created_at instanceof Date ? row.created_at : new Date(row.created_at))
      .toISOString()
      .slice(0, 10);
    if (!dates.includes(date)) dates.push(date);
    for (const r of row.data?.results || []) {
      if (!r.keyword) continue;
      if (!series.has(r.keyword)) series.set(r.keyword, []);
      series.get(r.keyword).push({ date, position: r.position ?? null });
    }
  }
  return {
    dates,
    keywords: [...series.entries()].map(([keyword, points]) => ({ keyword, points })),
  };
}
