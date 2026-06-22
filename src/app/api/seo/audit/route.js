// On-demand audit powering the /seo dashboard's SEO/Pages/Issues/Technical/GEO/
// Tracking tabs. Two modes:
//   - ?url=<site>   audit any URL (no Google needed). Login-gated only. With
//                   &full=1 it does a multi-page scan (plan.maxPages), &deep=1
//                   a deep scan; otherwise a cheap single page for the auto view.
//   - ?site=<gsc>   derive the URL from a connected Search Console property
//                   (requires gsc_session) — the cheap single-page auto view.
// Reuses a recent saved scan when possible; explicit full/deep runs force fresh.
// Returns the share token so /seo can offer share/export of the result.

import { cookies } from "next/headers";
import { getValidAccessToken } from "@/lib/gsc/tokens";
import { runScan } from "@/lib/seo/analyze";
import { assertSafeUrl } from "@/lib/seo/safe-fetch";
import { saveScan, latestScanForUrl } from "@/lib/db/scans";
import { currentUser } from "@/lib/auth/session";
import { isAuthConfigured } from "@/lib/auth/google";
import { planOf } from "@/lib/auth/plan";
import { listProfiles, touchProfile, createProfile } from "@/lib/db/profiles";
import { normalizeSiteUrl } from "@/lib/site/active";
import { rateLimitResponse } from "@/lib/rate-limit";

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
  const url = (searchParams.get("url") || "").trim();
  const site = searchParams.get("site") || "";
  const deep = searchParams.get("deep") === "1";
  const full = deep || searchParams.get("full") === "1";
  // Explicit full/deep runs always re-scan; cheap auto views reuse the cache.
  const force = full || searchParams.get("force") === "1";

  // Login-gated (when auth is configured); the URL path needs no Google.
  const appUser = isAuthConfigured() ? await currentUser() : null;
  if (isAuthConfigured() && !appUser) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const userId = appUser?.id ?? null;
  const plan = planOf(appUser);

  let scanUrl = null;
  let deepScan = false;
  let maxPages = 1;
  let explicit = false;

  if (url) {
    scanUrl = url;
    explicit = full; // a user-initiated audit (vs. the cheap auto view)
    deepScan = deep && plan.deepScan;
    maxPages = full ? plan.maxPages : 1;
  } else if (site) {
    // Auto view from a connected Search Console property — requires Google.
    const sessionId = (await cookies()).get("gsc_session")?.value;
    if (!sessionId) return Response.json({ error: "not_connected" }, { status: 401 });
    const auth = await getValidAccessToken(sessionId);
    if (!auth) return Response.json({ error: "not_connected" }, { status: 401 });
    scanUrl = siteUrlForScan(site);
    if (!scanUrl) return Response.json({ error: "no_url_for_ga_property" }, { status: 400 });
  } else {
    return Response.json({ error: "missing_target" }, { status: 400 });
  }

  let safeUrl;
  try {
    safeUrl = assertSafeUrl(scanUrl).toString();
  } catch (e) {
    return Response.json({ error: e.message }, { status: 400 });
  }

  try {
    // Reuse a recent audit unless this is an explicit/forced run.
    if (!force) {
      const cached = await latestScanForUrl(cacheCandidates(safeUrl), userId, 60);
      if (cached) return Response.json({ result: cached, cached: true });
    }

    // Rate-limit only actual scans (cache hits above are cheap).
    const limited = await rateLimitResponse(request, "audit", { limit: 30, windowSec: 600 }, userId);
    if (limited) return limited;

    const result = await runScan(safeUrl, { deepScan, maxPages });
    const shareToken = await saveScan(result, userId); // best-effort

    // Remember explicitly-audited sites in the active-site store (mirror /scan).
    if (explicit && appUser) {
      try {
        const host = new URL(result.rootUrl).host.replace(/^www\./, "");
        const profiles = await listProfiles(appUser.id);
        const match = profiles.find((p) => {
          const u = normalizeSiteUrl(p.website_url);
          return u && u.host.replace(/^www\./, "") === host;
        });
        if (match) await touchProfile(match.id, appUser.id);
        else await createProfile(appUser.id, { name: host, websiteUrl: result.rootUrl });
      } catch {
        /* best-effort */
      }
    }

    return Response.json({ result, cached: false, shareToken });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 502 });
  }
}
