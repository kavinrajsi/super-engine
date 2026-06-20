// Sampled broken-link checker for the Links tab.
//
// Takes a list of absolute http(s) URLs (collected by extractSignals) and probes
// a capped sample with a HEAD request through the SSRF-guarded fetch path. Some
// servers reject HEAD, so a 405/501 falls back to a lightweight GET. Returns one
// row per probed link: { url, status, ok }. Everything is best-effort — a failed
// probe is reported as ok:false rather than throwing.

import { assertSafeUrl } from "./safe-fetch";

const USER_AGENT =
  "MetaTagSEOBot/0.1 (+https://example.com/bot; on-page SEO audit)";

async function probeOne(url, timeoutMs) {
  let safe;
  try {
    safe = assertSafeUrl(url); // skip internal/blocked targets entirely
  } catch {
    return null;
  }

  const run = async (method) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(safe, {
        method,
        signal: controller.signal,
        redirect: "follow",
        headers: { "User-Agent": USER_AGENT },
      });
      try {
        await res.body?.cancel();
      } catch {
        /* already closed */
      }
      return res.status;
    } finally {
      clearTimeout(timer);
    }
  };

  try {
    let status = await run("HEAD");
    if (status === 405 || status === 501) status = await run("GET");
    return { url: safe.toString(), status, ok: status < 400 };
  } catch {
    return { url: safe.toString(), status: 0, ok: false };
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
