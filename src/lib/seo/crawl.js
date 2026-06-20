// Capped, same-origin BFS crawler for the "deep scan" feature.
//
// MVP version: lightweight HTML fetch only, bounded by page count and depth so
// it always finishes within a request. Its job is to discover pages reachable
// by following links and report which ones are NOT in the sitemap. The
// large-site version (background job + headless escalation) reuses this logic.

import * as cheerio from "cheerio";
import { safeFetch, assertSafeUrl } from "./safe-fetch";

const MAX_CRAWL_PAGES = 60;
const MAX_DEPTH = 3;

// Normalize a URL for comparison: drop hash, drop trailing slash.
function normalize(url) {
  try {
    const u = new URL(url);
    u.hash = "";
    let s = u.toString();
    if (s.endsWith("/") && u.pathname !== "/") s = s.slice(0, -1);
    return s;
  } catch {
    return null;
  }
}

export async function crawlForMissingUrls(rootUrl, sitemapUrlSet) {
  const origin = new URL(rootUrl).origin;
  const normalizedSitemap = new Set(
    [...sitemapUrlSet].map(normalize).filter(Boolean)
  );

  const seen = new Set();
  const discovered = new Set();
  const rootNorm = normalize(rootUrl) || rootUrl;
  const queue = [{ url: rootNorm, depth: 0 }];
  // Internal-link graph: shortest click-depth from the root + inbound-link counts
  // (how many crawled pages link to each URL) for orphan / top-linked analysis.
  const depthByUrl = { [rootNorm]: 0 };
  const inboundCounts = {};

  while (queue.length && seen.size < MAX_CRAWL_PAGES) {
    const { url, depth } = queue.shift();
    if (!url || seen.has(url)) continue;
    seen.add(url);
    discovered.add(url);

    if (depth >= MAX_DEPTH) continue;

    let res;
    try {
      res = await safeFetch(url);
    } catch {
      continue;
    }
    if (res.status >= 400 || !/html/i.test(res.contentType)) continue;

    const linkedThisPage = new Set(); // count each target at most once per source
    const $ = cheerio.load(res.body);
    $("a[href]").each((_, el) => {
      const href = $(el).attr("href");
      if (!href) return;
      let abs;
      try {
        abs = new URL(href, res.url).toString();
        assertSafeUrl(abs); // skip mailto:, javascript:, private hosts, etc.
      } catch {
        return;
      }
      if (new URL(abs).origin !== origin) return; // same-origin only
      const norm = normalize(abs);
      if (!norm || norm === url) return;
      if (!linkedThisPage.has(norm)) {
        linkedThisPage.add(norm);
        inboundCounts[norm] = (inboundCounts[norm] || 0) + 1;
      }
      if (depthByUrl[norm] == null) depthByUrl[norm] = depth + 1;
      if (!seen.has(norm)) queue.push({ url: norm, depth: depth + 1 });
    });
  }

  // Pages we found by crawling that the sitemap never declared.
  const missing = [...discovered].filter((u) => !normalizedSitemap.has(u));

  return {
    crawled: seen.size,
    capped: seen.size >= MAX_CRAWL_PAGES,
    missing,
    graph: { root: rootNorm, discovered: [...discovered], depthByUrl, inboundCounts },
  };
}
