// Start Google login: stash a CSRF state (+ post-login `next` path) and redirect
// to Google's consent screen.

import { randomBytes } from "crypto";
import { cookies } from "next/headers";
import { isAuthConfigured, buildAuthUrl, authRedirectUri } from "@/lib/auth/google";

export async function GET(request) {
  if (!isAuthConfigured()) {
    return Response.json(
      { error: "Login isn't configured (set GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET + DATABASE_URL)." },
      { status: 503 }
    );
  }

  const { origin, searchParams } = new URL(request.url);
  const next = searchParams.get("next") || "/";
  const state = randomBytes(16).toString("base64url");

  const jar = await cookies();
  const opts = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 600 };
  jar.set("auth_state", state, opts);
  // Only allow same-site relative paths for `next` (avoid open redirect).
  jar.set("auth_next", next.startsWith("/") ? next : "/", opts);

  return Response.redirect(buildAuthUrl(authRedirectUri(origin), state));
}
