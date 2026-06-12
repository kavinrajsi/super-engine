// Sign out: delete the session row and clear the cookie.

import { cookies } from "next/headers";
import { deleteSession, SESSION_COOKIE } from "@/lib/auth/session";

export async function POST() {
  const jar = await cookies();
  const sessionId = jar.get(SESSION_COOKIE)?.value;
  if (sessionId) {
    try {
      await deleteSession(sessionId);
    } catch {
      /* best-effort */
    }
  }
  jar.delete(SESSION_COOKIE);
  return Response.json({ ok: true });
}
