// Assemble a compact text context about the active site for the "ask your site"
// chat: brand memory + the latest audit (score, top issues, AI readiness) +
// best-effort Cloudflare traffic. All sources degrade to nothing when absent.

import { latestScanForUrl } from "@/lib/db/scans";
import { scanUrlCandidates } from "@/lib/site/active";
import { groupIssuesWithPages } from "@/lib/seo/gamify";
import { getCloudflareToken } from "@/lib/db/cloudflare";
import { buildCloudflareReport } from "@/lib/cloudflare/api";
import { domainOf } from "@/lib/seo/dataforseo";

export async function buildSiteContext({ userId, profile }) {
  const parts = [];
  const siteUrl = profile?.website_url || "";
  parts.push(`Site: ${siteUrl || profile?.name || "(unknown)"}`);

  if (profile?.markdown?.trim()) {
    parts.push(`\nBrand memory:\n"""\n${profile.markdown.trim().slice(0, 2000)}\n"""`);
  }

  // Latest cached audit (don't re-scan).
  let scan = null;
  if (siteUrl) {
    scan = await latestScanForUrl(scanUrlCandidates(siteUrl), userId ?? null, 60 * 24 * 7);
  }
  if (scan) {
    parts.push(
      `\nLatest audit: SEO score ${scan.siteScore ?? "—"}/100, ` +
        `AI readiness ${scan.aiReadiness?.overall ?? "—"}/100, ${scan.pages?.length ?? 0} pages.`
    );
    const issues = groupIssuesWithPages(scan.pages).slice(0, 8);
    if (issues.length) {
      parts.push(
        `Top issues:\n${issues
          .map((i) => `- [${i.severity}] ${i.title} (${i.occurrences.length} page(s))`)
          .join("\n")}`
      );
    }
  } else {
    parts.push("\nNo recent audit on file — suggest running a scan for specifics.");
  }

  // Best-effort Cloudflare traffic (user-scoped token; no session needed).
  try {
    const token = await getCloudflareToken(userId ?? null);
    if (token && siteUrl) {
      const cf = await buildCloudflareReport(token, domainOf(siteUrl), 7);
      if (cf?.zoneFound) {
        const wa = cf.webAnalytics?.totals;
        const zh = cf.zoneHttp?.totals;
        parts.push(
          `\nCloudflare (7d): ${wa?.pageViews ?? "—"} page views, ${wa?.visits ?? "—"} visits, ` +
            `${zh?.requests ?? "—"} requests, cache ${
              zh?.cacheRatio != null ? `${Math.round(zh.cacheRatio * 100)}%` : "—"
            }, ${zh?.threats ?? "—"} threats.`
        );
      }
    }
  } catch {
    /* best-effort */
  }

  return parts.join("\n");
}
