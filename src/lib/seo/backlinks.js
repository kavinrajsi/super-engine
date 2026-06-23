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

import { dataForSeoPost, domainOf, toNumber } from "./dataforseo";

export { domainOf }; // re-export for existing importers

// Which provider to use. Explicit env wins; otherwise infer from creds present.
export function backlinksProvider() {
  if (process.env.BACKLINKS_PROVIDER) return process.env.BACKLINKS_PROVIDER;
  if (process.env.DATAFORSEO_LOGIN && process.env.DATAFORSEO_PASSWORD) return "dataforseo";
  return null;
}

export function isBacklinksConfigured() {
  return !!backlinksProvider();
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

async function fetchDataForSeo(domain) {
  // Headline summary + a short referring-domains list, in parallel.
  const [summary, refDomains] = await Promise.all([
    dataForSeoPost("/backlinks/summary/live", { target: domain, internal_list_limit: 0, backlinks_status_type: "live" }),
    dataForSeoPost("/backlinks/referring_domains/live", {
      target: domain,
      limit: 10,
      order_by: ["rank,desc"],
      backlinks_status_type: "live",
    }).catch(() => null),
  ]);

  const attrs = summary?.referring_links_attributes || {};
  const data = {
    referringDomains: toNumber(summary?.referring_domains),
    backlinks: toNumber(summary?.backlinks),
    dofollow: toNumber(attrs.dofollow ?? summary?.referring_domains_nofollow != null
      ? toNumber(summary?.referring_domains) - toNumber(summary?.referring_domains_nofollow)
      : null),
    nofollow: toNumber(attrs.nofollow ?? summary?.referring_domains_nofollow),
    domainRating: toNumber(summary?.rank),
    rank: toNumber(summary?.rank),
  };

  const topReferrers = (refDomains?.items || [])
    .map((it) => ({ domain: it.domain, backlinks: toNumber(it.backlinks), rank: toNumber(it.rank) }))
    .filter((r) => r.domain);

  return { ...data, topReferrers };
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
