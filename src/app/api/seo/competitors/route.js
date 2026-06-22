// On-demand competitor discovery for the /competitors page. No-ops to
// { configured:false } until DataForSEO and/or the AI gateway is set. Discovery
// is paid/metered, so this is button-triggered (?check=1 is a free capability
// probe) and reuses a ≤24h snapshot before re-running.

import { assertSafeUrl } from "@/lib/seo/safe-fetch";
import { discoverCompetitors, isCompetitorsConfigured } from "@/lib/seo/competitors";
import { domainOf } from "@/lib/seo/dataforseo";
import { saveCompetitorSnapshot, latestCompetitorSnapshot } from "@/lib/db/records";
import { rateLimitResponse } from "@/lib/rate-limit";

export const maxDuration = 60;

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const rawUrl = searchParams.get("url") || "";
  const force = searchParams.get("force") === "1";
  const keywords = (searchParams.get("keywords") || "")
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);

  try {
    assertSafeUrl(rawUrl);
  } catch (err) {
    return Response.json({ error: err.message }, { status: 400 });
  }

  if (!isCompetitorsConfigured()) {
    return Response.json({ configured: false });
  }
  if (searchParams.get("check") === "1") {
    return Response.json({ configured: true, loaded: false });
  }

  const limited = await rateLimitResponse(request, "competitors", { limit: 10, windowSec: 3600 });
  if (limited) return limited;

  const domain = domainOf(rawUrl);
  try {
    if (!force) {
      const cached = await latestCompetitorSnapshot(domain, 1440);
      if (cached) return Response.json({ ...cached, cached: true });
    }
    const data = await discoverCompetitors(rawUrl, { keywords });
    if (data.configured) await saveCompetitorSnapshot({ domain, data });
    return Response.json(data);
  } catch (e) {
    return Response.json({ error: e.message }, { status: 502 });
  }
}
