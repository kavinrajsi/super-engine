// Issue grouping helpers (pure logic).
//
// De-duplicates a flat list of per-page issues into one entry per rule, with a
// count of how many pages each affects — used by the Overview and Issues views.
// Reads the `audit`/`aiAudit` issues already produced by rules.js / ai-rules.js;
// it does not recompute anything.

import { SEVERITY_PENALTY } from "./rules";
import { issueEvidence } from "./evidence";

// Group a flat list of issues by ruleKey. Returns one entry per rule, sorted by
// impact (severity weight × pages affected).
export function questsFromIssues(issues) {
  const groups = new Map();
  for (const issue of issues) {
    if (issue.severity === "pass") continue;
    const g = groups.get(issue.ruleKey) || {
      ruleKey: issue.ruleKey,
      category: issue.category,
      severity: issue.severity,
      title: issue.message,
      recommendation: issue.recommendation,
      weight: SEVERITY_PENALTY[issue.severity] || 1,
      pagesAffected: 0,
    };
    g.pagesAffected += 1;
    groups.set(issue.ruleKey, g);
  }
  return [...groups.values()].sort(
    (a, b) => b.weight * b.pagesAffected - a.weight * a.pagesAffected
  );
}

// Convenience: group issues across every analyzed page.
export function questsFromResult(result) {
  const all = result.pages.flatMap((p) => (p.audit ? p.audit.issues : []));
  return questsFromIssues(all);
}

// Like questsFromIssues, but page-aware: keeps which pages each rule affects and
// the actual offending content on each, for the Issues view's "Affected pages"
// breakdown. Reads each page's url + signals + audit/aiAudit issues.
export function groupIssuesWithPages(pages) {
  const groups = new Map();
  for (const page of pages || []) {
    const issues = [...(page.audit?.issues || []), ...(page.aiAudit?.issues || [])];
    for (const issue of issues) {
      if (issue.severity === "pass") continue;
      const g = groups.get(issue.ruleKey) || {
        ruleKey: issue.ruleKey,
        category: issue.category,
        severity: issue.severity,
        title: issue.message,
        recommendation: issue.recommendation,
        weight: SEVERITY_PENALTY[issue.severity] || 1,
        occurrences: [],
      };
      g.occurrences.push({
        url: page.url,
        evidence: issueEvidence(issue.ruleKey, page.signals),
      });
      groups.set(issue.ruleKey, g);
    }
  }
  return [...groups.values()].sort(
    (a, b) => b.weight * b.occurrences.length - a.weight * a.occurrences.length
  );
}
