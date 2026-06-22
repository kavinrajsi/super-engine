// Generated-content item: change review status (PATCH) or delete (DELETE).
// Scoped to the caller; best-effort like the rest of the content API.

import { currentUser } from "@/lib/auth/session";
import { isAuthConfigured } from "@/lib/auth/google";
import { updateContentStatus, deleteContent } from "@/lib/db/content";

export const dynamic = "force-dynamic";

async function requireUserId() {
  const user = await currentUser();
  if (isAuthConfigured() && !user) return { error: true };
  return { userId: user?.id ?? null };
}

export async function PATCH(request, { params }) {
  const { error, userId } = await requireUserId();
  if (error) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const status = body?.status;
  if (status !== "draft" && status !== "approved") {
    return Response.json({ error: "status must be 'draft' or 'approved'." }, { status: 400 });
  }

  const item = await updateContentStatus(id, userId, status);
  if (!item) return Response.json({ error: "Not found." }, { status: 404 });
  return Response.json({ item });
}

export async function DELETE(request, { params }) {
  const { error, userId } = await requireUserId();
  if (error) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const ok = await deleteContent(id, userId);
  if (!ok) return Response.json({ error: "Not found." }, { status: 404 });
  return Response.json({ ok: true });
}
