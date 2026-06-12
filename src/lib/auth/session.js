// Login session storage (Neon): upsert the user on sign-in, mint a session, and
// resolve the current user from the httpOnly `app_session` cookie. No-ops when
// Neon isn't configured.

import { randomBytes } from "crypto";
import { cookies } from "next/headers";
import { sql } from "../db";

export const SESSION_COOKIE = "app_session";
const SESSION_DAYS = 30;

// Upsert the user (by google_sub), create a session, return the session id.
export async function upsertUserAndSession(profile) {
  if (!sql || !profile?.sub) return null;
  const rows = await sql`
    INSERT INTO users (google_sub, email, name, picture, last_login_at)
    VALUES (${profile.sub}, ${profile.email}, ${profile.name}, ${profile.picture}, now())
    ON CONFLICT (google_sub) DO UPDATE SET
      email = EXCLUDED.email,
      name = EXCLUDED.name,
      picture = EXCLUDED.picture,
      last_login_at = now()
    RETURNING id`;
  const userId = rows[0]?.id;
  if (!userId) return null;

  const sessionId = randomBytes(24).toString("base64url");
  const expires = new Date(Date.now() + SESSION_DAYS * 86400_000);
  await sql`
    INSERT INTO sessions (id, user_id, expires_at)
    VALUES (${sessionId}, ${userId}, ${expires.toISOString()})`;
  return { sessionId, maxAge: SESSION_DAYS * 86400 };
}

export async function getSessionUser(sessionId) {
  if (!sql || !sessionId) return null;
  const rows = await sql`
    SELECT u.id, u.email, u.name, u.picture, u.plan
    FROM sessions s JOIN users u ON u.id = s.user_id
    WHERE s.id = ${sessionId} AND (s.expires_at IS NULL OR s.expires_at > now())
    LIMIT 1`;
  return rows[0] || null;
}

export async function deleteSession(sessionId) {
  if (!sql || !sessionId) return;
  await sql`DELETE FROM sessions WHERE id = ${sessionId}`;
}

// Server helper: the signed-in user (or null) for the current request.
export async function currentUser() {
  const sessionId = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!sessionId) return null;
  try {
    return await getSessionUser(sessionId);
  } catch {
    return null;
  }
}
