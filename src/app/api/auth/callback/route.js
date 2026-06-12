// OAuth callback: verify state, exchange the code, upsert the user + session,
// set the session cookie, and bounce to the post-login path.

import { cookies } from "next/headers";
import { isAuthConfigured, exchangeCode, profileFromIdToken, authRedirectUri } from "@/lib/auth/google";
import { upsertUserAndSession, SESSION_COOKIE } from "@/lib/auth/session";

function back(origin, path, params = {}) {
  const url = new URL(path, origin);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return Response.redirect(url);
}

export async function GET(request) {
  const { origin, searchParams } = new URL(request.url);
  if (!isAuthConfigured()) return back(origin, "/login", { error: "not_configured" });

  const jar = await cookies();
  const next = jar.get("auth_next")?.value || "/";
  const expectedState = jar.get("auth_state")?.value;
  jar.delete("auth_state");
  jar.delete("auth_next");

  if (searchParams.get("error")) return back(origin, "/login", { error: searchParams.get("error") });

  const code = searchParams.get("code");
  const state = searchParams.get("state");
  if (!code || !state || state !== expectedState) {
    return back(origin, "/login", { error: "state_mismatch" });
  }

  try {
    const tokens = await exchangeCode(code, authRedirectUri(origin));
    const profile = profileFromIdToken(tokens.id_token);
    if (!profile?.sub) return back(origin, "/login", { error: "no_profile" });

    const session = await upsertUserAndSession(profile);
    if (!session) return back(origin, "/login", { error: "no_database" });

    jar.set(SESSION_COOKIE, session.sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: session.maxAge,
    });
    return back(origin, next.startsWith("/") ? next : "/");
  } catch {
    return back(origin, "/login", { error: "exchange_failed" });
  }
}
