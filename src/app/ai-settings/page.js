// AI Settings (Server Component). Bring-your-own model + API key. Login-only.

import Link from "next/link";
import { redirect } from "next/navigation";
import ThemeToggle from "@/components/theme-toggle";
import { currentUser } from "@/lib/auth/session";
import { isAuthConfigured } from "@/lib/auth/google";
import AiSettingsClient from "./ai-settings-client";

export const metadata = { title: "AI Settings — MadRank" };
export const dynamic = "force-dynamic";

function Shell({ children }) {
  return (
    <div className="min-h-screen">
      <header className="flex h-14 items-center justify-between border-b px-4 sm:px-6">
        <Link href="/" className="font-bold tracking-tight no-underline">
          📈 MadRank
        </Link>
        <ThemeToggle />
      </header>
      <div className="mx-auto max-w-3xl space-y-6 p-6">{children}</div>
    </div>
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
