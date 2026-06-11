// AI-powered fix suggestions.
//
// Given a page's current signals + detected issues, ask a model (via the Vercel
// AI Gateway) for concrete, copy-paste-ready fixes optimized for both classic
// SEO and AI search (GEO/AEO). Returns validated structured output.
//
// Auth: AI_GATEWAY_API_KEY locally, or Vercel OIDC automatically in production.

import { generateText, Output } from "ai";
import { z } from "zod";

const MODEL = "anthropic/claude-haiku-4.5";

const SuggestionSchema = z.object({
  summary: z.string().describe("One or two sentences on the biggest opportunities."),
  suggestions: z
    .array(
      z.object({
        field: z
          .enum([
            "title",
            "metaDescription",
            "ogTitle",
            "ogDescription",
            "twitterCard",
            "faqSchema",
            "jsonLd",
            "headings",
            "other",
          ])
          .describe("Which on-page element this fixes."),
        label: z.string().describe("Short human label, e.g. 'Meta description'."),
        suggested: z
          .string()
          .describe("Ready-to-use value or code snippet the user can paste directly."),
        rationale: z.string().describe("One sentence on why this helps SEO/AI search."),
      })
    )
    .describe("Only include fixes for elements that are missing or weak."),
});

export async function suggestFixes({ url, signals = {}, issues = [] }) {
  const current = {
    title: signals.title || null,
    titleLength: signals.titleLength || 0,
    metaDescription: signals.metaDescription || null,
    canonical: signals.canonical || null,
    h1s: signals.h1s || [],
    og: signals.og || {},
    twitter: signals.twitter || {},
    aiGeo: signals.aiGeo
      ? {
          hasFaq: signals.aiGeo.hasFaq,
          hasSchema: signals.aiGeo.hasSchema,
          author: signals.aiGeo.author,
          questionHeadings: signals.aiGeo.questionHeadings,
          wordCount: signals.aiGeo.wordCount,
        }
      : null,
  };
  const issueList = issues
    .map((i) => `- [${i.severity}/${i.category}] ${i.message}`)
    .join("\n");

  const { output } = await generateText({
    model: MODEL,
    output: Output.object({ schema: SuggestionSchema }),
    system:
      "You are an expert SEO and AI-search (GEO/AEO) consultant. You produce concrete, " +
      "copy-paste-ready fixes — never vague advice. Follow best practices: titles 30–60 " +
      "characters, meta descriptions 70–160 characters, complete Open Graph + Twitter card " +
      "tags, FAQPage JSON-LD for answer engines, and clear authorship for generative search. " +
      "Only suggest fixes for elements that are actually missing or weak. For schema fields, " +
      "output a valid <script type=\"application/ld+json\"> snippet. Keep rationales to one sentence.",
    prompt:
      `Page: ${url}\n\n` +
      `Current on-page signals:\n${JSON.stringify(current, null, 2)}\n\n` +
      `Detected issues:\n${issueList || "(none)"}\n\n` +
      `Produce the highest-impact fixes for this page.`,
  });

  return output;
}
