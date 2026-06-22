// Ideas: list saved daily ideas (GET) and generate a fresh set now (POST).
// "Generate now" scans Google News for the site's topics + (best-effort) the
// site's Search Console demand, then asks the model for timely, on-brand ideas.

import { cookies } from "next/headers";
import { currentUser } from "@/lib/auth/session";
import { isAuthConfigured } from "@/lib/auth/google";
import { getProfile, getActiveProfile } from "@/lib/db/profiles";
import { listContent, saveContent } from "@/lib/db/content";
import { ideaKeywords, fetchNews } from "@/lib/seo/news";
import { generateIdeas } from "@/lib/ai/generate-ideas";
import { userModel } from "@/lib/ai/user-model";
import { aiErrorMessage } from "@/lib/ai/errors";
import { rateLimitResponse } from "@/lib/rate-limit";
import { getValidAccessToken } from "@/lib/gsc/tokens";
import { buildReport } from "@/lib/gsc/api";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

async function requireUserId() {
  const user = await currentUser();
  if (isAuthConfigured() && !user) return { error: true };
  return { userId: user?.id ?? null };
}

function hostOf(url) {
  try {
    return new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

// Best-effort Search Console demand for a domain (manual path only — GSC auth is
// per-session). Tries the likely property forms; returns query strings or [].
async function gscQueriesFor(host) {
  if (!host) return [];
  try {
    const sessionId = (await cookies()).get("gsc_session")?.value;
    if (!sessionId) return [];
    const token = await getValidAccessToken(sessionId);
    if (!token) return [];
    for (const prop of [`sc-domain:${host}`, `https://${host}/`, `https://www.${host}/`]) {
      try {
        const r = await buildReport(token, prop, 28);
        const qs = [
          ...(r.topQueries || []).map((q) => q.query),
          ...(r.strikingDistance || []).map((q) => q.query),
        ].filter(Boolean);
        if (qs.length) return [...new Set(qs)];
      } catch {
        /* wrong property form — try the next */
      }
    }
  } catch {
    /* not connected / token failure */
  }
  return [];
}

export async function GET() {
  const { error, userId } = await requireUserId();
  if (error) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const items = await listContent(userId, { kind: "idea" });
  return Response.json({ items });
}

export async function POST(request) {
  const { error, userId } = await requireUserId();
  if (error) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const limited = await rateLimitResponse(request, "ideas", { limit: 20, windowSec: 600 }, userId);
  if (limited) return limited;

  let body = {};
  try {
    body = await request.json();
  } catch {
    /* no body is fine — use the active site */
  }

  const profile = body?.profileId
    ? await getProfile(body.profileId, userId)
    : await getActiveProfile(userId);
  if (!profile?.website_url) {
    return Response.json(
      { error: "Add a site with a URL in Brand Memory first." },
      { status: 400 }
    );
  }

  const host = hostOf(profile.website_url);
  const keywords = ideaKeywords(profile);
  const [headlines, gscQueries] = await Promise.all([fetchNews(keywords), gscQueriesFor(host)]);

  try {
    const result = await generateIdeas({
      profileMarkdown: profile.markdown,
      siteUrl: profile.website_url,
      headlines,
      gscQueries,
      model: await userModel(userId),
    });
    const saved = await saveContent({
      userId,
      profileId: profile.id,
      kind: "idea",
      topic: host || profile.name,
      data: { ideas: result.ideas, headlines, gscUsed: gscQueries.length > 0 },
    });
    return Response.json({ item: saved, result });
  } catch (err) {
    return Response.json({ error: aiErrorMessage(err) }, { status: 502 });
  }
}
