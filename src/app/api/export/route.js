// CSV export route handler.
//
// Re-runs the scan for the given URL and streams a CSV of the raw signals +
// per-page score. Route Handlers are not cached by default (Next.js 16), which
// is what we want here.

import { assertSafeUrl } from "@/lib/seo/safe-fetch";
import { runScan } from "@/lib/seo/analyze";

function csvEscape(value) {
  if (value == null) return "";
  const s = String(value);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

const COLUMNS = [
  ["url", (p) => p.url],
  ["http_status", (p) => p.httpStatus],
  ["in_sitemap", (p) => p.inSitemap],
  ["score", (p) => p.audit?.score],
  ["grade", (p) => p.audit?.grade],
  ["title", (p) => p.signals?.title],
  ["title_length", (p) => p.signals?.titleLength],
  ["meta_description", (p) => p.signals?.metaDescription],
  ["canonical", (p) => p.signals?.canonical],
  ["robots", (p) => p.signals?.robots],
  ["og_title", (p) => p.signals?.og?.title],
  ["og_description", (p) => p.signals?.og?.description],
  ["og_image", (p) => p.signals?.og?.image],
  ["twitter_card", (p) => p.signals?.twitter?.card],
  ["twitter_image", (p) => p.signals?.twitter?.image],
  ["h1_count", (p) => p.signals?.h1s?.length],
  ["needs_headless", (p) => p.needsHeadless],
  ["ai_score", (p) => p.aiAudit?.score],
  ["ai_aeo", (p) => p.aiAudit?.layers?.aeo?.score],
  ["ai_geo", (p) => p.aiAudit?.layers?.geo?.score],
  ["ai_aio", (p) => p.aiAudit?.layers?.aio?.score],
  ["ai_ago", (p) => p.aiAudit?.layers?.ago?.score],
  ["has_clarity", (p) => (p.signals?.analytics?.tools || []).some((t) => t.key === "clarity")],
  ["clarity_id", (p) => p.signals?.analytics?.clarityId],
  ["trackers", (p) => (p.signals?.analytics?.tools || []).map((t) => t.name).join("; ")],
];

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

  const header = COLUMNS.map(([name]) => name).join(",");
  const rows = result.pages.map((p) =>
    COLUMNS.map(([, get]) => csvEscape(get(p))).join(",")
  );
  const csv = [header, ...rows].join("\n");

  const host = safe.hostname.replace(/[^a-z0-9.-]/gi, "_");
  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="seo-audit-${host}.csv"`,
    },
  });
}
