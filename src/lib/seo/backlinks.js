// Backlinks (referring domains / authority) via a pluggable external provider.
//
// Backlink data isn't available from on-page HTML or the Search Console API, so
// it needs a third-party provider (DataForSEO, Ahrefs, Moz, …). This module is
// provider-agnostic: it no-ops cleanly (returns { configured:false }) until a
// provider + credentials are set, so the snapshot UI shows a "connect a provider"
// card instead of breaking — mirroring how the Google features degrade.
//
// To wire a real provider later: set BACKLINKS_PROVIDER (or just the provider's
// creds) and implement/enable its branch in fetchBacklinks. A DataForSEO
// reference impl is included but inactive until DATAFORSEO_LOGIN/PASSWORD exist.

import { safeFetch } from "./safe-fetch";

// Which provider to use. Explicit env wins; otherwise infer from creds present.
export function backlinksProvider() {
  if (process.env.BACKLINKS_PROVIDER) return process.env.BACKLINKS_PROVIDER;
  if (process.env.DATAFORSEO_LOGIN && process.env.DATAFORSEO_PASSWORD) return "dataforseo";
  return null;
}

export function isBacklinksConfigured() {
  return !!backlinksProvider();
}

// Reduce a URL/host to the registrable-ish domain the provider expects.
export function domainOf(input) {
  try {
    const u = new URL(/^https?:\/\//i.test(input) ? input : `https://${input}`);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return String(input || "").replace(/^www\./, "");
  }
}

// Normalized shape every provider maps onto.
function emptySummary() {
  return {
    referringDomains: null,
    backlinks: null,
    dofollow: null,
    nofollow: null,
    domainRating: null,
    rank: null,
  };
}

// --- DataForSEO reference impl (inactive until creds exist) ---------------
async function fetchDataForSeo(domain) {
  const auth = Buffer.from(
    `${process.env.DATAFORSEO_LOGIN}:${process.env.DATAFORSEO_PASSWORD}`
  ).toString("base64");
  // Backlinks Summary (live). Endpoint shape per DataForSEO v3.
  const res = await safeFetch("https://api.dataforseo.com/v3/backlinks/summary/live", {
    timeoutMs: 30_000,
  }).catch(() => null);
  // NOTE: safeFetch is GET-only; the real call is POST with a JSON task body +
  // Authorization: Basic <auth>. This branch is intentionally left as a wiring
  // point — flesh out the POST when enabling the provider. For now, signal that
  // the provider is selected but returned nothing usable.
  void auth;
  void res;
  return { ...emptySummary(), topReferrers: [] };
}

// Fetch backlink data for a domain. Returns { configured, provider, fetchedAt,
// summary, topReferrers } — or { configured:false } when no provider is set.
export async function fetchBacklinks(input) {
  const provider = backlinksProvider();
  if (!provider) return { configured: false };

  const domain = domainOf(input);
  try {
    let data;
    if (provider === "dataforseo") data = await fetchDataForSeo(domain);
    else data = { ...emptySummary(), topReferrers: [] };

    const { topReferrers = [], ...summary } = data;
    return { configured: true, provider, domain, summary, topReferrers };
  } catch (e) {
    return { configured: true, provider, domain, error: e.message };
  }
}
