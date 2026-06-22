// AI provider settings (bring-your-own-key): read (GET), save (POST), clear key
// (DELETE). The plaintext key is NEVER returned — only whether one is stored.

import { currentUser } from "@/lib/auth/session";
import { isAuthConfigured } from "@/lib/auth/google";
import { getAiSettings, saveAiSettings, clearAiKey } from "@/lib/db/ai-settings";
import { encrypt } from "@/lib/ai/crypto";
import { isValidProvider, PROVIDERS, DEFAULT_MODEL } from "@/lib/ai/models";

export const dynamic = "force-dynamic";

async function requireUserId() {
  const user = await currentUser();
  if (isAuthConfigured() && !user) return { error: true };
  return { userId: user?.id ?? null };
}

export async function GET() {
  const { error, userId } = await requireUserId();
  if (error) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const s = await getAiSettings(userId);
  return Response.json({
    settings: {
      provider: s?.provider || null,
      model: s?.model || null,
      hasKey: !!s?.api_key_enc,
    },
    providers: PROVIDERS,
    defaultModel: DEFAULT_MODEL,
  });
}

export async function POST(request) {
  const { error, userId } = await requireUserId();
  if (error) return Response.json({ error: "Unauthorized" }, { status: 401 });

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const provider = (body?.provider || "").trim();
  const model = (body?.model || "").trim();
  const apiKey = (body?.apiKey || "").trim();

  if (!isValidProvider(provider)) {
    return Response.json({ error: "Choose a valid provider." }, { status: 400 });
  }
  if (!model) {
    return Response.json({ error: "Choose or enter a model." }, { status: 400 });
  }

  // apiKey empty => keep the existing stored key (lets users change model only).
  const apiKeyEnc = apiKey ? encrypt(apiKey) : null;

  const saved = await saveAiSettings(userId, { provider, model, apiKeyEnc });
  if (!saved) {
    return Response.json(
      { error: "Could not save settings (sign in + database required)." },
      { status: 503 }
    );
  }
  return Response.json({
    settings: { provider: saved.provider, model: saved.model, hasKey: !!saved.api_key_enc },
  });
}

export async function DELETE() {
  const { error, userId } = await requireUserId();
  if (error) return Response.json({ error: "Unauthorized" }, { status: 401 });
  await clearAiKey(userId);
  return Response.json({ ok: true });
}
