// AI-search readiness scoring — the GEO / AEO / AIO / AGO layer.
//
// These four overlapping disciplines are scored as distinct "lenses" so the UI
// can show a breakdown, while sharing one severity/penalty scale with the
// classic SEO rules (rules.js) so XP and quests stay consistent.
//
//   AEO — Answer Engine Optimization: be the direct answer (FAQ/Q&A, questions)
//   GEO — Generative Engine Optimization: be citable (authorship, dates, depth)
//   AIO — AI Overviews / AI Optimization: be machine-understandable (schema,
//         summaries, semantics, freshness)
//   AGO — Agent/crawler accessibility: be reachable by AI bots (llms.txt,
//         robots policy, server-rendered content)

export const AI_RULES_VERSION = "ai-geo-v2";

// AI-specific penalty scale — deliberately harsher than the classic SEO weights
// so the AI-readiness score is discriminating (a page missing most AI signals
// should land in the 40s-60s, not the 90s). Quest XP rewards still use the
// classic SEVERITY_PENALTY in gamify.js, so rewards stay consistent.
const AI_PENALTY = { error: 40, warning: 22, info: 10, pass: 0 };

// Build a lens result from a list of checks. A failed check becomes an issue
// (tagged with the lens category) and subtracts its severity penalty.
function lens(category, checks) {
  const issues = [];
  let penalty = 0;
  for (const c of checks) {
    if (!c.failed) continue;
    penalty += AI_PENALTY[c.severity] || 0;
    issues.push({
      category,
      ruleKey: c.ruleKey,
      severity: c.severity,
      message: c.message,
      recommendation: c.recommendation,
    });
  }
  return { score: Math.max(0, 100 - penalty), issues };
}

// Per-page AI readiness. `needsHeadless` flags JS-rendered pages.
export function scoreAiReadiness(signals, { needsHeadless = false } = {}) {
  const g = signals.aiGeo || {};

  const aeo = lens("aeo", [
    {
      failed: !g.hasFaq,
      ruleKey: "aeo.faq",
      severity: "warning",
      message: "No FAQ / Q&A structured data.",
      recommendation: "Add FAQPage or QAPage JSON-LD so answer engines can quote you directly.",
    },
    {
      failed: (g.questionHeadings || 0) === 0,
      ruleKey: "aeo.questions",
      severity: "info",
      message: "No question-style headings.",
      recommendation: "Phrase some H2/H3 headings as the questions users actually ask.",
    },
  ]);

  const geo = lens("geo", [
    {
      failed: !g.author,
      ruleKey: "geo.author",
      severity: "warning",
      message: "No author attribution.",
      recommendation: "Add an author via meta or schema — generative engines weigh authorship (E-E-A-T).",
    },
    {
      failed: !g.datePublished && !g.dateModified,
      ruleKey: "geo.dates",
      severity: "info",
      message: "No published/modified dates.",
      recommendation: "Expose datePublished/dateModified to signal freshness and trust.",
    },
    {
      failed: (g.wordCount || 0) < 300,
      ruleKey: "geo.depth",
      severity: "info",
      message: `Thin content (~${g.wordCount || 0} words).`,
      recommendation: "Add substantive, factual content that engines can cite.",
    },
    {
      failed: (g.lists || 0) + (g.tables || 0) === 0,
      ruleKey: "geo.structure",
      severity: "info",
      message: "No lists or tables.",
      recommendation: "Use lists/tables for extractable, quotable facts.",
    },
  ]);

  const aio = lens("aio", [
    {
      failed: !g.hasSchema,
      ruleKey: "aio.schema",
      severity: "warning",
      message: "No structured data (JSON-LD).",
      recommendation: "Add schema.org markup so AI Overviews can interpret the page.",
    },
    {
      failed: !signals.metaDescription,
      ruleKey: "aio.summary",
      severity: "info",
      message: "No meta description to summarize the page.",
      recommendation: "Add a concise summary for snippet / overview generation.",
    },
    {
      failed: !g.hasMain,
      ruleKey: "aio.semantic",
      severity: "info",
      message: "No semantic <main>/<article> landmark.",
      recommendation: "Wrap primary content in <main>/<article> for clean extraction.",
    },
    {
      failed: !g.dateModified,
      ruleKey: "aio.freshness",
      severity: "info",
      message: "No last-modified date.",
      recommendation: "Expose dateModified — freshness helps AI Overview inclusion.",
    },
  ]);

  const ago = lens("ago", [
    {
      failed: !!needsHeadless,
      ruleKey: "ago.render",
      severity: "warning",
      message: "Content appears JavaScript-rendered.",
      recommendation: "Server-render key content; most AI crawlers don't execute JavaScript.",
    },
  ]);

  const layers = { aeo, geo, aio, ago };
  const score = Math.round((aeo.score + geo.score + aio.score + ago.score) / 4);
  return {
    version: AI_RULES_VERSION,
    layers,
    score,
    issues: [...aeo.issues, ...geo.issues, ...aio.issues, ...ago.issues],
  };
}

// Site-level AGO checks (computed once per scan).
function scoreAgoSite(siteContext) {
  const issues = [];
  let penalty = 0;

  const llms = siteContext?.llmsTxt;
  const full = siteContext?.llmsFullTxt;
  if (!llms?.present && !full?.present) {
    penalty += AI_PENALTY.info;
    issues.push({
      category: "ago",
      ruleKey: "ago.llms",
      severity: "info",
      message: "No /llms.txt or /llms-full.txt found.",
      recommendation: "Add /llms.txt (concise) and ideally /llms-full.txt (expanded) to guide AI crawlers to your key content.",
    });
  } else {
    // Present but doesn't follow the llmstxt.org format.
    if (llms?.present && !llms.valid) {
      penalty += AI_PENALTY.warning;
      issues.push({
        category: "ago",
        ruleKey: "ago.llms_invalid",
        severity: "warning",
        message: `/llms.txt present but malformed: ${llms.findings?.find((f) => f.severity === "error")?.message || "invalid structure"}`,
        recommendation: "Follow llmstxt.org: an H1 title, a '> summary', and '## Section' lists of '- [name](url)' links.",
      });
    }
    if (full?.present && !full.valid) {
      penalty += AI_PENALTY.warning;
      issues.push({
        category: "ago",
        ruleKey: "ago.llms_full_invalid",
        severity: "warning",
        message: `/llms-full.txt present but malformed: ${full.findings?.find((f) => f.severity === "error")?.message || "invalid structure"}`,
        recommendation: "llms-full.txt should be the expanded full-content markdown with an H1 title.",
      });
    }
  }
  const blocked = siteContext?.aiBots?.blocked || [];
  if (blocked.length) {
    penalty += AI_PENALTY.warning;
    issues.push({
      category: "ago",
      ruleKey: "ago.bots",
      severity: "warning",
      message: `AI crawlers blocked in robots.txt: ${blocked.join(", ")}.`,
      recommendation: "Allow these crawlers for generative-search visibility (or confirm the block is intentional).",
    });
  }
  return { score: Math.max(0, 100 - penalty), issues };
}

// Aggregate per-page lenses + site-level AGO into a site summary for the panel.
export function buildAiReadiness(pages, siteContext) {
  const scored = pages.filter((p) => p.aiAudit);
  const avg = (key) =>
    scored.length
      ? Math.round(scored.reduce((s, p) => s + p.aiAudit.layers[key].score, 0) / scored.length)
      : null;

  const agoSite = scoreAgoSite(siteContext);
  const aeo = avg("aeo");
  const geo = avg("geo");
  const aio = avg("aio");
  const agoPage = avg("ago");
  const ago =
    agoPage == null ? agoSite.score : Math.round((agoPage + agoSite.score) / 2);

  const layerScores = [aeo, geo, aio, ago].filter((v) => v != null);
  const overall = layerScores.length
    ? Math.round(layerScores.reduce((a, b) => a + b, 0) / layerScores.length)
    : null;

  return {
    overall,
    layers: { aeo, geo, aio, ago },
    site: {
      llms: {
        present: !!siteContext?.llmsTxt?.present,
        valid: !!siteContext?.llmsTxt?.valid,
        findings: siteContext?.llmsTxt?.findings || [],
        stats: siteContext?.llmsTxt?.stats || {},
        url: siteContext?.llmsTxt?.url,
      },
      llmsFull: {
        present: !!siteContext?.llmsFullTxt?.present,
        valid: !!siteContext?.llmsFullTxt?.valid,
        findings: siteContext?.llmsFullTxt?.findings || [],
        stats: siteContext?.llmsFullTxt?.stats || {},
        url: siteContext?.llmsFullTxt?.url,
      },
      aiTxt: {
        present: !!siteContext?.aiTxt?.present,
        valid: !!siteContext?.aiTxt?.valid,
        findings: siteContext?.aiTxt?.findings || [],
        stats: siteContext?.aiTxt?.stats || {},
        url: siteContext?.aiTxt?.url,
      },
      robotsFound: !!siteContext?.aiBots?.robotsFound,
      botsBlocked: siteContext?.aiBots?.blocked || [],
      botsAllowed: siteContext?.aiBots?.allowed || [],
    },
    siteIssues: agoSite.issues,
  };
}
