// Google Search Console insights. Account-based (not tied to a scan), so it gets
// its own page like /history. Per-visitor: each connects their own Google.

import Link from "next/link";
import { cookies } from "next/headers";
import ThemeToggle from "@/components/theme-toggle";
import { Card, CardContent } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { isGscConfigured } from "@/lib/gsc/oauth";
import { getSession } from "@/lib/gsc/tokens";
import { currentUser } from "@/lib/auth/session";
import { isAuthConfigured } from "@/lib/auth/google";
import { isPro } from "@/lib/auth/plan";
import GscDashboard from "./gsc-dashboard";

export const metadata = { title: "Search Console — MadRank" };
export const dynamic = "force-dynamic";

function Shell({ children }) {
  return (
    <div className="min-h-screen">
      <header className="flex h-14 items-center justify-between border-b px-6">
        <Link href="/" className="font-bold tracking-tight no-underline">
          📈 MadRank
        </Link>
        <ThemeToggle />
      </header>
      <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-4 p-6 text-center">
        {children}
      </div>
    </div>
  );
}

const ERRORS = {
  state_mismatch: "Sign-in couldn't be verified. Please try connecting again.",
  exchange_failed: "Google sign-in failed. Please try again.",
  no_database: "Storage isn't configured, so the connection couldn't be saved.",
  not_configured: "Search Console isn't configured on this deployment.",
  access_denied: "Access was denied on the Google consent screen.",
};

export default async function SearchConsolePage({ searchParams }) {
  const sp = await searchParams;

  // App-login + Pro gate (separate from the per-visitor Google connection).
  const appUser = isAuthConfigured() ? await currentUser() : null;
  if (isAuthConfigured() && !appUser) {
    return (
      <Shell>
        <h1 className="text-2xl font-bold">Sign in to use Search Console</h1>
        <Link href="/login?next=/search-console" className={buttonVariants()}>
          Sign in
        </Link>
      </Shell>
    );
  }
  if (appUser && !isPro(appUser)) {
    return (
      <Shell>
        <h1 className="text-2xl font-bold">Search Console is a Pro feature</h1>
        <p className="text-muted-foreground">
          Upgrade to Pro to connect Google Search Console and see your queries, pages, and
          opportunities.
        </p>
        <Link href="/pricing" className={buttonVariants()}>
          Upgrade to Pro
        </Link>
      </Shell>
    );
  }

  const configured = isGscConfigured();
  const sessionId = (await cookies()).get("gsc_session")?.value;
  const session = configured && sessionId ? await getSession(sessionId) : null;
  const errorMsg = sp?.error ? ERRORS[sp.error] || "Something went wrong. Please try again." : null;

  return (
    <div className="min-h-screen">
      <header className="flex h-14 items-center justify-between border-b px-6">
        <Link href="/" className="font-bold tracking-tight no-underline">
          📈 MadRank
        </Link>
        <ThemeToggle />
      </header>

      <div className="mx-auto max-w-5xl space-y-4 p-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Search Console</h1>
          <p className="text-muted-foreground">
            Connect Google Search Console to see real queries, pages, and ranking opportunities.
          </p>
        </div>

        {errorMsg && (
          <p className="rounded-md border border-error/40 bg-error/10 px-3 py-2 text-sm text-error">
            {errorMsg}
          </p>
        )}

        {!configured ? (
          <Card>
            <CardContent className="space-y-2 py-6 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">Search Console isn&rsquo;t configured.</p>
              <p>
                Set <code className="font-mono">GOOGLE_CLIENT_ID</code> and{" "}
                <code className="font-mono">GOOGLE_CLIENT_SECRET</code> (and enable the Search
                Console API in Google Cloud) to turn this on.
              </p>
            </CardContent>
          </Card>
        ) : session ? (
          <GscDashboard email={session.email} />
        ) : (
          <Card>
            <CardContent className="flex flex-col items-start gap-3 py-6">
              <p className="text-sm text-muted-foreground">
                You&rsquo;ll be redirected to Google to grant read-only access to your Search
                Console data. We never see your password, and you can disconnect anytime.
              </p>
              <a href="/api/gsc/auth" className={buttonVariants({ size: "lg" })}>
                Connect Google Search Console
              </a>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
