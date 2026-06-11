import Link from "next/link";
import { getScanByToken } from "@/lib/db/scans";
import ScanDashboard from "@/app/scan/scan-dashboard";

export const metadata = { title: "Shared report — Meta Tag" };

export default async function SharedReport({ params }) {
  const { token } = await params;
  const result = await getScanByToken(token);

  if (!result) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-muted-foreground">This shared report wasn’t found or has expired.</p>
        <Link href="/" className="text-primary hover:underline">
          ← Run a new audit
        </Link>
      </div>
    );
  }

  const q = `url=${encodeURIComponent(result.rootUrl)}`;
  return (
    <ScanDashboard
      result={result}
      exportHref={`/api/export?${q}`}
      reportHref={`/api/report?${q}`}
      shareToken={token}
    />
  );
}
