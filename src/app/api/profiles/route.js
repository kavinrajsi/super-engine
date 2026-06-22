// Brand memory profiles: list + create. Login-only (no Pro gate); falls back to
// anonymous (user_id NULL) rows when auth is unconfigured, like scanning does.

import { currentUser } from "@/lib/auth/session";
import { isAuthConfigured } from "@/lib/auth/google";
import { listProfiles, createProfile } from "@/lib/db/profiles";

export const dynamic = "force-dynamic";

async function requireUserId() {
  const user = await currentUser();
  if (isAuthConfigured() && !user) return { error: true };
  return { userId: user?.id ?? null };
}

export async function GET() {
  const { error, userId } = await requireUserId();
  if (error) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const profiles = await listProfiles(userId);
  return Response.json({ profiles });
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

  const name = (body?.name || "").trim();
  if (!name) return Response.json({ error: "A profile name is required." }, { status: 400 });

  const profile = await createProfile(userId, {
    name,
    websiteUrl: (body?.websiteUrl || "").trim() || null,
    markdown: typeof body?.markdown === "string" ? body.markdown : "",
  });
  if (!profile) {
    return Response.json({ error: "Could not save profile (database unavailable)." }, { status: 503 });
  }
  return Response.json({ profile });
}
