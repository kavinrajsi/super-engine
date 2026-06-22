// Daily rank-tracking capture. Hit by Vercel Cron. For each domain the user has
// opted into (loaded live rank at least once), re-runs the live SERP for the
// same keywords and stores a snapshot — accumulating a rank time series.
// Secured with CRON_SECRET; paid (DataForSEO) so bounded per run.

import { timingSafeEqual } from "node:crypto";
import { fetchSerp, isSerpConfigured, serpProvider } from "@/lib/seo/serp";
import {
  domainsWithSerpSnapshots,
  latestSerpSnapshot,
  saveSerpSnapshot,
} from "@/lib/db/records";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const MAX_DOMAINS = 25; // bound paid SERP calls per run

function safeEq(a, b) {
  const A = Buffer.from(a || "", "utf8");
  const B = Buffer.from(b || "", "utf8");
  return A.length === B.length && timingSafeEqual(A, B);
}

function authorized(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = request.headers.get("authorization") || "";
  const qp = new URL(request.url).searchParams.get("secret") || "";
  return safeEq(header, `Bearer ${secret}`) || safeEq(qp, secret);
}

export async function GET(request) {
  if (!authorized(request)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!isSerpConfigured()) {
    return Response.json({ ok: true, captured: 0, skipped: "serp_not_configured" });
  }

  const domains = (await domainsWithSerpSnapshots(7)).slice(0, MAX_DOMAINS);
  let captured = 0;
  for (const domain of domains) {
    try {
      // Reuse the keywords from the most recent snapshot (look back generously).
      const last = await latestSerpSnapshot(domain, 60 * 24 * 30);
      const keywords = (last?.results || []).map((r) => r.keyword).filter(Boolean);
      if (!keywords.length) continue;
      const data = await fetchSerp(domain, keywords);
      if (data?.results?.length) {
        await saveSerpSnapshot({ domain, provider: serpProvider(), data });
        captured += 1;
      }
    } catch {
      /* skip this domain */
    }
  }

  return Response.json({ ok: true, due: domains.length, captured });
}
