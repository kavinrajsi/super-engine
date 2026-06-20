// On-demand single-page audit for the /seo dashboard's SEO/Technical/Links/GEO
// tabs. Derives a URL from the connected Search Console property, reuses a recent
// saved scan when possible, otherwise runs runScan once. Requires the unified
// Google connection (gsc_session) — same auth as /api/gsc/report.
//
// These dashboard audits are intentionally NOT counted against the daily scan
// cap: they're a side-effect of viewing your own connected site, not a scan the
// user explicitly kicked off.

import { cookies } from "next/headers";
import { getValidAccessToken } from "@/lib/gsc/tokens";
import { runScan } from "@/lib/seo/analyze";
import { assertSafeUrl } from "@/lib/seo/safe-fetch";
import { saveScan, latestScanForUrl } from "@/lib/db/scans";
import { currentUser } from "@/lib/auth/session";
import { isAuthConfigured } from "@/lib/auth/google";

export const maxDuration = 60;

// Turn a Search Console property string into a scannable URL.
//   "https://www.example.com/"  -> use as-is (URL-prefix property)
//   "sc-domain:example.com"     -> "https://example.com" (runScan resolves www/https)
//   "properties/123456" (GA)    -> null (no domain to derive)
export function siteUrlForScan(site) {
  if (!site) return null;
  if (/^https?:\/\//i.test(site)) return site;
  if (site.startsWith("sc-domain:")) return `https://${site.slice("sc-domain:".length)}`;
  return null;
}

// Cache-lookup candidates for a scan URL: the canonical rootUrl we'd store can
// differ from the requested URL after a redirect (apex<->www, trailing slash),
// so we probe the likely variants.
function cacheCandidates(url) {
  const out = new Set();
  try {
    const u = new URL(url);
    for (const host of [u.hostname, u.hostname.startsWith("www.") ? u.hostname.slice(4) : `www.${u.hostname}`]) {
      for (const path of [u.pathname.endsWith("/") ? u.pathname : `${u.pathname}/`, u.pathname.replace(/\/$/, "") || "/"]) {
        out.add(`${u.protocol}//${host}${path}${u.search}`);
      }
    }
  } catch {
    out.add(url);
  }
  return [...out];
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const site = searchParams.get("site") || "";
  const force = searchParams.get("force") === "1";

  const sessionId = (await cookies()).get("gsc_session")?.value;
  if (!sessionId) return Response.json({ error: "not_connected" }, { status: 401 });

  const scanUrl = siteUrlForScan(site);
  if (!scanUrl) {
    return Response.json({ error: "no_url_for_ga_property" }, { status: 400 });
  }

  let safeUrl;
  try {
    safeUrl = assertSafeUrl(scanUrl).toString();
  } catch (e) {
    return Response.json({ error: e.message }, { status: 400 });
  }

  try {
    const auth = await getValidAccessToken(sessionId);
    if (!auth) return Response.json({ error: "not_connected" }, { status: 401 });

    const appUser = isAuthConfigured() ? await currentUser() : null;
    const userId = appUser?.id ?? null;

    // Reuse a recent audit unless the caller forces a fresh scan.
    if (!force) {
      const cached = await latestScanForUrl(cacheCandidates(safeUrl), userId, 60);
      if (cached) return Response.json({ result: cached, cached: true });
    }

    const result = await runScan(safeUrl, { deepScan: false, maxPages: 1 });
    await saveScan(result, userId); // best-effort
    return Response.json({ result, cached: false });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 502 });
  }
}
