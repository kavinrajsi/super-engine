// Daily email digest. Hit by Vercel Cron after the ideas cron. Emails each user
// their fresh ideas for today (+ latest SEO score). Secured with CRON_SECRET;
// idempotent via the digests table; no-ops without ZeptoMail configured.

import { timingSafeEqual } from "node:crypto";
import { todaysIdeaRows } from "@/lib/db/content";
import { markDigestSent } from "@/lib/db/digests";
import { recentScans } from "@/lib/db/scans";
import { sendEmail, isEmailConfigured } from "@/lib/email";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

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

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
  ));
}

export async function GET(request) {
  if (!authorized(request)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!isEmailConfigured()) {
    return Response.json({ ok: true, sent: 0, skipped: "email_not_configured" });
  }

  const origin = new URL(request.url).origin;
  const rows = await todaysIdeaRows();

  // Group today's idea titles by user.
  const byUser = new Map();
  for (const r of rows) {
    if (!byUser.has(r.user_id)) byUser.set(r.user_id, { email: r.email, titles: [] });
    for (const idea of r.data?.ideas || []) {
      if (idea?.title) byUser.get(r.user_id).titles.push(idea.title);
    }
  }

  let sent = 0;
  for (const [userId, { email, titles }] of byUser) {
    if (!email || !titles.length) continue;
    // Claim the slot first → only the first run today proceeds.
    if (!(await markDigestSent(userId))) continue;

    let scoreLine = "";
    try {
      const scans = await recentScans(userId, 1);
      if (scans[0]?.site_score != null) scoreLine = `Latest SEO score: ${scans[0].site_score}/100`;
    } catch {
      /* best-effort */
    }

    const items = titles.slice(0, 8);
    const link = `${origin}/ideas`;
    const html =
      `<h2>Today&rsquo;s content ideas</h2>` +
      (scoreLine ? `<p>${escapeHtml(scoreLine)}</p>` : "") +
      `<ul>${items.map((t) => `<li>${escapeHtml(t)}</li>`).join("")}</ul>` +
      `<p><a href="${link}">Open Ideas →</a></p>`;
    const text =
      `Today's content ideas\n` +
      (scoreLine ? `${scoreLine}\n` : "") +
      `\n${items.map((t) => `- ${t}`).join("\n")}\n\n${link}`;

    if (await sendEmail({ to: email, subject: `Your ${items.length} content ideas for today`, html, text })) {
      sent += 1;
    }
  }

  return Response.json({ ok: true, users: byUser.size, sent });
}
