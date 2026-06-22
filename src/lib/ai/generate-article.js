// AI article writer.
//
// Given a brand "memory" (Markdown describing the website / voice / audience)
// plus a topic, ask a model (via the Vercel AI Gateway) to write a full,
// SEO + AI-search (GEO/AEO) optimized article. Returns validated structured
// output so the UI can render sections natively and assemble Markdown for
// copy/download.
//
// Auth: AI_GATEWAY_API_KEY locally, or Vercel OIDC automatically in production.

import { generateText, Output } from "ai";
import { z } from "zod";
import { DEFAULT_MODEL } from "./models";

const ArticleSchema = z.object({
  title: z.string().describe("Compelling, SEO-friendly H1 title (under 70 characters)."),
  slug: z.string().describe("URL slug: lowercase, hyphenated, no stop-word filler."),
  metaDescription: z
    .string()
    .describe("Meta description, 70–160 characters, includes the main keyword."),
  sections: z
    .array(
      z.object({
        heading: z.string().describe("H2 section heading."),
        content: z
          .string()
          .describe("Section body as Markdown (paragraphs, lists, bold). 2–4 paragraphs."),
      })
    )
    .describe("4–8 logically ordered sections that fully cover the topic."),
  tags: z.array(z.string()).describe("3–6 topical tags / keywords for the article."),
});

// Assemble a single Markdown string from the structured article (for copy/download).
export function articleToMarkdown(article) {
  if (!article) return "";
  const parts = [`# ${article.title}`];
  for (const s of article.sections || []) {
    parts.push(`\n## ${s.heading}\n\n${s.content}`);
  }
  if (article.tags?.length) parts.push(`\n---\n\nTags: ${article.tags.join(", ")}`);
  return parts.join("\n");
}

export async function generateArticle({
  profileMarkdown = "",
  topic,
  keywords = "",
  tone = "",
  model,
}) {
  const brandContext = profileMarkdown?.trim()
    ? profileMarkdown.trim()
    : "(No brand memory provided — write in a clear, professional, neutral voice.)";

  const { output } = await generateText({
    model: model || DEFAULT_MODEL,
    output: Output.object({ schema: ArticleSchema }),
    system:
      "You are an expert content writer specializing in SEO and AI-search (GEO/AEO). " +
      "You write substantive, original, well-structured articles — never filler or fluff. " +
      "Always match the brand's voice, audience, and topical focus described in the brand memory. " +
      "Optimize for both classic search and answer engines: clear H2 sections, scannable lists, " +
      "direct answers near the top, and natural keyword usage (never keyword stuffing). " +
      "Write section bodies in Markdown.",
    prompt:
      `BRAND MEMORY (use this as the source of truth for voice, audience, products, and positioning):\n` +
      `"""\n${brandContext}\n"""\n\n` +
      `Write a complete article on this topic: ${topic}\n` +
      (keywords ? `Target keywords to weave in naturally: ${keywords}\n` : "") +
      (tone ? `Desired tone: ${tone}\n` : "") +
      `\nProduce a publish-ready article that reflects the brand memory above.`,
  });

  return output;
}
