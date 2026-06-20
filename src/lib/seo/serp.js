// Live SERP snapshot (actual Google rank for keywords) via a pluggable provider.
//
// GSC only reports a site's *own* average position; a live SERP snapshot means
// querying Google for a keyword and finding where the domain actually ranks —
// which needs a SERP provider (DataForSEO, SerpApi, …). Provider-agnostic and
// no-ops to { configured:false } until creds are set, so the UI shows a "connect
// a provider" card rather than failing.

import { safeFetch } from "./safe-fetch";
import { domainOf } from "./backlinks";
import { candidateKeywords } from "./keywords";

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

// --- DataForSEO reference impl (inactive until creds exist) ---------------
async function fetchDataForSeo(domain, keywords) {
  const auth = Buffer.from(
    `${process.env.DATAFORSEO_LOGIN}:${process.env.DATAFORSEO_PASSWORD}`
  ).toString("base64");
  // Real call: POST /v3/serp/google/organic/live/advanced with a task per
  // keyword, then find the first organic item whose domain matches. Left as a
  // wiring point; return "not found" rows for now.
  void auth;
  void safeFetch;
  return keywords.map((keyword) => ({ keyword, position: null, url: null, found: false }));
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
