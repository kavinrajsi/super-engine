// AI fix suggestions endpoint. The client posts a page's URL + signals +
// issues (already computed during the scan) so we don't re-fetch, and we return
// model-generated, copy-paste-ready fixes.

import { suggestFixes } from "@/lib/ai/suggest-fixes";

export const maxDuration = 60;

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { url, signals, issues } = body || {};
  if (!url || typeof url !== "string") {
    return Response.json({ error: "Missing 'url'." }, { status: 400 });
  }

  try {
    const result = await suggestFixes({ url, signals, issues: issues || [] });
    return Response.json(result);
  } catch (err) {
    // Most common cause: AI Gateway not configured (no key / OIDC).
    const message = /api key|gateway|unauthor|credential|AI_GATEWAY/i.test(err?.message || "")
      ? "AI suggestions need a Vercel AI Gateway key. Set AI_GATEWAY_API_KEY (or deploy on Vercel with OIDC)."
      : `Could not generate suggestions: ${err?.message || "unknown error"}`;
    return Response.json({ error: message }, { status: 502 });
  }
}
