// Cloudflare analytics for a domain: Web Analytics (RUM) + zone HTTP traffic.
// Uses the connected user's stored token; resolves the zone from the domain.

import { currentUser } from "@/lib/auth/session";
import { isAuthConfigured } from "@/lib/auth/google";
import { getCloudflareToken } from "@/lib/db/cloudflare";
import { buildCloudflareReport } from "@/lib/cloudflare/api";
import { domainOf } from "@/lib/seo/dataforseo";
import { rateLimitResponse } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(request) {
  const user = await currentUser();
  if (isAuthConfigured() && !user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = user?.id ?? null;

  const { searchParams } = new URL(request.url);
  const rawUrl = searchParams.get("url") || "";
  const days = Math.min(Number(searchParams.get("days")) || 28, 90);
  if (!rawUrl) return Response.json({ error: "Missing url." }, { status: 400 });

  const token = await getCloudflareToken(userId);
  if (!token) return Response.json({ connected: false });

  const limited = await rateLimitResponse(request, "cf-report", { limit: 30, windowSec: 600 }, userId);
  if (limited) return limited;

  try {
    const report = await buildCloudflareReport(token, domainOf(rawUrl), days);
    return Response.json({ connected: true, ...report });
  } catch (e) {
    return Response.json({ connected: true, error: e.message }, { status: 502 });
  }
}
