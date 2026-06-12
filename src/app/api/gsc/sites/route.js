// List the verified Search Console properties for the connected visitor.

import { cookies } from "next/headers";
import { getValidAccessToken } from "@/lib/gsc/tokens";
import { listSites } from "@/lib/gsc/api";

export async function GET() {
  const sessionId = (await cookies()).get("gsc_session")?.value;
  if (!sessionId) return Response.json({ error: "not_connected" }, { status: 401 });

  try {
    const auth = await getValidAccessToken(sessionId);
    if (!auth) return Response.json({ error: "not_connected" }, { status: 401 });
    const sites = await listSites(auth.accessToken);
    return Response.json({ email: auth.email, sites });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 502 });
  }
}
