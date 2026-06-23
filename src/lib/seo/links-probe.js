// Sampled broken-link checker for the Links tab.
//
// Takes a list of absolute http(s) URLs (collected by extractSignals) and probes
// a capped sample, following redirects manually so each 3xx hop is recorded
// (SSRF-re-validated per hop). Some servers reject HEAD, so a 405/501 falls back
// to GET. Returns one row per probed link:
//   { url, status, ok, finalUrl, redirectChain:[{status, location}] }
// Everything is best-effort — a failed probe is reported as ok:false, not thrown.

import { assertSafeUrl } from "./safe-fetch";

const USER_AGENT =
  "MadRankBot/1.0 (+https://superengine.vercel.app/bot; on-page SEO audit)";
const MAX_HOPS = 5;

async function requestOnce(url, method, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method,
      signal: controller.signal,
      redirect: "manual", // we follow hops ourselves to record the chain
      headers: { "User-Agent": USER_AGENT },
    });
    try {
      await res.body?.cancel();
    } catch {
      /* already closed */
    }
    return res;
  } finally {
    clearTimeout(timer);
  }
}

async function probeOne(url, timeoutMs) {
  let current;
  try {
    current = assertSafeUrl(url).toString(); // skip internal/blocked targets
  } catch {
    return null;
  }
  const startUrl = current;
  const redirectChain = [];

  try {
    for (let hop = 0; hop <= MAX_HOPS; hop++) {
      let res = await requestOnce(current, "HEAD", timeoutMs);
      if (res.status === 405 || res.status === 501) {
        res = await requestOnce(current, "GET", timeoutMs);
      }
      const status = res.status;

      // Redirect: record the hop and follow the Location (re-validated for SSRF).
      if (status >= 300 && status < 400 && hop < MAX_HOPS) {
        const loc = res.headers.get("location");
        if (loc) {
          let next;
          try {
            next = assertSafeUrl(new URL(loc, current).toString()).toString();
          } catch {
            // Unsafe/invalid redirect target — treat the 3xx as the final status.
            redirectChain.push({ status, location: loc });
            return { url: startUrl, status, ok: false, finalUrl: current, redirectChain };
          }
          redirectChain.push({ status, location: next });
          current = next;
          continue;
        }
      }

      return { url: startUrl, status, ok: status < 400, finalUrl: current, redirectChain };
    }
    // Too many hops — redirect loop.
    return { url: startUrl, status: 310, ok: false, finalUrl: current, redirectChain };
  } catch {
    return { url: startUrl, status: 0, ok: false, finalUrl: current, redirectChain };
  }
}

// Run `fns` with bounded concurrency so a long link list doesn't open dozens of
// sockets at once.
async function mapPool(items, limit, fn) {
  const out = [];
  let i = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx]);
    }
  });
  await Promise.all(workers);
  return out;
}

// Probe up to `cap` of the given URLs. Returns the array of result rows
// (nulls — skipped/unsafe targets — filtered out).
export async function probeLinks(urls, { cap = 15, timeoutMs = 6000, concurrency = 5 } = {}) {
  const sample = [...new Set(urls || [])].slice(0, cap);
  if (!sample.length) return [];
  const rows = await mapPool(sample, concurrency, (u) => probeOne(u, timeoutMs));
  return rows.filter(Boolean);
}
