// Daily Ideas worker. Hit by Vercel Cron (see vercel.json). For each saved site
// that hasn't had ideas generated today, scans Google News for its topics and
// asks the model for timely, on-brand post ideas. Secured with CRON_SECRET.
// (No Search Console here — GSC auth is per-session; that enrichment is only on
// the on-page "Generate now".)

import { timingSafeEqual } from "node:crypto";
import { dueIdeaSites } from "@/lib/db/profiles";
import { saveContent } from "@/lib/db/content";
import { ideaKeywords, fetchNews } from "@/lib/seo/news";
import { generateIdeas } from "@/lib/ai/generate-ideas";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const BATCH = 10; // sites per invocation (cron timeout guard)

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

  const sites = await dueIdeaSites(BATCH);
  let generated = 0;
  for (const site of sites) {
    try {
      const headlines = await fetchNews(ideaKeywords(site));
      const result = await generateIdeas({
        profileMarkdown: site.markdown,
        siteUrl: site.website_url,
        headlines,
      });
      await saveContent({
        userId: site.user_id,
        profileId: site.id,
        kind: "idea",
        topic: site.name,
        data: { ideas: result.ideas, headlines, gscUsed: false },
      });
      generated += 1;
    } catch {
      /* skip this site; don't mark done so a later run can retry */
    }
  }

  return Response.json({ ok: true, due: sites.length, generated });
}
