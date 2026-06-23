// GSC Page Indexing report for a connected property.
// Button-gated: ?check=1 is a cheap probe; the real call inspects up to 15 sitemap
// URLs via the URL Inspection API and aggregates by coverage reason. Results are
// cached for 24h to stay well within the 2,000/day/property rate limit.

import { cookies } from "next/headers";
import { getValidAccessToken } from "@/lib/gsc/tokens";
import { buildIndexingReport } from "@/lib/gsc/api";
import { saveGscIndexingSnapshot, latestGscIndexingSnapshot } from "@/lib/db/records";
import { rateLimitResponse } from "@/lib/rate-limit";

export const maxDuration = 60;

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const site = searchParams.get("site");
  const force = searchParams.get("force") === "1";

  if (!site) return Response.json({ error: "Missing ?site" }, { status: 400 });

  const sessionId = (await cookies()).get("gsc_session")?.value;
  if (!sessionId) return Response.json({ error: "not_connected" }, { status: 401 });

  const auth = await getValidAccessToken(sessionId);
  if (!auth) return Response.json({ error: "not_connected" }, { status: 401 });

  // Cheap probe — lets the UI show a "Load" button without spending API quota on render.
  if (searchParams.get("check") === "1") {
    return Response.json({ configured: true, loaded: false });
  }

  const limited = await rateLimitResponse(request, "gsc-indexing", { limit: 5, windowSec: 3600 });
  if (limited) return limited;

  try {
    if (!force) {
      const cached = await latestGscIndexingSnapshot(site, 1440);
      if (cached) return Response.json({ ...cached, cached: true });
    }
    const data = await buildIndexingReport(auth.accessToken, site);
    await saveGscIndexingSnapshot({ siteUrl: site, data });
    return Response.json(data);
  } catch (e) {
    return Response.json({ error: e.message }, { status: 502 });
  }
}
