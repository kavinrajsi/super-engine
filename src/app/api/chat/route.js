// Ask-your-site chat. Builds a context block for the active site and answers the
// conversation. Login-gated + rate-limited.

import { currentUser } from "@/lib/auth/session";
import { isAuthConfigured } from "@/lib/auth/google";
import { getActiveProfile, getProfile } from "@/lib/db/profiles";
import { buildSiteContext } from "@/lib/ai/site-context";
import { answerSiteQuestion } from "@/lib/ai/chat";
import { userModel } from "@/lib/ai/user-model";
import { aiErrorMessage } from "@/lib/ai/errors";
import { rateLimitResponse } from "@/lib/rate-limit";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function POST(request) {
  const user = await currentUser();
  if (isAuthConfigured() && !user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = user?.id ?? null;

  const limited = await rateLimitResponse(request, "chat", { limit: 40, windowSec: 600 }, userId);
  if (limited) return limited;

  let body = {};
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const messages = Array.isArray(body?.messages)
    ? body.messages
        .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
        .slice(-12)
    : [];
  if (!messages.length) return Response.json({ error: "No messages." }, { status: 400 });

  const profile = body?.profileId
    ? await getProfile(body.profileId, userId)
    : await getActiveProfile(userId);

  try {
    const context = await buildSiteContext({ userId, profile });
    const reply = await answerSiteQuestion({ messages, context, model: await userModel(userId) });
    return Response.json({ reply });
  } catch (err) {
    return Response.json({ error: aiErrorMessage(err) }, { status: 502 });
  }
}
