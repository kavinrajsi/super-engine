// Offending-content extractor (pure).
//
// Given a rule key and a page's extracted `signals`, return the actual on-page
// value that tripped the rule — the "what's wrong" content shown on the Issues
// page. Returns null for pure-absence rules (a missing tag has no content to
// show; the page URL + message already convey it).

export function issueEvidence(ruleKey, signals) {
  if (!signals) return null;
  switch (ruleKey) {
    case "title.too_long":
    case "title.too_short":
      return signals.title || null;
    case "description.too_long":
    case "description.too_short":
      return signals.metaDescription || null;
    case "h1.multiple":
      return signals.h1s?.length ? signals.h1s.join("  ·  ") : null;
    case "robots.noindex":
      return [signals.robots, signals.robotsHeader].filter(Boolean).join(", ") || null;
    default:
      return null;
  }
}
