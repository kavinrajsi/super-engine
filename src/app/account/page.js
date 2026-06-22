// Account (Server Component). The signed-in user's profile: identity, plan, and
// the per-visitor Google connection state. Read-only — name/email come from
// Google; actions (sign out, connect/disconnect Google) live in the client. The
// auth gate mirrors /profiles.

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import AppShell from "@/components/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { currentUser } from "@/lib/auth/session";
import { isAuthConfigured } from "@/lib/auth/google";
import { isGscConfigured } from "@/lib/gsc/oauth";
import { getSession } from "@/lib/gsc/tokens";
import AccountClient from "./account-client";

export const metadata = { title: "Account — MadRank" };
export const dynamic = "force-dynamic";

function Shell({ children }) {
  return (
    <AppShell>
      <div className="mx-auto max-w-2xl space-y-6 p-6">{children}</div>
    </AppShell>
  );
}

export default async function AccountPage() {
  const authConfigured = isAuthConfigured();

  // Without app auth there's no account to show — say so gracefully.
  if (!authConfigured) {
    return (
      <Shell>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Account</h1>
          <p className="text-muted-foreground">Your profile and connections.</p>
        </div>
        <Card>
          <CardContent className="py-6 text-sm text-muted-foreground">
            Accounts aren&rsquo;t configured on this deployment.
          </CardContent>
        </Card>
      </Shell>
    );
  }

  const user = await currentUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent("/account")}`);
  }

  // Per-visitor Google connection (same gsc_session used across GA + GSC).
  const gscConfigured = isGscConfigured();
  const sessionId = (await cookies()).get("gsc_session")?.value;
  const gscSession = gscConfigured && sessionId ? await getSession(sessionId) : null;

  return (
    <Shell>
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Account</h1>
        <p className="text-muted-foreground">Your profile and connections.</p>
      </div>
      <AccountClient
        user={{
          name: user.name || null,
          email: user.email || null,
          picture: user.picture || null,
          plan: user.plan || null,
        }}
        gscConfigured={gscConfigured}
        googleConnected={!!gscSession}
        googleEmail={gscSession?.email || null}
      />
    </Shell>
  );
}
