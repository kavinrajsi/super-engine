// AI Settings (Server Component). Bring-your-own model + API key. Login-only.

import { redirect } from "next/navigation";
import AppShell from "@/components/app-shell";
import { currentUser } from "@/lib/auth/session";
import { isAuthConfigured } from "@/lib/auth/google";
import AiSettingsClient from "./ai-settings-client";

export const metadata = { title: "AI Settings — MadRank" };
export const dynamic = "force-dynamic";

function Shell({ children }) {
  return (
    <AppShell>
      <div className="mx-auto max-w-3xl space-y-6 p-6">{children}</div>
    </AppShell>
  );
}

export default async function AiSettingsPage() {
  const user = isAuthConfigured() ? await currentUser() : null;
  if (isAuthConfigured() && !user) {
    redirect(`/login?next=${encodeURIComponent("/ai-settings")}`);
  }

  return (
    <Shell>
      <div>
        <h1 className="text-3xl font-bold tracking-tight">AI Settings</h1>
        <p className="text-muted-foreground">
          Choose the model used for articles and post ideas, and bring your own provider API key.
          Your key is encrypted at rest and never shown again. Leave it blank to use the built-in
          default.
        </p>
      </div>
      <AiSettingsClient />
    </Shell>
  );
}
