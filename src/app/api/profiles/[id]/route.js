// Brand memory profile: read / update / delete one. Scoped to the caller.

import { currentUser } from "@/lib/auth/session";
import { isAuthConfigured } from "@/lib/auth/google";
import { getProfile, updateProfile, deleteProfile } from "@/lib/db/profiles";

export const dynamic = "force-dynamic";

async function requireUserId() {
  const user = await currentUser();
  if (isAuthConfigured() && !user) return { error: true };
  return { userId: user?.id ?? null };
}

export async function GET(request, { params }) {
  const { error, userId } = await requireUserId();
  if (error) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const profile = await getProfile(id, userId);
  if (!profile) return Response.json({ error: "Not found." }, { status: 404 });
  return Response.json({ profile });
}

export async function PUT(request, { params }) {
  const { error, userId } = await requireUserId();
  if (error) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const name = (body?.name || "").trim();
  if (!name) return Response.json({ error: "A profile name is required." }, { status: 400 });

  const profile = await updateProfile(id, userId, {
    name,
    websiteUrl: (body?.websiteUrl || "").trim() || null,
    markdown: typeof body?.markdown === "string" ? body.markdown : "",
  });
  if (!profile) return Response.json({ error: "Not found." }, { status: 404 });
  return Response.json({ profile });
}

export async function DELETE(request, { params }) {
  const { error, userId } = await requireUserId();
  if (error) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const ok = await deleteProfile(id, userId);
  if (!ok) return Response.json({ error: "Not found." }, { status: 404 });
  return Response.json({ ok: true });
}
