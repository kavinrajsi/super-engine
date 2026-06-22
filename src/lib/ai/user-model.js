// Resolve the AI model to use for a given user: their configured provider + key
// when set, otherwise null so the generators fall back to the gateway default.

import { getAiSettings } from "../db/ai-settings";
import { decrypt } from "./crypto";
import { resolveModel } from "./models";

export async function userModel(userId) {
  const s = await getAiSettings(userId);
  if (!s?.api_key_enc) return null;
  const apiKey = decrypt(s.api_key_enc);
  return resolveModel({ provider: s.provider, model: s.model, apiKey });
}
