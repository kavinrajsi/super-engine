// Site Speed & Performance via the Google PageSpeed Insights API.
// Keyless by default (lower anonymous rate limit); set PAGESPEED_API_KEY for more.

import { assertSafeUrl } from "@/lib/seo/safe-fetch";
import { savePerformanceRun } from "@/lib/db/records";

export const maxDuration = 60;

const PSI = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";

const CWV = [
  { key: "LARGEST_CONTENTFUL_PAINT_MS", label: "LCP", unit: "s", scale: 1000, digits: 1 },
  { key: "INTERACTION_TO_NEXT_PAINT", label: "INP", unit: "ms", scale: 1, digits: 0 },
  { key: "CUMULATIVE_LAYOUT_SHIFT_SCORE", label: "CLS", unit: "", scale: 100, digits: 2 },
  { key: "FIRST_CONTENTFUL_PAINT_MS", label: "FCP", unit: "s", scale: 1000, digits: 1 },
  { key: "EXPERIMENTAL_TIME_TO_FIRST_BYTE", label: "TTFB", unit: "s", scale: 1000, digits: 1 },
];

const RATING = { FAST: "good", AVERAGE: "needs-work", SLOW: "poor" };

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const rawUrl = searchParams.get("url") || "";
  const strategy = searchParams.get("strategy") === "desktop" ? "desktop" : "mobile";

  let safe;
  try {
    safe = assertSafeUrl(rawUrl);
  } catch (err) {
    return Response.json({ error: err.message }, { status: 400 });
  }

  const params = new URLSearchParams({ url: safe.toString(), strategy });
  for (const c of ["performance", "seo", "accessibility", "best-practices"]) params.append("category", c);
  if (process.env.PAGESPEED_API_KEY) params.set("key", process.env.PAGESPEED_API_KEY);

  // A server-side fetch sends no Referer, so a referrer-restricted key gets a
  // "Requests from referer <empty> are blocked" 403. Send an allowed referer
  // (env override, else this app's own origin) so a domain-restricted key works.
  const referer = process.env.PAGESPEED_REFERER || new URL(request.url).origin;

  let data;
  try {
    const res = await fetch(`${PSI}?${params}`, {
      headers: { Referer: referer },
      signal: AbortSignal.timeout(55_000),
    });
    data = await res.json();
    if (!res.ok) {
      const raw = data?.error?.message || "";
      let msg;
      if (res.status === 429 || /quota/i.test(raw)) {
        msg =
          "PageSpeed's keyless daily quota is exhausted. Add a free PAGESPEED_API_KEY (Google Cloud → enable PageSpeed Insights API → create API key) to enable performance tests.";
      } else if (res.status === 403 || /referer|referrer|blocked|API_KEY_HTTP_REFERRER_BLOCKED/i.test(raw)) {
        msg =
          "Your PAGESPEED_API_KEY is referrer-restricted. Set PAGESPEED_REFERER to an allowed domain, or change the key's restriction to 'None' or 'IP addresses' in Google Cloud → Credentials.";
      } else {
        msg = raw || `PageSpeed API error (${res.status})`;
      }
      // 200 with an error body — client-handled, keeps the browser console clean.
      return Response.json({ error: msg });
    }
  } catch (err) {
    return Response.json({ error: `Could not reach PageSpeed Insights: ${err.message}` });
  }

  const cats = data.lighthouseResult?.categories || {};
  const scores = {
    performance: Math.round((cats.performance?.score ?? 0) * 100),
    seo: Math.round((cats.seo?.score ?? 0) * 100),
    accessibility: Math.round((cats.accessibility?.score ?? 0) * 100),
    bestPractices: Math.round((cats["best-practices"]?.score ?? 0) * 100),
  };

  const metrics = data.loadingExperience?.metrics || {};
  const cwv = CWV.map((m) => {
    const raw = metrics[m.key];
    if (!raw) return { key: m.label, label: m.label, value: "—", rating: "none" };
    const v = raw.percentile / m.scale;
    return {
      key: m.label,
      label: m.label,
      value: `${v.toFixed(m.digits)}${m.unit}`,
      rating: RATING[raw.category] || "none",
    };
  });

  const audits = data.lighthouseResult?.audits || {};
  const opportunities = Object.values(audits)
    .filter((a) => (a.details?.overallSavingsMs || 0) > 0)
    .sort((a, b) => (b.details.overallSavingsMs || 0) - (a.details.overallSavingsMs || 0))
    .slice(0, 8)
    .map((a) => ({
      title: a.title,
      savingsMs: Math.round(a.details.overallSavingsMs),
      description: (a.description || "").replace(/\[.*?\]\(.*?\)/g, "").trim(),
    }));

  const fieldData = !!data.loadingExperience?.metrics;
  const result = { strategy, scores, cwv, opportunities, fieldData };
  await savePerformanceRun({ url: safe.toString(), strategy, result });
  return Response.json(result);
}
