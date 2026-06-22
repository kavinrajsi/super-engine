// Combined Google Analytics + Search Console dashboard. Account-based (not tied
// to a scan), so it gets its own page like /history. Per-visitor: each connects
// their own Google account once, granting both GA4 and Search Console (read-only).

import Link from "next/link";
import { cookies } from "next/headers";
import AppShell from "@/components/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { isGscConfigured } from "@/lib/gsc/oauth";
import { getSession } from "@/lib/gsc/tokens";
import { currentUser } from "@/lib/auth/session";
import { isAuthConfigured } from "@/lib/auth/google";
import SeoDashboard from "./seo-dashboard";

export const metadata = { title: "SEO — Analytics & Search Console — MadRank" };
export const dynamic = "force-dynamic";

function Shell({ children }) {
  return (
    <AppShell>
      <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-4 p-6 text-center">
        {children}
      </div>
    </AppShell>
  );
}

const ERRORS = {
  state_mismatch: "Sign-in couldn't be verified. Please try connecting again.",
  exchange_failed: "Google sign-in failed. Please try again.",
  no_database: "Storage isn't configured, so the connection couldn't be saved.",
  not_configured: "Google integration isn't configured on this deployment.",
  access_denied: "Access was denied on the Google consent screen.",
};

export default async function SeoPage({ searchParams }) {
  const sp = await searchParams;

  // App-login + Pro gate (separate from the per-visitor Google connection).
  const appUser = isAuthConfigured() ? await currentUser() : null;
  if (isAuthConfigured() && !appUser) {
    return (
      <Shell>
        <h1 className="text-2xl font-bold">Sign in to use SEO insights</h1>
        <Link href="/login?next=/seo" className={buttonVariants()}>
          Sign in
        </Link>
      </Shell>
    );
  }
  const configured = isGscConfigured();
  const sessionId = (await cookies()).get("gsc_session")?.value;
  const session = configured && sessionId ? await getSession(sessionId) : null;
  const errorMsg = sp?.error ? ERRORS[sp.error] || "Something went wrong. Please try again." : null;

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl space-y-4 p-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">SEO insights</h1>
          <p className="text-muted-foreground">
            Connect Google to see your Analytics traffic and Search Console queries, pages, and
            ranking opportunities — all in one place.
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
              <p className="font-medium text-foreground">Google integration isn&rsquo;t configured.</p>
              <p>
                Set <code className="font-mono">GOOGLE_CLIENT_ID</code> and{" "}
                <code className="font-mono">GOOGLE_CLIENT_SECRET</code> (and enable the{" "}
                <span className="font-medium">Analytics Data API</span>,{" "}
                <span className="font-medium">Analytics Admin API</span>, and Search Console API in
                Google Cloud) to turn this on.
              </p>
            </CardContent>
          </Card>
        ) : session ? (
          <SeoDashboard email={session.email} />
        ) : (
          <Card>
            <CardContent className="flex flex-col items-start gap-3 py-6">
              <p className="text-sm text-muted-foreground">
                You&rsquo;ll be redirected to Google to grant read-only access to your Analytics and
                Search Console data. We never see your password, and you can disconnect anytime.
              </p>
              <a href="/api/gsc/auth" className={buttonVariants({ size: "lg" })}>
                Connect Google
              </a>
            </CardContent>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
