// AI daily-idea generator: turn fresh news headlines + the site's search demand
// into timely, on-brand post ideas. Mirrors generate-social.js.
//
// Auth: AI_GATEWAY_API_KEY locally, or Vercel OIDC in production (or a user's
// own model via the `model` param).

import { generateText, Output } from "ai";
import { z } from "zod";
import { DEFAULT_MODEL } from "./models";

const PLATFORMS = ["instagram", "x", "linkedin", "facebook", "tiktok", "threads", "blog"];

const IdeasSchema = z.object({
  ideas: z
    .array(
      z.object({
        title: z.string().describe("Short, specific idea title."),
        angle: z.string().describe("The timely angle — why this is worth posting now."),
        hook: z.string().describe("A scroll-stopping opening line."),
        suggestedPlatforms: z
          .array(z.enum(PLATFORMS))
          .describe("Best-fit platforms for this idea."),
        rationale: z.string().describe("One sentence on why it fits the brand + the moment."),
      })
    )
    .describe("Distinct, ready-to-develop post ideas."),
});

export async function generateIdeas({
  profileMarkdown = "",
  siteUrl = "",
  headlines = [],
  gscQueries = [],
  count = 5,
  model,
}) {
  const brandContext = profileMarkdown?.trim()
    ? profileMarkdown.trim()
    : "(No brand memory provided — infer a clear, professional voice from the site.)";

  const newsBlock = headlines.length
    ? headlines.map((h) => `- ${h.title}${h.source ? ` (${h.source})` : ""}`).join("\n")
    : "(No fresh headlines available — base ideas on the brand and evergreen angles.)";

  const demandBlock = gscQueries.length
    ? `\n\nWhat people currently search to find this site (Search Console):\n${gscQueries
        .slice(0, 20)
        .map((q) => `- ${q}`)
        .join("\n")}`
    : "";

  const { output } = await generateText({
    model: model || DEFAULT_MODEL,
    output: Output.object({ schema: IdeasSchema }),
    system:
      "You are a brand content strategist. Each morning you propose timely, on-brand post " +
      "ideas by connecting fresh news to the brand's audience and positioning. Ideas must be " +
      "specific and immediately developable — never generic. Tie each idea to a real, current " +
      "angle from the headlines when possible; otherwise lean on the brand's topics.",
    prompt:
      `BRAND MEMORY (voice, audience, products, positioning):\n"""\n${brandContext}\n"""\n\n` +
      `Site: ${siteUrl || "(unknown)"}\n\n` +
      `TODAY'S RELEVANT HEADLINES:\n${newsBlock}${demandBlock}\n\n` +
      `Propose ${count} distinct post ideas this brand could publish today. Prefer ideas that ` +
      `ride a current headline above; keep each tightly relevant to the brand and its audience.`,
  });

  return output;
}
