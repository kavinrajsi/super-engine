// Shared DataForSEO client — used by backlinks, competitor discovery, and any
// other DataForSEO-backed feature. The host is constant + trusted (the user's
// domain travels in the request body, not the URL), so a direct POST is fine
// (safeFetch is GET-only). Everything no-ops when credentials aren't set.

const DFS_BASE = "https://api.dataforseo.com/v3";

export function isDataForSeoConfigured() {
  return !!(process.env.DATAFORSEO_LOGIN && process.env.DATAFORSEO_PASSWORD);
}

// Reduce a URL/host to the registrable-ish domain DataForSEO expects.
export function domainOf(input) {
  try {
    const u = new URL(/^https?:\/\//i.test(input) ? input : `https://${input}`);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return String(input || "").replace(/^www\./, "");
  }
}

// Coerce to a number or null.
export function toNumber(v) {
  return v == null ? null : Number(v);
}

// POST one task to a DataForSEO endpoint with Basic auth. Returns the first
// task's `result[0]` (or null). Throws on transport / API error.
export async function dataForSeoPost(path, task) {
  const auth = Buffer.from(
    `${process.env.DATAFORSEO_LOGIN}:${process.env.DATAFORSEO_PASSWORD}`
  ).toString("base64");
  const res = await fetch(`${DFS_BASE}${path}`, {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
    body: JSON.stringify([task]),
    signal: AbortSignal.timeout(30_000),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.status_code >= 40000) {
    throw new Error(json.status_message || `DataForSEO error (${res.status})`);
  }
  return json.tasks?.[0]?.result?.[0] || null;
}
