// Ideas (Server Component). Daily, on-brand post ideas scanned from the news for
// the active site. Login-only.

import { redirect } from "next/navigation";
import AppShell from "@/components/app-shell";
import { currentUser } from "@/lib/auth/session";
import { isAuthConfigured } from "@/lib/auth/google";
import IdeasClient from "./ideas-client";

export const metadata = { title: "Ideas — MadRank" };
export const dynamic = "force-dynamic";

export default async function IdeasPage() {
  const user = isAuthConfigured() ? await currentUser() : null;
  if (isAuthConfigured() && !user) {
    redirect(`/login?next=${encodeURIComponent("/ideas")}`);
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl space-y-6 p-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Ideas</h1>
          <p className="text-muted-foreground">
            Timely, on-brand post ideas — scanned from today&rsquo;s news (and your Search Console
            demand) for your active site. Fresh ideas are generated every morning.
          </p>
        </div>
        <IdeasClient />
      </div>
    </AppShell>
  );
}
