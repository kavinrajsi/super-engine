// Scan results page (Server Component).
//
// Reads ?url= and ?deep= from the query, runs the synchronous scan on the
// server, and hands the result to the dashboard. scan/loading.js covers the wait.

import Link from "next/link";
import { redirect } from "next/navigation";
import { assertSafeUrl } from "@/lib/seo/safe-fetch";
import { runScan } from "@/lib/seo/analyze";
import { saveScan } from "@/lib/db/scans";
import { currentUser } from "@/lib/auth/session";
import { isAuthConfigured } from "@/lib/auth/google";
import { planOf, scansUsedToday } from "@/lib/auth/plan";
import { buttonVariants } from "@/components/ui/button";
import ScanDashboard from "./scan-dashboard";

export const metadata = { title: "Scan results — Meta Tag" };

function LimitState({ used, limit }) {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-2xl font-bold">Daily scan limit reached</h1>
      <p className="text-muted-foreground">
        You&rsquo;ve used {used}/{limit} free scans today. Upgrade to Pro for higher limits, deep
        scans, Performance, Search Console, and saved history.
      </p>
      <Link href="/pricing" className={buttonVariants()}>
        Upgrade to Pro
      </Link>
    </div>
  );
}

function ErrorState({ message }) {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-4 p-6 text-center">
      <p className="text-muted-foreground">{message}</p>
      <Link href="/" className="text-primary-link hover:underline">
        ← Try another URL
      </Link>
    </div>
  );
}

export default async function ScanPage({ searchParams }) {
  const params = await searchParams;
  const rawUrl = typeof params.url === "string" ? params.url : "";
  const wantsDeep = params.deep === "1" || params.deep === "on";

  if (!rawUrl) return <ErrorState message="No URL provided." />;

  let safe;
  try {
    safe = assertSafeUrl(rawUrl);
  } catch (err) {
    return <ErrorState message={err.message} />;
  }

  // Scanning requires sign-in (so scans attribute to a user for limits). When
  // auth isn't configured at all, fall back to the open, unauthenticated flow.
  const user = isAuthConfigured() ? await currentUser() : null;
  if (isAuthConfigured() && !user) {
    const next = `/scan?url=${encodeURIComponent(safe.toString())}${wantsDeep ? "&deep=1" : ""}`;
    redirect(`/login?next=${encodeURIComponent(next)}`);
  }
  const plan = planOf(user);

  // Enforce the Free/Pro daily scan cap.
  if (user) {
    const used = await scansUsedToday(user.id);
    if (used >= plan.scansPerDay) return <LimitState used={used} limit={plan.scansPerDay} />;
  }

  const deepScan = wantsDeep && plan.deepScan;

  let result;
  try {
    result = await runScan(safe.toString(), { deepScan, maxPages: plan.maxPages });
  } catch (err) {
    return <ErrorState message={`Scan failed: ${err.message}`} />;
  }

  if (result.pages.length === 0) {
    return <ErrorState message="No pages could be analyzed." />;
  }

  const q = `url=${encodeURIComponent(safe.toString())}${deepScan ? "&deep=1" : ""}`;

  // Persist the scan (best-effort) so it can be shared and listed in history.
  let shareToken = null;
  try {
    shareToken = await saveScan(result, user?.id ?? null);
  } catch {
    /* DB unavailable — continue without a share link */
  }

  return (
    <ScanDashboard
      result={result}
      exportHref={`/api/export?${q}`}
      reportHref={`/api/report?${q}`}
      shareToken={shareToken}
      pro={plan.premium}
    />
  );
}
