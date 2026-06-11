// JSON report export. Runs the scan and returns the full structured result —
// per-page SEO + AI audits, the AI-readiness summary (incl. llms/ai.txt
// validation findings), and sitemap data — as a downloadable JSON file.

import { assertSafeUrl } from "@/lib/seo/safe-fetch";
import { runScan } from "@/lib/seo/analyze";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const rawUrl = searchParams.get("url") || "";
  const deepScan = searchParams.get("deep") === "1" || searchParams.get("deep") === "on";

  let safe;
  try {
    safe = assertSafeUrl(rawUrl);
  } catch (err) {
    return Response.json({ error: err.message }, { status: 400 });
  }

  let result;
  try {
    result = await runScan(safe.toString(), { deepScan });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 502 });
  }

  const report = {
    generatedAt: new Date().toISOString(),
    url: safe.toString(),
    deepScan,
    siteScore: result.siteScore,
    aiReadiness: result.aiReadiness,
    analytics: result.analytics,
    headless: result.headless,
    sitemap: result.sitemap,
    missingFromSitemap: result.missingFromSitemap,
    pages: result.pages.map((p) => ({
      url: p.url,
      httpStatus: p.httpStatus,
      inSitemap: p.inSitemap,
      needsHeadless: p.needsHeadless,
      error: p.error,
      audit: p.audit,
      aiAudit: p.aiAudit,
      signals: p.signals,
    })),
  };

  const host = safe.hostname.replace(/[^a-z0-9.-]/gi, "_");
  return new Response(JSON.stringify(report, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="seo-report-${host}.json"`,
    },
  });
}
