// Extract on-page SEO / SMO / GEO signals from a page's HTML.
//
// Pure function: takes raw HTML + the page URL, returns a structured signals
// object. No network, no scoring — that keeps it easy to test and reuse.

import * as cheerio from "cheerio";
import { detectTrackers, clarityProjectId } from "./trackers";

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
    // Analytics / heatmap trackers detected in the page HTML.
    analytics: {
      tools: detectTrackers(html),
      clarityId: clarityProjectId(html),
    },
    pageUrl,
  };
}
