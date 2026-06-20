// Extract on-page SEO / SMO / GEO signals from a page's HTML.
//
// Pure function: takes raw HTML + the page URL, returns a structured signals
// object. No network, no scoring — that keeps it easy to test and reuse.

import * as cheerio from "cheerio";
import { detectTrackers, clarityProjectId } from "./trackers";
import { fleschReadingEase } from "./readability";
import { contentRelevance } from "./relevance";

function metaContent($, selector) {
  const v = $(selector).attr("content");
  return v ? v.trim() : null;
}

export function extractSignals(html, pageUrl) {
  const $ = cheerio.load(html);
  const head = $("head");

  const title = $("title").first().text().trim() || null;

  const ogImage = metaContent($, 'meta[property="og:image"]');
  const twitterImage = metaContent($, 'meta[name="twitter:image"]');

  const h1s = $("h1")
    .map((_, el) => $(el).text().trim())
    .get()
    .filter(Boolean);

  // Collect JSON-LD structured data blocks (types) plus a few flags used by the
  // AI-readiness layer (author / dates / entity links).
  const structuredData = [];
  const ld = { author: false, datePublished: false, dateModified: false, sameAs: false };
  $('script[type="application/ld+json"]').each((_, el) => {
    const raw = $(el).contents().text();
    try {
      const json = JSON.parse(raw);
      // Flatten top-level arrays and @graph containers.
      const nodes = (Array.isArray(json) ? json : [json]).flatMap((n) =>
        n && Array.isArray(n["@graph"]) ? n["@graph"] : [n]
      );
      for (const n of nodes) {
        if (!n || typeof n !== "object") continue;
        if (n["@type"]) structuredData.push(n["@type"]);
        if (n.author) ld.author = true;
        if (n.datePublished) ld.datePublished = true;
        if (n.dateModified) ld.dateModified = true;
        if (n.sameAs) ld.sameAs = true;
      }
    } catch {
      structuredData.push("(invalid JSON-LD)");
    }
  });

  // --- AI search readiness signals (GEO / AEO / AIO / AGO) ---
  const typeStr = structuredData.map(String).join(" ");
  const QUESTION_RE = /^(who|what|why|how|when|where|which|can|do|does|is|are|should)\b|\?\s*$/i;
  const subHeadings = $("h2, h3")
    .map((_, el) => $(el).text().trim())
    .get()
    .filter(Boolean);
  const bodyText = $("body").text().replace(/\s+/g, " ").trim();

  const metaAuthor =
    metaContent($, 'meta[name="author"]') ||
    metaContent($, 'meta[property="article:author"]');

  const aiGeo = {
    jsonLdTypes: structuredData,
    hasFaq: /FAQPage|QAPage/i.test(typeStr),
    hasHowTo: /HowTo/i.test(typeStr),
    hasArticle: /Article|BlogPosting|NewsArticle/i.test(typeStr),
    hasOrgOrPerson: /Organization|Person/i.test(typeStr),
    hasBreadcrumb: /BreadcrumbList/i.test(typeStr),
    hasSchema: structuredData.length > 0,
    author: metaAuthor || (ld.author ? "(structured data)" : null),
    datePublished:
      metaContent($, 'meta[property="article:published_time"]') ||
      (ld.datePublished ? "(structured data)" : null),
    dateModified:
      metaContent($, 'meta[property="article:modified_time"]') ||
      (ld.dateModified ? "(structured data)" : null),
    sameAs: ld.sameAs,
    questionHeadings: subHeadings.filter((h) => QUESTION_RE.test(h)).length,
    lists: $("ul, ol").length,
    tables: $("table").length,
    hasMain: $("main").length > 0 || $("article").length > 0,
    wordCount: bodyText ? bodyText.split(" ").length : 0,
  };

  // --- Deeper on-page checks (accessibility / i18n / security / link profile) ---
  // Images missing alt text. An explicit alt="" is a valid "decorative" marker,
  // so only count images with no alt attribute at all.
  const imgs = $("img");
  let imagesMissingAlt = 0;
  imgs.each((_, el) => {
    if ($(el).attr("alt") === undefined) imagesMissingAlt += 1;
  });

  // Heading hierarchy: flag outlines that skip a level (e.g. h2 → h4).
  const headingLevels = $("h1, h2, h3, h4, h5, h6")
    .map((_, el) => Number((el.tagName || el.name || "").slice(1)))
    .get()
    .filter(Boolean);
  let headingSkips = 0;
  for (let i = 1; i < headingLevels.length; i++) {
    if (headingLevels[i] - headingLevels[i - 1] > 1) headingSkips += 1;
  }

  // hreflang annotations (international targeting).
  const hreflangs = $('link[rel="alternate"][hreflang]')
    .map((_, el) => ($(el).attr("hreflang") || "").trim().toLowerCase())
    .get()
    .filter(Boolean);

  // Mixed content: insecure http:// sub-resources on an https page.
  const isHttps = /^https:/i.test(pageUrl || "");
  let mixedContent = 0;
  if (isHttps) {
    $("img[src], script[src], link[href], iframe[src], video[src], audio[src], source[src]").each((_, el) => {
      const ref = $(el).attr("src") || $(el).attr("href") || "";
      if (/^http:\/\//i.test(ref)) mixedContent += 1;
    });
  }

  // Internal vs external link counts (skip in-page/non-navigational hrefs).
  let origin = null;
  try {
    origin = new URL(pageUrl).origin;
  } catch {
    /* relative/invalid pageUrl */
  }
  let linksInternal = 0;
  let linksExternal = 0;
  // Collect a capped set of unique absolute http(s) link targets so the scan can
  // probe a sample for broken links (the actual fetching happens in analyze.js).
  const linkUrls = new Set();
  $("a[href]").each((_, el) => {
    const href = ($(el).attr("href") || "").trim();
    if (!href || /^(#|mailto:|tel:|javascript:)/i.test(href)) return;
    let abs;
    try {
      abs = new URL(href, pageUrl);
    } catch {
      return;
    }
    if (origin && abs.origin === origin) linksInternal += 1;
    else linksExternal += 1;
    if (/^https?:$/i.test(abs.protocol) && linkUrls.size < 50) {
      abs.hash = "";
      linkUrls.add(abs.toString());
    }
  });

  // --- Technical-tab signals (headings, render-blocking, density, DOM size) ---
  const byLevel = { h1: 0, h2: 0, h3: 0, h4: 0, h5: 0, h6: 0 };
  for (const lvl of headingLevels) byLevel[`h${lvl}`] += 1;

  // Render-blocking head resources: parser-blocking scripts (no defer/async/
  // module) and synchronous stylesheets in <head>.
  const blockingScripts = head
    .find("script[src]")
    .filter((_, el) => {
      const a = el.attribs || {};
      return a.defer === undefined && a.async === undefined && a.type !== "module";
    }).length;
  const blockingStylesheets = head.find('link[rel="stylesheet"]').length;

  // Content-to-code ratio: visible text length vs. raw HTML length.
  const contentRatio = html.length ? bodyText.length / html.length : 0;

  // DOM node count (approximate in fetch mode — JS-rendered nodes are absent
  // unless this HTML came from the headless renderer).
  const domNodes = $("*").length;

  // Lightweight HTML "resource issues": duplicate ids + images without alt.
  // cheerio/htmlparser2 doesn't surface mismatched-tag warnings cleanly, so we
  // stick to a couple of high-signal, cheap checks.
  const idCounts = new Map();
  $("[id]").each((_, el) => {
    const id = $(el).attr("id");
    if (id) idCounts.set(id, (idCounts.get(id) || 0) + 1);
  });
  const duplicateIds = [...idCounts.values()].filter((n) => n > 1).length;
  const htmlIssues = [];
  if (duplicateIds) htmlIssues.push({ type: "duplicate-id", count: duplicateIds });
  if (imagesMissingAlt) htmlIssues.push({ type: "img-missing-alt", count: imagesMissingAlt });

  const readability = fleschReadingEase(bodyText);
  const relevance = contentRelevance({
    title,
    metaDescription: metaContent($, 'meta[name="description"]'),
    metaKeywords: metaContent($, 'meta[name="keywords"]'),
    bodyText,
  });

  return {
    title,
    titleLength: title ? title.length : 0,
    metaDescription: metaContent($, 'meta[name="description"]'),
    metaKeywords: metaContent($, 'meta[name="keywords"]'),
    canonical: $('link[rel="canonical"]').attr("href")?.trim() || null,
    robots: metaContent($, 'meta[name="robots"]'),
    viewport: metaContent($, 'meta[name="viewport"]'),
    charset: head.find("meta[charset]").attr("charset") || null,
    lang: $("html").attr("lang")?.trim() || null,
    h1s,

    // Open Graph (SMO)
    og: {
      title: metaContent($, 'meta[property="og:title"]'),
      description: metaContent($, 'meta[property="og:description"]'),
      image: ogImage,
      type: metaContent($, 'meta[property="og:type"]'),
      url: metaContent($, 'meta[property="og:url"]'),
      siteName: metaContent($, 'meta[property="og:site_name"]'),
    },

    // Twitter / X card (SMO)
    twitter: {
      card: metaContent($, 'meta[name="twitter:card"]'),
      title: metaContent($, 'meta[name="twitter:title"]'),
      description: metaContent($, 'meta[name="twitter:description"]'),
      image: twitterImage,
      site: metaContent($, 'meta[name="twitter:site"]'),
    },

    structuredData,
    aiGeo,

    // Deeper on-page checks
    images: { total: imgs.length, missingAlt: imagesMissingAlt },
    headings: { count: headingLevels.length, skips: headingSkips, byLevel },
    hreflang: { count: hreflangs.length, xDefault: hreflangs.includes("x-default") },
    mixedContent,
    links: { internal: linksInternal, external: linksExternal, total: linksInternal + linksExternal },
    linkUrls: [...linkUrls],

    // Technical-tab signals
    renderBlocking: { scripts: blockingScripts, stylesheets: blockingStylesheets },
    contentRatio,
    contentRatioPct: Math.round(contentRatio * 1000) / 10,
    domNodes,
    htmlIssues,
    readability,
    relevance,

    // Analytics / heatmap trackers detected in the page HTML.
    analytics: {
      tools: detectTrackers(html),
      clarityId: clarityProjectId(html),
    },
    pageUrl,
  };
}
