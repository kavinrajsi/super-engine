// AI provider/model registry + resolver.
//
// Users can bring their own provider key (OpenAI / Anthropic / Google) and pick
// a model. resolveModel() builds an AI SDK model instance bound to that key,
// which generateText() uses directly. When no user model is configured, the
// generators fall back to DEFAULT_MODEL (a gateway "provider/model" string that
// routes through the Vercel AI Gateway via AI_GATEWAY_API_KEY / OIDC).

import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";

// Fallback used when a user hasn't configured their own model + key.
export const DEFAULT_MODEL = "anthropic/claude-haiku-4.5";

// Curated suggestions per provider. Users can also type a custom model id, so
// these don't need to be exhaustive or perfectly current.
export const PROVIDERS = {
  openai: {
    label: "OpenAI",
    keyPlaceholder: "sk-…",
    keyHelp: "platform.openai.com/api-keys",
    models: ["gpt-4o", "gpt-4o-mini", "gpt-4.1", "gpt-4.1-mini", "o3-mini"],
  },
  anthropic: {
    label: "Anthropic (Claude)",
    keyPlaceholder: "sk-ant-…",
    keyHelp: "console.anthropic.com/settings/keys",
    models: [
      "claude-opus-4-1",
      "claude-sonnet-4-5",
      "claude-haiku-4-5",
      "claude-3-5-haiku-latest",
    ],
  },
  google: {
    label: "Google (Gemini)",
    keyPlaceholder: "AIza…",
    keyHelp: "aistudio.google.com/apikey",
    models: ["gemini-2.5-pro", "gemini-2.5-flash", "gemini-2.0-flash"],
  },
};

export const PROVIDER_KEYS = Object.keys(PROVIDERS);

export function isValidProvider(provider) {
  return PROVIDER_KEYS.includes(provider);
}

// Build a model instance from a user's settings. Returns null if the inputs are
// incomplete so callers can fall back to DEFAULT_MODEL.
export function resolveModel({ provider, model, apiKey }) {
  if (!provider || !model || !apiKey) return null;
  switch (provider) {
    case "openai":
      return createOpenAI({ apiKey })(model);
    case "anthropic":
      return createAnthropic({ apiKey })(model);
    case "google":
      return createGoogleGenerativeAI({ apiKey })(model);
    default:
      return null;
  }
}
