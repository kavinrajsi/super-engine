// Color-contrast result mapping + scoring (WCAG 1.4.3 AA / 1.4.6 AAA).
//
// Pure functions over axe-core's raw output. axe runs the actual checks in a
// real browser (see headless.js#runAxeContrast); here we just shape its result
// into the compact form the UI/score consume, and roll pages up to a site score.

const AA_RULE = "color-contrast";
const AAA_RULE = "color-contrast-enhanced";

function findRule(results, id) {
  return (results || []).find((r) => r.id === id) || null;
}

function nodeCount(results, id) {
  return findRule(results, id)?.nodes.length || 0;
}

// "12.0pt (16px)" -> 16 ; returns null when unparseable.
function fontSizePx(str) {
  const m = /([\d.]+)px/.exec(String(str || ""));
  return m ? Math.round(parseFloat(m[1])) : null;
}

function nodesToElements(ruleResult, level) {
  if (!ruleResult) return [];
  return ruleResult.nodes.map((n) => {
    const data = (n.any && n.any[0] && n.any[0].data) || {};
    const ratio = typeof data.contrastRatio === "number" ? data.contrastRatio : null;
    const required = data.expectedContrastRatio ? parseFloat(data.expectedContrastRatio) : null;
    // Large text uses a lower threshold (AA 3:1, AAA 4.5:1); infer it from the
    // requirement axe applied rather than re-deriving the px/weight rules.
    const largeCutoff = level === "AA" ? 3 : 4.5;
    return {
      level,
      selector: Array.isArray(n.target) ? n.target.join(" ") : String(n.target || ""),
      html: (n.html || "").slice(0, 200),
      fg: data.fgColor || null,
      bg: data.bgColor || null,
      ratio,
      required,
      fontSizePx: fontSizePx(data.fontSize),
      bold: /bold|[789]00/.test(String(data.fontWeight)),
      isLargeText: required != null ? required <= largeCutoff : null,
    };
  });
}

// Shape one page's raw axe result into { aaPass, aaFail, aaaPass, aaaFail,
// needsReview, score, elements[] }. `score` = % of text passing AA.
export function mapContrastResult(axeResult) {
  const { violations = [], passes = [], incomplete = [] } = axeResult || {};

  const aaFail = nodeCount(violations, AA_RULE);
  const aaPass = nodeCount(passes, AA_RULE);
  const aaaFail = nodeCount(violations, AAA_RULE);
  const aaaPass = nodeCount(passes, AAA_RULE);
  const needsReview = nodeCount(incomplete, AA_RULE) + nodeCount(incomplete, AAA_RULE);

  const total = aaPass + aaFail;
  const score = total ? Math.round((aaPass / total) * 100) : 100;

  const elements = [
    ...nodesToElements(findRule(violations, AA_RULE), "AA"),
    ...nodesToElements(findRule(violations, AAA_RULE), "AAA"),
  ];

  return { aaPass, aaFail, aaaPass, aaaFail, needsReview, score, elements };
}

// Roll per-page results up to a site summary. Each entry is either
// { url, ran: true, ...mapped } or { url, ran: false, error }.
export function aggregateContrast(perPage) {
  const ran = (perPage || []).filter((p) => p && p.ran);
  const sum = (key) => ran.reduce((n, p) => n + (p[key] || 0), 0);
  const score = ran.length
    ? Math.round(ran.reduce((n, p) => n + (p.score || 0), 0) / ran.length)
    : null;
  return {
    pagesScanned: ran.length,
    score,
    aaFails: sum("aaFail"),
    aaaFails: sum("aaaFail"),
    needsReview: sum("needsReview"),
  };
}
