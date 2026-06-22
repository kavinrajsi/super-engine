// Fixed-window rate limiting backed by Neon. Best-effort: when the DB is
// unavailable it allows the request (mirrors the rest of the app's no-DB-noop
// behaviour) — rate limiting is abuse mitigation, not an auth control.

import { sql } from "./db";

// Derive a stable per-caller key: the signed-in user when available, else the
// client IP from the proxy header (Vercel sets x-forwarded-for).
export function clientKey(request, userId = null) {
  if (userId != null) return `u:${userId}`;
  const fwd = request.headers.get("x-forwarded-for") || "";
  const ip = fwd.split(",")[0].trim() || request.headers.get("x-real-ip") || "anon";
  return `ip:${ip}`;
}

// Returns { ok, count, limit, remaining }. `key` should be namespaced by route
// (e.g. "audit:u:42"). One atomic upsert: reset the window when it has elapsed,
// otherwise increment.
export async function checkRateLimit(key, { limit = 30, windowSec = 600 } = {}) {
  if (!sql || !key) return { ok: true, count: 0, limit, remaining: limit };
  try {
    const rows = await sql`
      INSERT INTO rate_limits (key, window_start, count)
      VALUES (${key}, now(), 1)
      ON CONFLICT (key) DO UPDATE SET
        count = CASE
          WHEN rate_limits.window_start < now() - make_interval(secs => ${windowSec})
          THEN 1 ELSE rate_limits.count + 1 END,
        window_start = CASE
          WHEN rate_limits.window_start < now() - make_interval(secs => ${windowSec})
          THEN now() ELSE rate_limits.window_start END
      RETURNING count`;
    const count = rows[0]?.count ?? 1;
    return { ok: count <= limit, count, limit, remaining: Math.max(0, limit - count) };
  } catch {
    return { ok: true, count: 0, limit, remaining: limit }; // never block on limiter failure
  }
}

// Convenience: build a 429 Response, or null when within limits.
export async function rateLimitResponse(request, route, opts = {}, userId = null) {
  const { ok } = await checkRateLimit(`${route}:${clientKey(request, userId)}`, opts);
  if (ok) return null;
  return Response.json(
    { error: "Too many requests — please slow down and try again shortly." },
    { status: 429 }
  );
}
