// Post ideas: list saved post sets (GET) and generate+save a new one (POST).
// Uses the chosen brand profile's Markdown memory as AI context.

import { currentUser } from "@/lib/auth/session";
import { isAuthConfigured } from "@/lib/auth/google";
import { getProfile } from "@/lib/db/profiles";
import { listContent, saveContent } from "@/lib/db/content";
import { generateSocialPosts } from "@/lib/ai/generate-social";
import { userModel } from "@/lib/ai/user-model";
import { aiErrorMessage } from "@/lib/ai/errors";
import { rateLimitResponse } from "@/lib/rate-limit";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

async function requireUserId() {
  const user = await currentUser();
  if (isAuthConfigured() && !user) return { error: true };
  return { userId: user?.id ?? null };
}

export async function GET() {
  const { error, userId } = await requireUserId();
  if (error) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const items = await listContent(userId, { kind: "social" });
  return Response.json({ items });
}

export async function POST(request) {
  const { error, userId } = await requireUserId();
  if (error) return Response.json({ error: "Unauthorized" }, { status: 401 });

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const topic = (body?.topic || "").trim();
  if (!topic) return Response.json({ error: "A topic is required." }, { status: 400 });

  const platforms = Array.isArray(body?.platforms) ? body.platforms : [];
  if (!platforms.length) {
    return Response.json({ error: "Select at least one platform." }, { status: 400 });
  }

  const limited = await rateLimitResponse(request, "post-ideas", { limit: 20, windowSec: 600 }, userId);
  if (limited) return limited;

  const profile = body?.profileId ? await getProfile(body.profileId, userId) : null;

  let result;
  try {
    result = await generateSocialPosts({
      profileMarkdown: profile?.markdown || "",
      topic,
      platforms,
      model: await userModel(userId),
    });
  } catch (err) {
    return Response.json({ error: aiErrorMessage(err) }, { status: 502 });
  }

  const saved = await saveContent({
    userId,
    profileId: profile?.id || null,
    kind: "social",
    topic,
    platforms: platforms.join(","),
    title: topic,
    data: result,
  });

  return Response.json({ item: saved, result });
}
