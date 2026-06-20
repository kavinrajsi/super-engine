// On-demand live SERP snapshot for the scan overview. No-ops to
// { configured:false } until a SERP provider is wired (see lib/seo/serp).
// Keywords are passed by the client (derived from on-page signals via
// candidateKeywords). Reuses a recent snapshot (≤24h) before any paid call.

import { assertSafeUrl } from "@/lib/seo/safe-fetch";
import { fetchSerp, isSerpConfigured, serpProvider } from "@/lib/seo/serp";
import { domainOf } from "@/lib/seo/backlinks";
import { saveSerpSnapshot, latestSerpSnapshot } from "@/lib/db/records";

export const maxDuration = 60;

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const rawUrl = searchParams.get("url") || "";
  const keywords = (searchParams.get("keywords") || "")
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);
  const force = searchParams.get("force") === "1";

  try {
    assertSafeUrl(rawUrl);
  } catch (err) {
    return Response.json({ error: err.message }, { status: 400 });
  }

  if (!isSerpConfigured()) {
    return Response.json({ configured: false });
  }

  const domain = domainOf(rawUrl);
  try {
    if (!force) {
      const cached = await latestSerpSnapshot(domain, 1440);
      if (cached) return Response.json({ ...cached, cached: true });
    }
    const data = await fetchSerp(rawUrl, keywords);
    if (data.configured && data.results?.length) {
      await saveSerpSnapshot({ domain, provider: serpProvider(), data });
    }
    return Response.json(data);
  } catch (e) {
    return Response.json({ error: e.message }, { status: 502 });
  }
}
