// Competitor discovery — find who competes with a domain, two ways, merged:
//   1. DataForSEO Labs `competitors_domain` — data-grounded organic competitors
//      ranked by SERP/keyword overlap (needs DATAFORSEO_*).
//   2. An LLM-ask through the Vercel AI Gateway — breadth + brand names (needs
//      AI_GATEWAY_API_KEY / Vercel OIDC).
// Either half is optional; runs whichever is configured, no-ops to
// { configured:false } when neither is. Best-effort: a failing half is skipped,
// not fatal.

import { generateText, Output } from "ai";
import { z } from "zod";
import { dfsPost, isDataForSeoConfigured, domainOf } from "./dataforseo";

// Same model the rest of the app uses via the gateway (see suggest-fixes.js).
const MODEL = "anthropic/claude-haiku-4.5";

// The gateway works with AI_GATEWAY_API_KEY locally or Vercel OIDC in prod; we
// can only positively detect the key, so that's our local gate.
function gatewayAvailable() {
  return !!process.env.AI_GATEWAY_API_KEY || !!process.env.VERCEL_OIDC_TOKEN;
}

export function isCompetitorsConfigured() {
  return isDataForSeoConfigured() || gatewayAvailable();
}

// A plausible registrable host: has a dot, no spaces, no scheme/path leftovers.
function validHost(h) {
  return !!h && /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(h);
}

async function dfsCompetitors(domain) {
  const result = await dfsPost("/dataforseo_labs/google/competitors_domain/live", {
    target: domain,
    location_code: 2840, // United States
    language_code: "en",
    limit: 20,
  });
  // Verify field names against a live response; `intersections` = shared keywords.
  return (result?.items || [])
    .map((it) => ({
      domain: it.domain,
      commonKeywords: it.intersections ?? it.full_domain_metrics?.organic?.count ?? null,
      avgPosition: it.avg_position ?? null,
    }))
    .filter((c) => c.domain);
}

const LlmSchema = z.object({
  competitors: z
    .array(
      z.object({
        domain: z.string().describe("The competitor's root domain, e.g. 'example.com' — no scheme or path."),
        name: z.string().describe("The competitor's brand name."),
      })
    )
    .describe("Direct competitors of the given website."),
});

async function llmCompetitors(domain, keywords) {
  const { output } = await generateText({
    model: MODEL,
    output: Output.object({ schema: LlmSchema }),
    system:
      "You are a market-research analyst. Given a website, list its direct competitors — " +
      "companies offering similar products/services to a similar audience. Return real, " +
      "well-known competitors with their actual root domains (no scheme, no path). " +
      "Do not include the input site itself. If unsure, return fewer rather than inventing.",
    prompt:
      `Website: ${domain}\n` +
      (keywords?.length ? `It ranks for keywords like: ${keywords.slice(0, 8).join(", ")}\n` : "") +
      `List up to 12 direct competitors.`,
  });
  return (output?.competitors || []).map((c) => ({ domain: c.domain, name: c.name }));
}

// Discover competitors for a domain. Returns { configured, target, competitors }
// where each competitor is { domain, sources:["serp"|"ai"], commonKeywords?, name? }.
export async function discoverCompetitors(input, { keywords = [] } = {}) {
  if (!isCompetitorsConfigured()) return { configured: false };
  const target = domainOf(input);

  const [serp, ai] = await Promise.all([
    isDataForSeoConfigured() ? dfsCompetitors(target).catch(() => []) : Promise.resolve([]),
    gatewayAvailable() ? llmCompetitors(target, keywords).catch(() => []) : Promise.resolve([]),
  ]);

  // Merge by normalized host. DataForSEO rows rank first; AI adds names/breadth.
  const map = new Map();
  for (const c of serp) {
    const h = domainOf(c.domain);
    if (!validHost(h) || h === target) continue;
    if (!map.has(h)) {
      map.set(h, { domain: h, sources: ["serp"], commonKeywords: c.commonKeywords, avgPosition: c.avgPosition });
    }
  }
  for (const c of ai) {
    const h = domainOf(c.domain);
    if (!validHost(h) || h === target) continue;
    if (map.has(h)) {
      const row = map.get(h);
      if (!row.sources.includes("ai")) row.sources.push("ai");
      if (c.name && !row.name) row.name = c.name;
    } else {
      map.set(h, { domain: h, sources: ["ai"], name: c.name });
    }
  }

  return { configured: true, target, competitors: [...map.values()].slice(0, 20) };
}
