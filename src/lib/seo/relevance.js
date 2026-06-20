// Content-relevance scoring — pure, dependency-free.
//
// Okara's "Content Relevance" cards ask: do the title / description / keywords
// actually appear in the body content? We measure token-overlap coverage (what
// fraction of the meaningful words in each meta field show up in the body) plus
// a rough keyword density, and roll them into a single 0–100 score.

const STOP_WORDS = new Set([
  "the", "a", "an", "and", "or", "but", "of", "to", "in", "on", "for", "with",
  "at", "by", "from", "is", "are", "was", "were", "be", "been", "this", "that",
  "it", "as", "your", "you", "our", "we", "their", "they", "i", "he", "she",
]);

function tokenize(text) {
  return (text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
}

// Fraction (0–1) of the unique meaningful tokens in `field` that appear in the
// body token set. Null when the field has no scorable tokens.
function coverage(field, bodySet) {
  const tokens = [...new Set(tokenize(field))];
  if (!tokens.length) return null;
  const hits = tokens.filter((t) => bodySet.has(t)).length;
  return hits / tokens.length;
}

// Average a list of (possibly null) ratios, ignoring nulls. Returns 0 when all null.
function avg(values) {
  const present = values.filter((v) => v != null);
  if (!present.length) return 0;
  return present.reduce((s, v) => s + v, 0) / present.length;
}

// Score how well the title/description/keywords are reflected in the body.
// Returns { score (0–100), titleCoverage, descCoverage, keywordCoverage,
// keywordDensity } where coverage fields are 0–1 (or null when absent).
export function contentRelevance({ title, metaDescription, metaKeywords, bodyText } = {}) {
  const bodyTokens = tokenize(bodyText);
  const bodySet = new Set(bodyTokens);

  const titleCoverage = coverage(title, bodySet);
  const descCoverage = coverage(metaDescription, bodySet);
  const keywordCoverage = coverage(metaKeywords, bodySet);

  // Keyword density: share of body tokens that are one of the declared keywords.
  const keywords = new Set(tokenize(metaKeywords));
  const keywordDensity =
    bodyTokens.length && keywords.size
      ? bodyTokens.filter((t) => keywords.has(t)).length / bodyTokens.length
      : 0;

  const score = Math.round(avg([titleCoverage, descCoverage, keywordCoverage]) * 100);
  return { score, titleCoverage, descCoverage, keywordCoverage, keywordDensity };
}
