// On-demand backlinks snapshot for the scan overview. No-ops to
// { configured:false } until a backlink provider is wired (see lib/seo/backlinks).
// Reuses a recent snapshot (≤24h) before any paid provider call.

import { assertSafeUrl } from "@/lib/seo/safe-fetch";
import { fetchBacklinks, isBacklinksConfigured, backlinksProvider, domainOf } from "@/lib/seo/backlinks";
import { saveBacklinksSnapshot, latestBacklinksSnapshot } from "@/lib/db/records";

export const maxDuration = 60;

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const rawUrl = searchParams.get("url") || "";
  const force = searchParams.get("force") === "1";

  try {
    assertSafeUrl(rawUrl); // SSRF guard / validation
  } catch (err) {
    return Response.json({ error: err.message }, { status: 400 });
  }

  if (!isBacklinksConfigured()) {
    return Response.json({ configured: false });
  }

  const domain = domainOf(rawUrl);
  try {
    if (!force) {
      const cached = await latestBacklinksSnapshot(domain, 1440);
      if (cached) return Response.json({ ...cached, cached: true });
    }
    const data = await fetchBacklinks(rawUrl);
    if (data.configured) await saveBacklinksSnapshot({ domain, provider: backlinksProvider(), data });
    return Response.json(data);
  } catch (e) {
    return Response.json({ error: e.message }, { status: 502 });
  }
}
