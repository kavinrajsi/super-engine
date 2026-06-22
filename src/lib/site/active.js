// Active-site resolution (server-only). The "active site" is the brand profile
// the user most recently used; it threads through the app as the default site
// for the dashboard, content tools, and scan entry. No-ops to empty values
// without auth/DB so unauthenticated and DB-less setups keep working.

import { currentUser } from "@/lib/auth/session";
import { getActiveProfile, listProfiles } from "@/lib/db/profiles";

// Parse a (possibly schemeless) site URL into a URL object, or null. Users type
// "example.com" as often as "https://example.com", so prepend https:// before
// parsing when no scheme is present — otherwise new URL() throws and silently
// breaks the active-site → scan matching.
export function normalizeSiteUrl(raw) {
  const s = (raw || "").trim();
  if (!s) return null;
  const withScheme = /^https?:\/\//i.test(s) ? s : `https://${s}`;
  try {
    return new URL(withScheme);
  } catch {
    return null;
  }
}

// Candidate URLs to look up a cached scan for: the saved URL + its www / apex
// variant (with and without trailing slash), so a scan of apex matches a
// www-saved site and vice-versa.
export function scanUrlCandidates(raw) {
  const u = normalizeSiteUrl(raw);
  if (!u) return [];
  const host = u.host.replace(/^www\./, "");
  const apex = `${u.protocol}//${host}/`;
  const www = `${u.protocol}//www.${host}/`;
  return [
    ...new Set([u.toString(), apex, www, apex.replace(/\/$/, ""), www.replace(/\/$/, "")]),
  ];
}

// Returns { activeSite, profiles } for the current request. activeSite is null
// when the user has no brand profiles (or auth/DB is unavailable).
export async function getActiveSite() {
  let user = null;
  try {
    user = await currentUser();
  } catch {
    user = null;
  }
  const userId = user?.id ?? null;

  const [activeSite, profiles] = await Promise.all([
    getActiveProfile(userId),
    listProfiles(userId),
  ]);

  return { activeSite: activeSite || null, profiles: profiles || [] };
}
