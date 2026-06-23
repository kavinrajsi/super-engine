// OAuth callback: verify state, exchange the code, persist tokens, set a session
// cookie, and bounce back to the Search Console page.

import { cookies } from "next/headers";
import { isGscConfigured, exchangeCode, redirectUri, emailFromIdToken } from "@/lib/gsc/oauth";
import { saveTokens, newSessionId, setTokenUser } from "@/lib/gsc/tokens";
import { currentUser } from "@/lib/auth/session";

function back(origin, params) {
  const url = new URL("/seo", origin);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return Response.redirect(url);
}

export async function GET(request) {
  const { origin, searchParams } = new URL(request.url);
  if (!isGscConfigured()) return back(origin, { error: "not_configured" });

  const error = searchParams.get("error");
  if (error) return back(origin, { error });

  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const jar = await cookies();
  const expectedState = jar.get("gsc_state")?.value;
  jar.delete("gsc_state");

  if (!code || !state || state !== expectedState) {
    return back(origin, { error: "state_mismatch" });
  }

  try {
    const tokens = await exchangeCode(code, redirectUri(origin));
    const email = emailFromIdToken(tokens.id_token);
    const sessionId = newSessionId();
    const saved = await saveTokens(sessionId, tokens, email);
    if (!saved) return back(origin, { error: "no_database" });

    // Link this GSC session to the app user (if signed in) so background crons
    // — e.g. the weekly digest — can reach GA/GSC by user_id later.
    try {
      const appUser = await currentUser();
      if (appUser?.id) await setTokenUser(sessionId, appUser.id);
    } catch {
      /* not logged in / no DB — fine */
    }

    jar.set("gsc_session", sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });
    return back(origin, { connected: "1" });
  } catch (e) {
    return back(origin, { error: "exchange_failed" });
  }
}
