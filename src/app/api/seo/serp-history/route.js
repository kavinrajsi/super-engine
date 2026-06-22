// Rank-over-time series for a domain, read from stored SERP snapshots. Read-only
// (no provider call), so it's cheap; lightly rate-limited.

import { domainOf } from "@/lib/seo/dataforseo";
import { pivotSerpHistory } from "@/lib/seo/serp";
import { serpHistory } from "@/lib/db/records";
import { rateLimitResponse } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const rawUrl = searchParams.get("url") || "";
  const days = Math.min(Number(searchParams.get("days")) || 30, 90);
  if (!rawUrl) return Response.json({ error: "Missing url." }, { status: 400 });

  const limited = await rateLimitResponse(request, "serp-history", { limit: 60, windowSec: 600 });
  if (limited) return limited;

  const domain = domainOf(rawUrl);
  const rows = await serpHistory(domain, days);
  const history = pivotSerpHistory(rows);
  return Response.json({ domain, points: rows.length, history });
}
