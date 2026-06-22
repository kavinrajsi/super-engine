// AI social-media post-idea generator.
//
// Given a brand "memory" (Markdown), a topic, and a set of platforms, ask a
// model (via the Vercel AI Gateway) for ready-to-post ideas tailored per
// platform. Returns validated structured output.
//
// Auth: AI_GATEWAY_API_KEY locally, or Vercel OIDC automatically in production.

import { generateText, Output } from "ai";
import { z } from "zod";
import { DEFAULT_MODEL } from "./models";

// Supported platforms + per-platform writing guidance baked into the prompt.
export const PLATFORMS = [
  { key: "instagram", label: "Instagram" },
  { key: "x", label: "X (Twitter)" },
  { key: "linkedin", label: "LinkedIn" },
  { key: "facebook", label: "Facebook" },
  { key: "tiktok", label: "TikTok" },
  { key: "threads", label: "Threads" },
];

const PLATFORM_KEYS = PLATFORMS.map((p) => p.key);

const PLATFORM_GUIDE = {
  instagram: "visual-first, warm and aspirational, 5–12 relevant hashtags, strong opening hook",
  x: "punchy and concise (under 280 chars), 0–2 hashtags, hot-take or hook-driven",
  linkedin: "professional, insight-led, story or POV, 3–5 hashtags, encourages discussion",
  facebook: "conversational and community-oriented, 1–3 hashtags, question or relatable angle",
  tiktok: "casual, trend-aware short-video idea/script hook, 3–6 hashtags, fast hook",
  threads: "casual and conversational, hook-driven, minimal hashtags",
};

const SocialSchema = z.object({
  posts: z
    .array(
      z.object({
        platform: z.enum(PLATFORM_KEYS).describe("Which platform this post is for."),
        hook: z.string().describe("Scroll-stopping first line / hook."),
        caption: z.string().describe("Full post caption/body, formatted for the platform."),
        hashtags: z.array(z.string()).describe("Relevant hashtags WITHOUT the # symbol."),
        cta: z.string().describe("Clear call to action."),
      })
    )
    .describe("One or more post ideas per requested platform."),
});

export async function generateSocialPosts({
  profileMarkdown = "",
  topic,
  platforms = ["instagram", "x"],
  perPlatform = 2,
  model,
}) {
  const selected = platforms.filter((p) => PLATFORM_KEYS.includes(p));
  const platformList = (selected.length ? selected : ["instagram", "x"])
    .map((p) => `- ${p}: ${PLATFORM_GUIDE[p]}`)
    .join("\n");

  const brandContext = profileMarkdown?.trim()
    ? profileMarkdown.trim()
    : "(No brand memory provided — use a clear, friendly, professional voice.)";

  const { output } = await generateText({
    model: model || DEFAULT_MODEL,
    output: Output.object({ schema: SocialSchema }),
    system:
      "You are a senior social-media strategist. You write platform-native, ready-to-post " +
      "content — never generic cross-posts. Always match the brand voice, audience, and " +
      "positioning described in the brand memory. Tailor length, tone, and hashtags to each " +
      "platform's norms. Hashtags must be returned without the # symbol.",
    prompt:
      `BRAND MEMORY (source of truth for voice, audience, products, positioning):\n` +
      `"""\n${brandContext}\n"""\n\n` +
      `Topic / theme for the posts: ${topic}\n\n` +
      `Create ${perPlatform} distinct post idea(s) for EACH of these platforms, following each platform's style:\n` +
      `${platformList}\n\n` +
      `Make every post on-brand and immediately usable.`,
  });

  return output;
}
