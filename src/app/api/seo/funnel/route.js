// Combined "how people found you" funnel for the /seo Traffic tab: merges a
// Search Console report (impressions/clicks) with a GA4 report (sessions/users +
// channel mix). Auto-picks the first GSC site + first GA property when none is
// given. Unified Google connection (gsc_session).

import { cookies } from "next/headers";
import { getValidAccessToken } from "@/lib/gsc/tokens";
import { listSites, buildReport } from "@/lib/gsc/api";
import { listProperties, buildGaReport, buildTrafficFunnel } from "@/lib/ga/api";

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

    // Resolve a site + property (use explicit params, else the first available).
    let site = searchParams.get("site");
    let property = searchParams.get("property");
    const [sites, properties] = await Promise.all([
      site ? Promise.resolve([site]) : listSites(token).catch(() => []),
      property ? Promise.resolve([{ property }]) : listProperties(token).catch(() => []),
    ]);
    if (!site) site = sites[0] || null;
    if (!property) property = properties[0]?.property || null;

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
