// Start the Google OAuth flow: set a CSRF `state` cookie and redirect to consent.

import { randomBytes } from "crypto";
import { cookies } from "next/headers";
import { isGscConfigured, buildAuthUrl, redirectUri } from "@/lib/gsc/oauth";

export async function GET(request) {
  if (!isGscConfigured()) {
    return Response.json(
      { error: "Search Console isn't configured (set GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET)." },
      { status: 503 }
    );
  }

  const origin = new URL(request.url).origin;
  const state = randomBytes(16).toString("base64url");

  const jar = await cookies();
  jar.set("gsc_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600, // 10 minutes to complete consent
  });

  return Response.redirect(buildAuthUrl(redirectUri(origin), state));
}
