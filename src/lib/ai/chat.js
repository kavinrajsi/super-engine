// "Ask your site" — answer a chat turn grounded in the site context. Non-streaming
// (generateText); the model is the user's BYO model or the gateway default.

import { generateText } from "ai";
import { DEFAULT_MODEL } from "./models";

export async function answerSiteQuestion({ messages, context, model }) {
  const { text } = await generateText({
    model: model || DEFAULT_MODEL,
    system:
      "You are an SEO + AI-search analyst embedded in MadRank. Answer the user's questions about " +
      "THEIR site using the context below. Be concrete and specific — cite the actual scores, " +
      "issues, and metrics provided. If the context lacks the answer, say what to check or scan " +
      "rather than guessing. Keep answers tight and actionable.\n\n" +
      `--- SITE CONTEXT ---\n${context}\n--- END CONTEXT ---`,
    messages,
  });
  return text;
}
