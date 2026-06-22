// Combined Google Analytics + Search Console dashboard. Account-based (not tied
// to a scan), so it gets its own page like /history. Per-visitor: each connects
// their own Google account once, granting both GA4 and Search Console (read-only).

import Link from "next/link";
import { cookies } from "next/headers";
import AppShell from "@/components/app-shell";
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
  // A URL to audit can arrive from the hero form / nav (?url=&deep=).
  const initialUrl = typeof sp?.url === "string" ? sp.url : "";
  const initialDeep = sp?.deep === "1" || sp?.deep === "on";
  const nextPath = `/seo${
    initialUrl ? `?url=${encodeURIComponent(initialUrl)}${initialDeep ? "&deep=1" : ""}` : ""
  }`;

  // App-login gate (separate from the per-visitor Google connection).
  const appUser = isAuthConfigured() ? await currentUser() : null;
  if (isAuthConfigured() && !appUser) {
    return (
      <Shell>
        <h1 className="text-2xl font-bold">Sign in to use SEO insights</h1>
        <Link href={`/login?next=${encodeURIComponent(nextPath)}`} className={buttonVariants()}>
          Sign in
        </Link>
      </Shell>
    );
  }
  const configured = isGscConfigured();
  const sessionId = (await cookies()).get("gsc_session")?.value;
  const session = configured && sessionId ? await getSession(sessionId) : null;
  const errorMsg = sp?.error ? ERRORS[sp.error] || "Something went wrong. Please try again." : null;

  // The audit tabs work without Google; the Traffic tab prompts to connect when
  // not linked. So always render the dashboard and pass the connection state.
  return (
    <AppShell>
      <div className="mx-auto max-w-5xl space-y-4 p-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">SEO insights</h1>
          <p className="text-muted-foreground">
            Audit any site across SEO, pages, links, technical, GEO and tracking — and connect
            Google to add your Analytics traffic and Search Console data.
          </p>
        </div>

        {errorMsg && (
          <p className="rounded-md border border-error/40 bg-error/10 px-3 py-2 text-sm text-error">
            {errorMsg}
          </p>
        )}

        <SeoDashboard
          email={session?.email}
          connected={!!session}
          initialUrl={initialUrl}
          initialDeep={initialDeep}
        />
      </div>
    </AppShell>
  );
}
