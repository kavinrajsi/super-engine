// Connect / disconnect a user's Cloudflare account via a read-only Analytics
// token. The token is verified, stored encrypted, and never returned.

import { currentUser } from "@/lib/auth/session";
import { isAuthConfigured } from "@/lib/auth/google";
import { hasCloudflareToken, saveCloudflareToken, clearCloudflareToken } from "@/lib/db/cloudflare";
import { verifyToken } from "@/lib/cloudflare/api";

export const dynamic = "force-dynamic";

async function requireUserId() {
  const user = await currentUser();
  if (isAuthConfigured() && !user) return { error: true };
  return { userId: user?.id ?? null };
}

export async function GET() {
  const { error, userId } = await requireUserId();
  if (error) return Response.json({ error: "Unauthorized" }, { status: 401 });
  return Response.json({ connected: await hasCloudflareToken(userId) });
}

export async function POST(request) {
  const { error, userId } = await requireUserId();
  if (error) return Response.json({ error: "Unauthorized" }, { status: 401 });

  let body = {};
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const token = (body?.token || "").trim();
  if (!token) return Response.json({ error: "Paste your Cloudflare API token." }, { status: 400 });

  if (!(await verifyToken(token))) {
    return Response.json(
      { error: "That token didn't verify. Use a token with Account Analytics: Read + Zone Analytics: Read." },
      { status: 400 }
    );
  }
  const ok = await saveCloudflareToken(userId, token);
  if (!ok) return Response.json({ error: "Couldn't save the token." }, { status: 500 });
  return Response.json({ connected: true });
}

export async function DELETE() {
  const { error, userId } = await requireUserId();
  if (error) return Response.json({ error: "Unauthorized" }, { status: 401 });
  await clearCloudflareToken(userId);
  return Response.json({ connected: false });
}
