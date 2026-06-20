// List the GA4 properties the connected visitor can access. Uses the same
// unified Google connection as Search Console (gsc_session cookie / token store).

import { cookies } from "next/headers";
import { getValidAccessToken } from "@/lib/gsc/tokens";
import { listProperties } from "@/lib/ga/api";

export async function GET() {
  const sessionId = (await cookies()).get("gsc_session")?.value;
  if (!sessionId) return Response.json({ error: "not_connected" }, { status: 401 });

  try {
    const auth = await getValidAccessToken(sessionId);
    if (!auth) return Response.json({ error: "not_connected" }, { status: 401 });
    const properties = await listProperties(auth.accessToken);
    return Response.json({ email: auth.email, properties });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 502 });
  }
}
