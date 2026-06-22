// Brand Memory (Server Component). Where the user describes their site(s) as
// Markdown — the shared context for AI articles + social posts. Login-only.

import { redirect } from "next/navigation";
import AppShell from "@/components/app-shell";
import { currentUser } from "@/lib/auth/session";
import { isAuthConfigured } from "@/lib/auth/google";
import ProfilesClient from "./profiles-client";

export const metadata = { title: "Brand Memory — MadRank" };
export const dynamic = "force-dynamic";

function Shell({ children }) {
  return (
    <AppShell>
      <div className="mx-auto max-w-3xl space-y-6 p-6">{children}</div>
    </AppShell>
  );
}

export default async function ProfilesPage() {
  const user = isAuthConfigured() ? await currentUser() : null;
  if (isAuthConfigured() && !user) {
    redirect(`/login?next=${encodeURIComponent("/profiles")}`);
  }

  return (
    <Shell>
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Brand Memory</h1>
        <p className="text-muted-foreground">
          Describe your website in Markdown — voice, audience, products, positioning. We use this
          as the context for every AI-written article and social post.
        </p>
      </div>
      <ProfilesClient />
    </Shell>
  );
}
