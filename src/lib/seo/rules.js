// Scoring rules engine (the "Option B" auditor).
//
// Each rule inspects the extracted signals and returns a finding:
//   { category, ruleKey, severity, message, recommendation }
// severity: "error" (must fix) | "warning" (should fix) | "pass" | "info".
//
// The rule set is intentionally small and well-sourced (classic SEO/SMO best
// practices). It is versioned so we can evolve thresholds and layer in the
// AI/GEO rules later without breaking stored results.

export const RULES_VERSION = "seo-classic-v2";

// Recommended length windows (characters) per common SEO guidance.
const TITLE_MIN = 30;
const TITLE_MAX = 60;
const DESC_MIN = 70;
const DESC_MAX = 160;

const pass = (category, ruleKey, message) => ({
  category,
  ruleKey,
  severity: "pass",
  message,
  recommendation: null,
});

function titleRules(s) {
  if (!s.title) {
    return [
      {
        category: "seo",
        ruleKey: "title.missing",
        severity: "error",
        message: "Missing <title> tag.",
        recommendation: `Add a unique, descriptive title of ${TITLE_MIN}–${TITLE_MAX} characters.`,
      },
    ];
  }
  const len = s.titleLength;
  if (len > TITLE_MAX) {
    return [
      {
        category: "seo",
        ruleKey: "title.too_long",
        severity: "warning",
        message: `Title is ${len} characters — may be truncated in search results.`,
        recommendation: `Keep the title under ${TITLE_MAX} characters.`,
      },
    ];
  }
  if (len < TITLE_MIN) {
    return [
      {
        category: "seo",
        ruleKey: "title.too_short",
        severity: "warning",
        message: `Title is only ${len} characters — likely under-descriptive.`,
        recommendation: `Aim for ${TITLE_MIN}–${TITLE_MAX} characters.`,
      },
    ];
  }
  return [pass("seo", "title.ok", `Title length is good (${len} chars).`)];
}

function descriptionRules(s) {
  if (!s.metaDescription) {
    return [
      {
        category: "seo",
        ruleKey: "description.missing",
        severity: "error",
        message: "Missing meta description.",
        recommendation: `Add a compelling meta description of ${DESC_MIN}–${DESC_MAX} characters.`,
      },
    ];
  }
  const len = s.metaDescription.length;
  if (len > DESC_MAX) {
    return [
      {
        category: "seo",
        ruleKey: "description.too_long",
        severity: "warning",
        message: `Meta description is ${len} characters — may be truncated.`,
        recommendation: `Keep it under ${DESC_MAX} characters.`,
      },
    ];
  }
  if (len < DESC_MIN) {
    return [
      {
        category: "seo",
        ruleKey: "description.too_short",
        severity: "warning",
        message: `Meta description is only ${len} characters.`,
        recommendation: `Aim for ${DESC_MIN}–${DESC_MAX} characters.`,
      },
    ];
  }
  return [pass("seo", "description.ok", `Meta description length is good (${len} chars).`)];
}

function canonicalRules(s) {
  if (!s.canonical) {
    return [
      {
        category: "seo",
        ruleKey: "canonical.missing",
        severity: "warning",
        message: "No canonical URL declared.",
        recommendation: "Add <link rel=\"canonical\"> to avoid duplicate-content issues.",
      },
    ];
  }
  return [pass("seo", "canonical.ok", "Canonical URL is present.")];
}

function h1Rules(s) {
  if (s.h1s.length === 0) {
    return [
      {
        category: "seo",
        ruleKey: "h1.missing",
        severity: "warning",
        message: "No <h1> heading found.",
        recommendation: "Add a single, descriptive <h1> that summarizes the page.",
      },
    ];
  }
  if (s.h1s.length > 1) {
    return [
      {
        category: "seo",
        ruleKey: "h1.multiple",
        severity: "info",
        message: `Page has ${s.h1s.length} <h1> headings.`,
        recommendation: "Prefer a single <h1> per page for a clear content hierarchy.",
      },
    ];
  }
  return [pass("seo", "h1.ok", "Exactly one <h1> heading.")];
}

function technicalRules(s) {
  const out = [];
  if (!s.viewport) {
    out.push({
      category: "seo",
      ruleKey: "viewport.missing",
      severity: "warning",
      message: "No viewport meta tag — page may not be mobile-friendly.",
      recommendation: 'Add <meta name="viewport" content="width=device-width, initial-scale=1">.',
    });
  }
  if (!s.lang) {
    out.push({
      category: "seo",
      ruleKey: "lang.missing",
      severity: "info",
      message: "No lang attribute on <html>.",
      recommendation: 'Set <html lang="..."> to declare the page language.',
    });
  }
  const robotsDirectives = [s.robots, s.robotsHeader].filter(Boolean).join(", ");
  if (/noindex/i.test(robotsDirectives)) {
    out.push({
      category: "seo",
      ruleKey: "robots.noindex",
      severity: "info",
      message: "Page is marked noindex — it will be excluded from search engines.",
      recommendation: "Confirm this is intentional.",
    });
  }
  return out;
}

function openGraphRules(s) {
  const out = [];
  const missing = [];
  if (!s.og.title) missing.push("og:title");
  if (!s.og.description) missing.push("og:description");
  if (!s.og.image) missing.push("og:image");
  if (missing.length) {
    out.push({
      category: "smo",
      ruleKey: "og.incomplete",
      severity: missing.includes("og:image") ? "warning" : "info",
      message: `Open Graph tags missing: ${missing.join(", ")}.`,
      recommendation: "Add Open Graph tags so the page previews well when shared.",
    });
  } else {
    out.push(pass("smo", "og.ok", "Open Graph title, description and image are present."));
  }
  return out;
}

function twitterRules(s) {
  const out = [];
  if (!s.twitter.card) {
    out.push({
      category: "smo",
      ruleKey: "twitter.card.missing",
      severity: "info",
      message: "No Twitter (X) card type declared.",
      recommendation: 'Add <meta name="twitter:card" content="summary_large_image">.',
    });
  }
  if (!s.twitter.image && !s.og.image) {
    out.push({
      category: "smo",
      ruleKey: "twitter.image.missing",
      severity: "warning",
      message: "No Twitter/OG image — link previews will have no thumbnail.",
      recommendation: "Add twitter:image or og:image (1200×630 recommended).",
    });
  }
  if (s.twitter.card || s.twitter.image) {
    out.push(pass("smo", "twitter.ok", "Twitter/X card data is present."));
  }
  return out;
}

// Deeper on-page checks. All guard on optional signals so older stored results
// (scanned before these signals existed) simply produce no findings.
function imageRules(s) {
  const total = s.images?.total ?? 0;
  const missing = s.images?.missingAlt ?? 0;
  if (total > 0 && missing > 0) {
    return [
      {
        category: "seo",
        ruleKey: "images.alt_missing",
        severity: "warning",
        message: `${missing} of ${total} images are missing alt text.`,
        recommendation:
          'Add descriptive alt text to meaningful images (use alt="" only for purely decorative ones).',
      },
    ];
  }
  return [];
}

function headingOrderRules(s) {
  if ((s.headings?.skips ?? 0) > 0) {
    return [
      {
        category: "seo",
        ruleKey: "headings.skipped",
        severity: "info",
        message: "Heading levels skip a step (e.g. an <h2> jumps straight to <h4>).",
        recommendation: "Use headings in order (h1 → h2 → h3) so the document outline is clear.",
      },
    ];
  }
  return [];
}

function hreflangRules(s) {
  if ((s.hreflang?.count ?? 0) > 0 && !s.hreflang?.xDefault) {
    return [
      {
        category: "seo",
        ruleKey: "hreflang.no_xdefault",
        severity: "info",
        message: "hreflang annotations are present but there is no x-default.",
        recommendation: "Add an x-default hreflang for visitors whose language/region isn't listed.",
      },
    ];
  }
  return [];
}

function mixedContentRules(s) {
  if ((s.mixedContent ?? 0) > 0) {
    return [
      {
        category: "seo",
        ruleKey: "content.mixed",
        severity: "warning",
        message: `${s.mixedContent} resource(s) load over insecure http:// on an https page.`,
        recommendation: "Serve all images, scripts and styles over https to avoid mixed-content blocking.",
      },
    ];
  }
  return [];
}

function linkProfileRules(s) {
  const total = s.links?.total ?? 0;
  if (total > 300) {
    return [
      {
        category: "seo",
        ruleKey: "links.excessive",
        severity: "info",
        message: `Page has ${total} links — an unusually high number.`,
        recommendation: "Trim excessive on-page links so crawl signals and link equity stay focused.",
      },
    ];
  }
  return [];
}

const ALL_RULE_FNS = [
  titleRules,
  descriptionRules,
  canonicalRules,
  h1Rules,
  technicalRules,
  openGraphRules,
  twitterRules,
  imageRules,
  headingOrderRules,
  hreflangRules,
  mixedContentRules,
  linkProfileRules,
];

// Weight per severity, used to compute a 0–100 health score.
// Exported so the gamification layer can reward fixes by the same weights.
export const SEVERITY_PENALTY = { error: 15, warning: 6, info: 1, pass: 0 };

export function scorePage(signals) {
  const issues = ALL_RULE_FNS.flatMap((fn) => fn(signals));
  const penalty = issues.reduce(
    (sum, i) => sum + (SEVERITY_PENALTY[i.severity] || 0),
    0
  );
  const score = Math.max(0, Math.min(100, 100 - penalty));

  const counts = { error: 0, warning: 0, info: 0, pass: 0 };
  for (const i of issues) counts[i.severity] = (counts[i.severity] || 0) + 1;

  return {
    rulesVersion: RULES_VERSION,
    score,
    grade: gradeFor(score),
    counts,
    issues,
  };
}

function gradeFor(score) {
  if (score >= 90) return "A";
  if (score >= 75) return "B";
  if (score >= 60) return "C";
  if (score >= 40) return "D";
  return "F";
}
