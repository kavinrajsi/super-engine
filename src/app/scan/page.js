// Scan results page (Server Component).
//
// Reads ?url= and ?deep= from the query, runs the synchronous scan on the
// server, and hands the result to the dashboard. scan/loading.js covers the wait.

import Link from "next/link";
import { assertSafeUrl } from "@/lib/seo/safe-fetch";
import { runScan } from "@/lib/seo/analyze";
import { saveScan } from "@/lib/db/scans";
import ScanDashboard from "./scan-dashboard";

export const metadata = { title: "Scan results — Meta Tag" };

function ErrorState({ message }) {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-4 p-6 text-center">
      <p className="text-muted-foreground">{message}</p>
      <Link href="/" className="text-primary hover:underline">
        ← Try another URL
      </Link>
    </div>
  );
}

export default async function ScanPage({ searchParams }) {
  const params = await searchParams;
  const rawUrl = typeof params.url === "string" ? params.url : "";
  const deepScan = params.deep === "1" || params.deep === "on";

  if (!rawUrl) return <ErrorState message="No URL provided." />;

  let safe;
  try {
    safe = assertSafeUrl(rawUrl);
  } catch (err) {
    return <ErrorState message={err.message} />;
  }

  let result;
  try {
    result = await runScan(safe.toString(), { deepScan });
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
    shareToken = await saveScan(result);
  } catch {
    /* DB unavailable — continue without a share link */
  }

  return (
    <ScanDashboard
      result={result}
      exportHref={`/api/export?${q}`}
      reportHref={`/api/report?${q}`}
      shareToken={shareToken}
    />
  );
}
