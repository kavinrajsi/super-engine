// Ask your site (Server Component). Chat grounded in the active site's audit +
// analytics. Login-only.

import { redirect } from "next/navigation";
import AppShell from "@/components/app-shell";
import { currentUser } from "@/lib/auth/session";
import { isAuthConfigured } from "@/lib/auth/google";
import AskClient from "./ask-client";

export const metadata = { title: "Ask — MadRank" };
export const dynamic = "force-dynamic";

export default async function AskPage() {
  const user = isAuthConfigured() ? await currentUser() : null;
  if (isAuthConfigured() && !user) {
    redirect(`/login?next=${encodeURIComponent("/ask")}`);
  }

  return (
    <AppShell>
      <div className="mx-auto flex max-w-3xl flex-col gap-4 p-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Ask your site</h1>
          <p className="text-muted-foreground">
            Ask about your active site&rsquo;s SEO, AI readiness, top fixes and traffic — answers use
            your latest audit and connected data.
          </p>
        </div>
        <AskClient />
      </div>
    </AppShell>
  );
}
