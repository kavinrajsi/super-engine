// Polish a draft llms.txt with the AI Gateway (keeps all URLs; improves the
// title, summary, link names/descriptions, and grouping).

import { generateText, Output } from "ai";
import { z } from "zod";

export const maxDuration = 60;

const MODEL = "anthropic/claude-haiku-4.5";

const Schema = z.object({
  content: z
    .string()
    .describe("The improved llms.txt file content, in llmstxt.org markdown format."),
});

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { content, site } = body || {};
  if (!content || typeof content !== "string") {
    return Response.json({ error: "Missing 'content'." }, { status: 400 });
  }

  try {
    const { output } = await generateText({
      model: MODEL,
      output: Output.object({ schema: Schema }),
      system:
        "You are an expert at writing llms.txt files (the llmstxt.org format). Improve the given draft: " +
        "a sharp H1 title, a concise '> summary' blockquote describing what the site offers, and well-organized " +
        "'## Section' lists of '- [name](url): short description' links. Keep EVERY URL from the draft (never invent " +
        "or drop URLs), tighten link names and descriptions, group sensibly, and keep it valid llms.txt markdown.",
      prompt: `Site: ${site || ""}\n\nImprove this llms.txt draft:\n\n${content}`,
    });
    return Response.json(output);
  } catch (err) {
    const message = /api key|gateway|unauthor|credential|AI_GATEWAY/i.test(err?.message || "")
      ? "AI enhancement needs a Vercel AI Gateway key (set AI_GATEWAY_API_KEY, or deploy on Vercel)."
      : `Could not enhance: ${err?.message || "unknown error"}`;
    return Response.json({ error: message }, { status: 502 });
  }
}
