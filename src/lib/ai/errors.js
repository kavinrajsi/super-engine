// Map raw AI SDK / provider errors to a friendly, actionable message.

export function aiErrorMessage(err) {
  const msg = err?.message || "";
  if (/api key|unauthor|invalid.*key|x-api-key|401|credential|permission|forbidden/i.test(msg)) {
    return "AI request rejected — check your model + API key in AI Settings (or set AI_GATEWAY_API_KEY for the default gateway).";
  }
  if (/quota|rate.?limit|429|insufficient|billing/i.test(msg)) {
    return "Your AI provider rejected the request (quota / rate limit / billing). Check your provider account.";
  }
  if (/gateway|AI_GATEWAY/i.test(msg)) {
    return "AI generation needs a model + key in AI Settings, or a Vercel AI Gateway key (AI_GATEWAY_API_KEY / OIDC).";
  }
  return `Could not generate content: ${msg || "unknown error"}`;
}
