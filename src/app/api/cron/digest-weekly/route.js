// Weekly performance digest. Hit by Vercel Cron (Mon). Per user, unifies SEO
// score + rank movement + Cloudflare traffic + (best-effort) Search Console into
// one email. Secured with CRON_SECRET; idempotent via digests(kind='weekly');
// no-ops without ZeptoMail configured.
//
// Note: GA/GSC are reachable here only for users who connected Google while
// logged in (so gsc_tokens.user_id was set). GA4 (property matching) is a TODO;
// this includes GSC totals.

import { timingSafeEqual } from "node:crypto";
import { weeklyDigestRecipients, markDigestSent } from "@/lib/db/digests";
import { recentScans } from "@/lib/db/scans";
import { serpHistory } from "@/lib/db/records";
import { pivotSerpHistory } from "@/lib/seo/serp";
import { getCloudflareToken } from "@/lib/db/cloudflare";
import { buildCloudflareReport } from "@/lib/cloudflare/api";
import { getValidAccessTokenByUserId } from "@/lib/gsc/tokens";
import { buildReport } from "@/lib/gsc/api";
import { domainOf } from "@/lib/seo/dataforseo";
import { sendEmail, isEmailConfigured } from "@/lib/email";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const BATCH = 50;

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
function esc(s) {
  return String(s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
}

// Best-effort GSC totals for a domain via the user's linked token.
async function gscTotals(userId, domain) {
  try {
    const auth = await getValidAccessTokenByUserId(userId);
    if (!auth?.accessToken) return null;
    for (const prop of [`sc-domain:${domain}`, `https://${domain}/`, `https://www.${domain}/`]) {
      try {
        const r = await buildReport(auth.accessToken, prop, 7);
        if (r?.totals) return r.totals;
      } catch {
        /* try next property form */
      }
    }
  } catch {
    /* not linked */
  }
  return null;
}

// Top rank movers from the last week of SERP snapshots.
function rankMovers(history) {
  const movers = [];
  for (const k of history?.keywords || []) {
    const pts = k.points.filter((p) => p.position != null);
    if (pts.length < 2) continue;
    const delta = pts[0].position - pts[pts.length - 1].position; // + = improved
    if (delta !== 0) movers.push({ keyword: k.keyword, latest: pts[pts.length - 1].position, delta });
  }
  return movers.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta)).slice(0, 5);
}

export async function GET(request) {
  if (!authorized(request)) return Response.json({ error: "unauthorized" }, { status: 401 });
  if (!isEmailConfigured()) {
    return Response.json({ ok: true, sent: 0, skipped: "email_not_configured" });
  }

  const origin = new URL(request.url).origin;
  const recipients = await weeklyDigestRecipients(BATCH);
  let sent = 0;

  for (const r of recipients) {
    if (!(await markDigestSent(r.user_id, "weekly"))) continue; // already sent this week-day
    const domain = domainOf(r.website_url);

    const [scans, cfToken, history, gsc] = await Promise.all([
      recentScans(r.user_id, 1).catch(() => []),
      getCloudflareToken(r.user_id).catch(() => null),
      serpHistory(domain, 7).then(pivotSerpHistory).catch(() => null),
      gscTotals(r.user_id, domain),
    ]);

    const score = scans[0]?.site_score;
    let cf = null;
    if (cfToken) {
      cf = await buildCloudflareReport(cfToken, domain, 7).catch(() => null);
    }
    const movers = rankMovers(history);

    // Build the email body.
    const lines = [`Weekly performance — ${r.website_url}`, ""];
    if (score != null) lines.push(`SEO score: ${score}/100`);
    if (gsc) lines.push(`Search Console (7d): ${Math.round(gsc.clicks)} clicks, ${Math.round(gsc.impressions)} impressions`);
    if (cf?.zoneFound) {
      const wa = cf.webAnalytics?.totals;
      const zh = cf.zoneHttp?.totals;
      lines.push(
        `Cloudflare (7d): ${wa?.pageViews ?? "—"} page views, ${zh?.requests ?? "—"} requests, ` +
          `${zh?.threats ?? "—"} threats`
      );
    }
    if (movers.length) {
      lines.push("", "Rank movers:");
      for (const m of movers) {
        lines.push(`- ${m.keyword}: #${m.latest} (${m.delta > 0 ? `▲${m.delta}` : `▼${-m.delta}`})`);
      }
    }
    lines.push("", `${origin}/dashboard`);

    const html =
      `<h2>Weekly performance — ${esc(r.website_url)}</h2><ul>` +
      (score != null ? `<li>SEO score: <b>${score}/100</b></li>` : "") +
      (gsc ? `<li>Search Console (7d): ${Math.round(gsc.clicks)} clicks, ${Math.round(gsc.impressions)} impressions</li>` : "") +
      (cf?.zoneFound
        ? `<li>Cloudflare (7d): ${cf.webAnalytics?.totals?.pageViews ?? "—"} page views, ${cf.zoneHttp?.totals?.requests ?? "—"} requests, ${cf.zoneHttp?.totals?.threats ?? "—"} threats</li>`
        : "") +
      `</ul>` +
      (movers.length
        ? `<p><b>Rank movers</b></p><ul>${movers
            .map((m) => `<li>${esc(m.keyword)}: #${m.latest} (${m.delta > 0 ? `▲${m.delta}` : `▼${-m.delta}`})</li>`)
            .join("")}</ul>`
        : "") +
      `<p><a href="${origin}/dashboard">Open dashboard →</a></p>`;

    if (await sendEmail({ to: r.email, subject: `Weekly performance — ${r.website_url}`, html, text: lines.join("\n") })) {
      sent += 1;
    }
  }

  return Response.json({ ok: true, recipients: recipients.length, sent });
}
