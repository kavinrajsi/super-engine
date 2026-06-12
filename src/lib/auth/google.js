// Google OAuth for app login (identity only) — raw REST, no googleapis dep.
// Separate from the Search Console flow (src/lib/gsc): this uses only the
// non-sensitive `openid email profile` scopes, so no Google verification is
// needed and any Google user can sign in.

import { sql } from "../db";

const AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";

export const LOGIN_SCOPE = "openid email profile";

export function isAuthConfigured() {
  return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && sql);
}

// Redirect URI must exactly match one registered in the Google console.
export function authRedirectUri(origin) {
  return process.env.AUTH_REDIRECT_URI || `${origin}/api/auth/callback`;
}

export function buildAuthUrl(redirect, state) {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: redirect,
    response_type: "code",
    scope: LOGIN_SCOPE,
    prompt: "select_account",
    state,
  });
  return `${AUTH_ENDPOINT}?${params}`;
}

export async function exchangeCode(code, redirect) {
  const res = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: redirect,
      grant_type: "authorization_code",
    }),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error_description || json.error || `Token request failed (${res.status})`);
  }
  return json;
}

// Decode the OIDC id_token (came straight from Google over TLS — no local
// signature check needed) into a basic profile.
export function profileFromIdToken(idToken) {
  try {
    const payload = idToken.split(".")[1];
    const c = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return { sub: c.sub, email: c.email || null, name: c.name || null, picture: c.picture || null };
  } catch {
    return null;
  }
}
