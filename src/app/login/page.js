// Google-only login page. Redirects home if already signed in.

import Link from "next/link";
import { redirect } from "next/navigation";
import ThemeToggle from "@/components/theme-toggle";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { currentUser } from "@/lib/auth/session";
import { isAuthConfigured } from "@/lib/auth/google";
import { PLANS } from "@/lib/auth/plan";

export const metadata = { title: "Sign in — MadRank" };
export const dynamic = "force-dynamic";

const ERRORS = {
  state_mismatch: "Sign-in couldn't be verified. Please try again.",
  exchange_failed: "Google sign-in failed. Please try again.",
  no_database: "Storage isn't configured, so sign-in couldn't be saved.",
  no_profile: "Google didn't return a profile. Please try again.",
  not_configured: "Login isn't configured on this deployment.",
  access_denied: "Access was denied on the Google consent screen.",
};

export default async function LoginPage({ searchParams }) {
  const sp = await searchParams;
  const user = await currentUser();
  if (user) redirect("/");

  const next = typeof sp?.next === "string" && sp.next.startsWith("/") ? sp.next : "/";
  const errorMsg = sp?.error ? ERRORS[sp.error] || "Something went wrong. Please try again." : null;

  return (
    <div className="min-h-screen">
      <header className="flex h-14 items-center justify-between border-b px-6">
        <Link href="/" className="font-bold tracking-tight no-underline">
          📈 MadRank
        </Link>
        <ThemeToggle />
      </header>

      <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center gap-6 p-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">Sign in</h1>
          <p className="mt-1 text-muted-foreground">
            Sign in with Google to run audits and save your reports.
          </p>
        </div>

        {errorMsg && (
          <p className="w-full rounded-md border border-error/40 bg-error/10 px-3 py-2 text-center text-sm text-error">
            {errorMsg}
          </p>
        )}

        <Card className="w-full">
          <CardContent className="flex flex-col items-stretch gap-4 py-6">
            {!isAuthConfigured() ? (
              <p className="text-center text-sm text-muted-foreground">
                Login isn&rsquo;t configured. Set <code className="font-mono">GOOGLE_CLIENT_ID</code>{" "}
                + <code className="font-mono">GOOGLE_CLIENT_SECRET</code> and a database.
              </p>
            ) : (
              <a
                href={`/api/auth/login?next=${encodeURIComponent(next)}`}
                className={buttonVariants({ size: "lg" })}
              >
                <GoogleIcon /> Continue with Google
              </a>
            )}
            <p className="text-center text-xs text-muted-foreground">
              Free: {PLANS.free.scansPerDay} scans/day · Pro: higher limits, Performance, Search
              Console &amp; saved history.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.74 3.28-8.09Z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.76c-.98.66-2.23 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z" />
      <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38Z" />
    </svg>
  );
}
