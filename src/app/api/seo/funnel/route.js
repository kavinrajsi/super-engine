// Combined "how people found you" funnel for the /seo Traffic tab: merges a
// Search Console report (impressions/clicks) with a GA4 report (sessions/users +
// channel mix). Scoped to the active site — the caller passes the matched GSC
// `site` and/or GA `property`; we never fall back to "the first one", so the
// funnel can't show another site's numbers. Unified Google connection.

import { cookies } from "next/headers";
import { getValidAccessToken } from "@/lib/gsc/tokens";
import { buildReport } from "@/lib/gsc/api";
import { buildGaReport, buildTrafficFunnel } from "@/lib/ga/api";

export const maxDuration = 60;

const ALLOWED_DAYS = new Set([7, 28, 90]);

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  let days = parseInt(searchParams.get("days") || "28", 10);
  if (!ALLOWED_DAYS.has(days)) days = 28;

  const sessionId = (await cookies()).get("gsc_session")?.value;
  if (!sessionId) return Response.json({ error: "not_connected" }, { status: 401 });

  try {
    const auth = await getValidAccessToken(sessionId);
    if (!auth) return Response.json({ error: "not_connected" }, { status: 401 });
    const token = auth.accessToken;

    // Scope strictly to the active-site match the caller resolved. No fallback
    // to "first site/property" — an absent param means that half has no data.
    const site = searchParams.get("site") || null;
    const property = searchParams.get("property") || null;
    if (!site && !property) {
      return Response.json({ error: "no_data", site, property, days });
    }

    // Pull both reports in parallel (each tolerated as null).
    const [gscReport, gaReport] = await Promise.all([
      site ? buildReport(token, site, days).catch(() => null) : null,
      property ? buildGaReport(token, property, days).catch(() => null) : null,
    ]);

    if (!gscReport && !gaReport) {
      return Response.json({ error: "no_data", site, property, days });
    }

    return Response.json({ funnel: buildTrafficFunnel(gscReport, gaReport), site, property, days });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 502 });
  }
}
