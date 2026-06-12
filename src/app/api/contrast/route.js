// Per-page WCAG color-contrast check (AA + AAA) via headless axe-core.
// The Accessibility panel calls this once per scanned page and aggregates.

import { assertSafeUrl } from "@/lib/seo/safe-fetch";
import { isHeadlessAvailable, runAxeContrast } from "@/lib/seo/headless";
import { mapContrastResult } from "@/lib/seo/contrast";

export const maxDuration = 120;

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const rawUrl = searchParams.get("url") || "";

  let safe;
  try {
    safe = assertSafeUrl(rawUrl);
  } catch (err) {
    return Response.json({ error: err.message }, { status: 400 });
  }

  if (!isHeadlessAvailable()) {
    // 200 with an error body — client-handled, keeps the browser console clean.
    return Response.json({
      error:
        "Contrast checks need a headless browser. Set BROWSERBASE_API_KEY + BROWSERBASE_PROJECT_ID (or BROWSER_WS_ENDPOINT) to enable them.",
    });
  }

  const axeResult = await runAxeContrast(safe.toString());
  if (!axeResult) {
    return Response.json({ error: "Headless rendering failed for this page." });
  }

  return Response.json({ url: safe.toString(), ...mapContrastResult(axeResult) });
}
