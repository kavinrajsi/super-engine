// Scheduled re-scan worker. Hit by Vercel Cron (see vercel.json). Finds due
// monitors, re-scans each, saves the result to history, and emails the owner
// when the SEO score drops meaningfully. Secured with CRON_SECRET — Vercel
// sends it as `Authorization: Bearer <CRON_SECRET>`.

import { runScan } from "@/lib/seo/analyze";
import { saveScan } from "@/lib/db/scans";
import { dueMonitors, recordMonitorRun } from "@/lib/db/monitors";
import { sendEmail, isEmailConfigured } from "@/lib/email";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const MONITOR_MAX_PAGES = 10; // bound per-run cost
const BATCH = 10; // monitors processed per invocation (cron timeout guard)
const DROP_ALERT = 5; // points of SEO-score drop that triggers an alert

function authorized(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false; // no secret configured → feature off
  const header = request.headers.get("authorization") || "";
  const qp = new URL(request.url).searchParams.get("secret");
  return header === `Bearer ${secret}` || qp === secret;
}

export async function GET(request) {
  if (!authorized(request)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const due = await dueMonitors(BATCH);
  let checked = 0;
  let alerted = 0;

  for (const m of due) {
    let result;
    try {
      result = await runScan(m.url, { deepScan: !!m.deep, maxPages: MONITOR_MAX_PAGES });
    } catch {
      continue; // leave last_run_at untouched so it retries next window
    }
    checked += 1;
    const score = result.siteScore ?? null;
    const aiOverall = result.aiReadiness?.overall ?? null;

    await saveScan(result, m.user_id); // history row → powers the trend chart
    await recordMonitorRun(m.id, { score, aiOverall });

    // Alert on a meaningful regression vs the previous run.
    const prev = m.last_score;
    if (
      isEmailConfigured() &&
      m.user_email &&
      prev != null &&
      score != null &&
      prev - score >= DROP_ALERT
    ) {
      const ok = await sendEmail({
        to: m.user_email,
        subject: `⚠ SEO score dropped for ${m.url}`,
        text:
          `Your monitored site ${m.url} dropped from ${prev} to ${score} ` +
          `(SEO health). AI readiness is now ${aiOverall ?? "—"}.\n\n` +
          `Re-run a full audit at ${new URL("/seo", request.url).origin}/seo?url=${encodeURIComponent(m.url)}`,
      });
      if (ok) alerted += 1;
    }
  }

  return Response.json({ checked, alerted, due: due.length });
}
