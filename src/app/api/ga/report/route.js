// Google Analytics (GA4) report for one property + date window: totals, deltas,
// trend, and top pages/channels/countries. Unified Google connection (gsc_session).

import { cookies } from "next/headers";
import { getValidAccessToken } from "@/lib/gsc/tokens";
import { buildGaReport } from "@/lib/ga/api";
import { saveGaReport } from "@/lib/db/records";

export const maxDuration = 60;

const ALLOWED_DAYS = new Set([7, 28, 90]);

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const property = searchParams.get("property");
  let days = parseInt(searchParams.get("days") || "28", 10);
  if (!ALLOWED_DAYS.has(days)) days = 28;
  if (!property) return Response.json({ error: "Missing ?property" }, { status: 400 });

  const sessionId = (await cookies()).get("gsc_session")?.value;
  if (!sessionId) return Response.json({ error: "not_connected" }, { status: 401 });

  try {
    const auth = await getValidAccessToken(sessionId);
    if (!auth) return Response.json({ error: "not_connected" }, { status: 401 });
    const report = await buildGaReport(auth.accessToken, property, days);
    await saveGaReport({ sessionId, email: auth.email, property, days, report });
    return Response.json(report);
  } catch (e) {
    return Response.json({ error: e.message }, { status: 502 });
  }
}
