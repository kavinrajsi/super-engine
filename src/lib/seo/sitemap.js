// Sitemap discovery + parsing.
//
// Strategy: look at robots.txt for `Sitemap:` directives, fall back to the
// conventional /sitemap.xml, then parse. Handles both <urlset> (a list of
// pages) and <sitemapindex> (a list of nested sitemaps), recursing into the
// latter up to a safety bound.

import * as cheerio from "cheerio";
import { safeFetch } from "./safe-fetch";

const MAX_NESTED_SITEMAPS = 50;
const MAX_URLS = 5_000; // hard cap so a giant sitemap can't blow up memory.

// Find candidate sitemap URLs declared in robots.txt.
async function sitemapsFromRobots(origin) {
  try {
    const res = await safeFetch(new URL("/robots.txt", origin).toString());
    if (res.status >= 400) return [];
    return res.body
      .split(/\r?\n/)
      .map((line) => line.match(/^\s*sitemap:\s*(.+)\s*$/i))
      .filter(Boolean)
      .map((m) => m[1].trim());
  } catch {
    return [];
  }
}

// Parse one sitemap document. Returns { urls, nested } where `nested` holds
// child sitemap URLs from a <sitemapindex>.
function parseSitemapXml(xml) {
  const $ = cheerio.load(xml, { xmlMode: true });
  const urls = [];
  const nested = [];

  $("urlset > url").each((_, el) => {
    const $el = $(el);
    const loc = $el.find("loc").first().text().trim();
    if (!loc) return;
    urls.push({
      url: loc,
      lastmod: $el.find("lastmod").first().text().trim() || null,
      changefreq: $el.find("changefreq").first().text().trim() || null,
      priority: $el.find("priority").first().text().trim() || null,
    });
  });

  $("sitemapindex > sitemap > loc").each((_, el) => {
    const loc = $(el).text().trim();
    if (loc) nested.push(loc);
  });

  return { urls, nested };
}

// Fetch + parse a site's sitemap(s). Returns:
//   { found: boolean, sources: string[], urls: SitemapUrl[], truncated: boolean }
export async function fetchSitemap(rootUrl) {
  const origin = new URL(rootUrl).origin;

  // Build the candidate queue: robots.txt hints first, then the convention.
  const robotsSitemaps = await sitemapsFromRobots(origin);
  const queue = [...new Set([...robotsSitemaps, new URL("/sitemap.xml", origin).toString()])];

  const seen = new Set();
  const sources = [];
  const urls = [];
  let visited = 0;
  let found = false;
  let truncated = false;

  while (queue.length && visited < MAX_NESTED_SITEMAPS) {
    const next = queue.shift();
    if (seen.has(next)) continue;
    seen.add(next);
    visited += 1;

    let res;
    try {
      res = await safeFetch(next);
    } catch {
      continue;
    }
    if (res.status >= 400 || !/xml/i.test(res.contentType + res.body.slice(0, 100))) {
      // Not a usable XML sitemap.
      continue;
    }

    const { urls: pageUrls, nested } = parseSitemapXml(res.body);
    if (pageUrls.length || nested.length) {
      found = true;
      sources.push(next);
    }
    for (const u of pageUrls) {
      if (urls.length >= MAX_URLS) {
        truncated = true;
        break;
      }
      urls.push({ ...u, source: next });
    }
    for (const n of nested) queue.push(n);
  }

  return { found, sources, urls, truncated };
}
