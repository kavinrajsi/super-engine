// Google OAuth 2.0 for Search Console — raw REST (no googleapis dep).
//
// Flow: buildAuthUrl() -> Google consent -> callback gets a code ->
// exchangeCode() -> { access_token, refresh_token, expires_in, id_token }.
// Access tokens are short-lived; refreshAccessToken() trades the long-lived
// refresh token for a fresh access token.

const AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";

// Read-only Search Console + Google Analytics (GA4) access, plus identity for a
// friendly "connected as". One unified consent powers the combined /seo page.
// NOTE: adding analytics.readonly changes the consent — already-connected users
// must reconnect once to grant the new scope (prompt:"consent" handles that).
export const GSC_SCOPE =
  "https://www.googleapis.com/auth/webmasters.readonly https://www.googleapis.com/auth/analytics.readonly openid email";

export function isGscConfigured() {
  return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

// The redirect URI must exactly match one registered in the Google console.
// Prefer an explicit override, else derive from the request origin.
export function redirectUri(origin) {
  return process.env.GSC_REDIRECT_URI || `${origin}/api/gsc/callback`;
}

export function buildAuthUrl(redirect, state) {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: redirect,
    response_type: "code",
    scope: GSC_SCOPE,
    access_type: "offline", // ask for a refresh token
    prompt: "consent", // force refresh-token issuance on re-connect
    include_granted_scopes: "true",
    state,
  });
  return `${AUTH_ENDPOINT}?${params}`;
}

async function postToken(body) {
  const res = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error_description || json.error || `Token request failed (${res.status})`);
  }
  return json;
}

export function exchangeCode(code, redirect) {
  return postToken({
    code,
    client_id: process.env.GOOGLE_CLIENT_ID,
    client_secret: process.env.GOOGLE_CLIENT_SECRET,
    redirect_uri: redirect,
    grant_type: "authorization_code",
  });
}

export function refreshAccessToken(refreshToken) {
  return postToken({
    client_id: process.env.GOOGLE_CLIENT_ID,
    client_secret: process.env.GOOGLE_CLIENT_SECRET,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });
}

// Pull the user's email out of the OIDC id_token (no signature check needed —
// it came straight from Google's token endpoint over TLS).
export function emailFromIdToken(idToken) {
  try {
    const payload = idToken.split(".")[1];
    const json = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return json.email || null;
  } catch {
    return null;
  }
}
