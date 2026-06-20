// Analysis orchestrator.
//
// Ties the pieces together for a synchronous (request-time) scan:
//   1. discover sitemap URLs
//   2. optionally deep-crawl to find pages missing from the sitemap
//   3. fetch + extract + score each page (bounded concurrency, capped count)
//
// This is the MVP path that runs inside a request. The large-site version
// (durable background jobs + headless escalation + Neon persistence) reuses
// these same building blocks — see masterplan phases 2–3.

import { safeFetch, resolveUrl } from "./safe-fetch";
import { fetchSitemap } from "./sitemap";
import { extractSignals } from "./extract";
import { scorePage } from "./rules";
import { crawlForMissingUrls } from "./crawl";
import { scoreAiReadiness, buildAiReadiness } from "./ai-rules";
import { fetchAiSiteContext } from "./ai-site";
import { renderHtml, isHeadlessAvailable } from "./headless";
import { probeLinks } from "./links-probe";

// Keep request-time scans fast and within function limits.
export const MAX_PAGES_SYNC = 40;
const CONCURRENCY = 6;
// Headless rendering is expensive — cap how many JS-rendered pages we escalate.
const MAX_HEADLESS = 5;
const HEADLESS_CONCURRENCY = 2;

// Run `worker` over `items` with a fixed concurrency pool.
async function mapPool(items, concurrency, worker) {
  const results = new Array(items.length);
  let cursor = 0;
  const runners = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    for (;;) {
      const i = cursor++;
      if (i >= items.length) return;
      results[i] = await worker(items[i], i);
    }
  });
  await Promise.all(runners);
  return results;
}

// Derive internal-link-structure insights from the crawler's graph: orphan pages
// (crawled but with no inbound internal links), click-depth distribution, and the
// most internally-linked pages. Returns null when there's no usable graph.
function buildInternalGraph(graph) {
  if (!graph || !graph.discovered?.length) return null;
  const { root, discovered, depthByUrl = {}, inboundCounts = {} } = graph;

  const orphans = discovered.filter((u) => u !== root && !inboundCounts[u]);
  const topLinked = Object.entries(inboundCounts)
    .map(([url, inbound]) => ({ url, inbound }))
    .sort((a, b) => b.inbound - a.inbound)
    .slice(0, 10);

  const depths = discovered.map((u) => depthByUrl[u]).filter((d) => d != null);
  const maxDepth = depths.length ? Math.max(...depths) : 0;
  const depthHistogram = {};
  for (const d of depths) depthHistogram[d] = (depthHistogram[d] || 0) + 1;

  return { pages: discovered.length, orphans, maxDepth, depthHistogram, topLinked };
}

function looksJsRendered(signals) {
  // Heuristic used later to decide headless escalation: an empty <head> on a
  // 200 page often means the meta is injected client-side. Recorded now so the
  // UI can flag it even before headless rendering exists.
  return !signals.title && !signals.metaDescription && signals.h1s.length === 0;
}

async function analyzeOne(url) {
  try {
    const res = await safeFetch(url);
    if (res.status >= 400 || !/html/i.test(res.contentType)) {
      return { url, httpStatus: res.status, error: "Not an HTML page", page: null };
    }
    const signals = extractSignals(res.body, res.url);
    signals.robotsHeader = res.xRobotsTag || null; // robots from the HTTP header
    signals.domNodesApprox = true; // fetch mode misses JS-injected nodes
    const audit = scorePage(signals);
    const needsHeadless = looksJsRendered(signals);
    const aiAudit = scoreAiReadiness(signals, { needsHeadless });
    return {
      url: res.url,
      httpStatus: res.status,
      renderMode: "fetch",
      needsHeadless,
      // Response-level technical signals (headers, size, phase timings).
      response: {
        server: res.server,
        contentEncoding: res.contentEncoding,
        cacheControl: res.cacheControl,
        cacheable: res.cacheable,
        byteSize: res.byteSize,
        timings: res.timings,
      },
      signals,
      audit,
      aiAudit,
    };
  } catch (err) {
    return { url, httpStatus: null, error: err.message, page: null };
  }
}

// Re-analyze a JS-rendered page using a real browser, returning fresh signals
// from the fully-rendered DOM. Returns null if rendering is unavailable/fails.
async function analyzeRendered(url) {
  const html = await renderHtml(url);
  if (!html) return null;
  const signals = extractSignals(html, url);
  signals.robotsHeader = null; // headless path has no response headers
  signals.domNodesApprox = false; // rendered DOM — node count is accurate
  return {
    httpStatus: 200,
    renderMode: "headless",
    needsHeadless: false,
    signals,
    audit: scorePage(signals),
    aiAudit: scoreAiReadiness(signals, { needsHeadless: false }),
    error: null,
  };
}

// Main entry. Returns a complete scan result object.
export async function runScan(inputUrl, { deepScan = false, maxPages = MAX_PAGES_SYNC } = {}) {
  const pageCap = Math.min(maxPages || MAX_PAGES_SYNC, MAX_PAGES_SYNC);

  // Resolve the canonical root by following redirects (apex -> www, http ->
  // https) before any site-level fetch, so the sitemap/robots/llms checks and
  // the displayed root all target the origin the site actually serves. Falls
  // back to the entered URL when nothing resolves.
  const requestedUrl = inputUrl;
  let rootUrl = inputUrl;
  const resolved = await resolveUrl(inputUrl);
  if (resolved?.url) rootUrl = resolved.url;
  // Compare origins (not full URLs) so a bare trailing slash isn't a "redirect".
  const redirected = new URL(rootUrl).origin !== new URL(requestedUrl).origin;

  // Sitemap discovery and the site-level AI checks are independent — fetch both
  // at once.
  const [sitemap, aiSite] = await Promise.all([
    fetchSitemap(rootUrl),
    fetchAiSiteContext(rootUrl),
  ]);

  const sitemapUrls = sitemap.urls.map((u) => u.url);
  let missingFromSitemap = [];
  let internalGraph = null;

  if (deepScan) {
    const crawl = await crawlForMissingUrls(rootUrl, new Set(sitemapUrls));
    missingFromSitemap = crawl.missing;
    internalGraph = buildInternalGraph(crawl.graph);
  }

  // Pages to analyze = the root URL (always) + sitemap URLs + any
  // discovered-missing URLs, de-duplicated and capped. Seeding the root URL
  // guarantees we audit something even when a site has no sitemap.
  const candidates = [...new Set([rootUrl, ...sitemapUrls, ...missingFromSitemap])];
  const toAnalyze = candidates.slice(0, pageCap);
  const analyzedTruncated = candidates.length > pageCap;

  let pages = await mapPool(toAnalyze, CONCURRENCY, analyzeOne);

  // Redirects can collapse several input URLs (e.g. apex + www) onto the same
  // final URL — keep one entry per final URL so we don't double-count or render
  // duplicate React keys.
  const seenUrls = new Set();
  pages = pages.filter((p) => {
    if (seenUrls.has(p.url)) return false;
    seenUrls.add(p.url);
    return true;
  });

  // Hybrid escalation: re-render JS-looking pages in a real browser (capped).
  const headlessAvailable = isHeadlessAvailable();
  const needHeadless = pages.filter((p) => p.needsHeadless);
  let headlessRendered = 0;
  if (headlessAvailable && needHeadless.length) {
    const targets = needHeadless.slice(0, MAX_HEADLESS);
    await mapPool(targets, HEADLESS_CONCURRENCY, async (p) => {
      const rendered = await analyzeRendered(p.url);
      if (rendered) {
        Object.assign(p, rendered);
        headlessRendered += 1;
      }
    });
  }
  const headless = {
    available: headlessAvailable,
    candidates: needHeadless.length,
    rendered: headlessRendered,
  };

  // Site-wide broken-link health: aggregate outbound link targets across all
  // analyzed pages, dedupe, cap, and probe once (following redirects to record
  // chains). Best-effort — failures just mean an empty/short sample.
  const rootPage = pages.find((p) => p.url === rootUrl && p.signals) || pages.find((p) => p.signals);
  const allLinkUrls = [...new Set(pages.flatMap((p) => p.signals?.linkUrls || []))];
  let linkHealth = null;
  if (allLinkUrls.length) {
    let sample = [];
    try {
      sample = await probeLinks(allLinkUrls, { cap: 40 });
    } catch {
      sample = [];
    }
    linkHealth = {
      checked: sample.length,
      broken: sample.filter((r) => !r.ok).length,
      redirected: sample.filter((r) => r.redirectChain?.length).length,
      sample,
    };
    if (rootPage?.signals) {
      rootPage.signals.linkSample = sample; // back-compat for the Links tab table
      rootPage.signals.linkHealth = linkHealth; // lets rules.js score broken links
      // Re-score the root page now that link health is known, so broken-link
      // issues reach the Issues panel and the site score (runs before siteScore).
      rootPage.audit = scorePage(rootPage.signals);
    }
  }

  // Roll up a site-level health score from per-page scores.
  const scored = pages.filter((p) => p.audit);
  const siteScore = scored.length
    ? Math.round(scored.reduce((sum, p) => sum + p.audit.score, 0) / scored.length)
    : null;

  const aiReadiness = buildAiReadiness(pages, aiSite);

  // Aggregate analytics/heatmap trackers across all analyzed pages.
  const trackerMap = new Map();
  let clarityId = null;
  for (const p of pages) {
    if (!p.signals?.analytics) continue;
    for (const t of p.signals.analytics.tools) trackerMap.set(t.key, t);
    if (p.signals.analytics.clarityId && !clarityId) clarityId = p.signals.analytics.clarityId;
  }
  const tools = [...trackerMap.values()];
  const analytics = {
    tools,
    hasClarity: trackerMap.has("clarity"),
    clarityId,
    heatmapTools: tools.filter((t) => t.heatmap),
  };

  // Site-level content summary rolled up from the representative (root) page, so
  // the SEO/Technical tabs can show headline cards without re-deriving in the UI.
  const summarySignals = rootPage?.signals || null;
  const contentSummary = summarySignals
    ? {
        contentRatioPct: summarySignals.contentRatioPct ?? null,
        readabilityGrade: summarySignals.readability?.grade ?? null,
        readabilityEase: summarySignals.readability?.ease ?? null,
        relevanceScore: summarySignals.relevance?.score ?? null,
        wordCount: summarySignals.aiGeo?.wordCount ?? null,
        domNodes: summarySignals.domNodes ?? null,
        byteSize: rootPage?.response?.byteSize ?? null,
        timings: rootPage?.response?.timings ?? null,
      }
    : null;

  const missingSet = new Set(missingFromSitemap);
  return {
    rootUrl,
    requestedUrl,
    redirected,
    deepScan,
    contentSummary,
    linkHealth,
    internalGraph,
    sitemap: {
      found: sitemap.found,
      sources: sitemap.sources,
      urls: sitemap.urls,
      truncated: sitemap.truncated,
    },
    missingFromSitemap,
    analyzedTruncated,
    siteScore,
    aiReadiness,
    analytics,
    headless,
    pages: pages.map((p) => ({
      ...p,
      inSitemap: !missingSet.has(p.url),
    })),
  };
}
