// Disconnect: delete the stored tokens and clear the session cookie.

import { cookies } from "next/headers";
import { deleteTokens } from "@/lib/gsc/tokens";

export async function POST() {
  const jar = await cookies();
  const sessionId = jar.get("gsc_session")?.value;
  if (sessionId) {
    try {
      await deleteTokens(sessionId);
    } catch {
      /* best-effort */
    }
  }
  jar.delete("gsc_session");
  return Response.json({ ok: true });
}
