// Search Console report for one property + date window: totals, deltas, trend,
// top queries/pages, and striking-distance opportunities.

import { cookies } from "next/headers";
import { getValidAccessToken } from "@/lib/gsc/tokens";
import { buildReport } from "@/lib/gsc/api";

export const maxDuration = 60;

const ALLOWED_DAYS = new Set([7, 28, 90]);

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const site = searchParams.get("site");
  let days = parseInt(searchParams.get("days") || "28", 10);
  if (!ALLOWED_DAYS.has(days)) days = 28;
  if (!site) return Response.json({ error: "Missing ?site" }, { status: 400 });

  const sessionId = (await cookies()).get("gsc_session")?.value;
  if (!sessionId) return Response.json({ error: "not_connected" }, { status: 401 });

  try {
    const auth = await getValidAccessToken(sessionId);
    if (!auth) return Response.json({ error: "not_connected" }, { status: 401 });
    const report = await buildReport(auth.accessToken, site, days);
    return Response.json(report);
  } catch (e) {
    return Response.json({ error: e.message }, { status: 502 });
  }
}
