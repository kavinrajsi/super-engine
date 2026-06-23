"use client";

// GEO tab — AI-search readiness (AEO/GEO/AIO/AGO + llms.txt/ai.txt/bot policy).
// Reuses the scan dashboard's AiReadinessPanel against the shared audit result.
// Each lens has a "View details" link to its own breakdown page.

import Link from "next/link";
import AiReadinessPanel from "@/app/scan/ai-readiness-panel";
import ScanGate from "./scan-gate";
import { useScan } from "./scan-context";

const LENS_PAGES = [
  { key: "aeo", label: "AEO", href: "/seo/aeo" },
  { key: "geo", label: "GEO", href: "/seo/geo" },
  { key: "aio", label: "AIO", href: "/seo/aio" },
  { key: "ago", label: "AGO", href: "/seo/ago" },
];

export default function GeoTab() {
  const { scan } = useScan() || {};
  const siteUrl = scan?.rootUrl;

  return (
    <ScanGate>
      <AiReadinessPanel readiness={scan?.aiReadiness} url={siteUrl} />

      {/* Per-lens detail links */}
      <div className="mx-auto mt-4 max-w-5xl">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {LENS_PAGES.map((l) => {
            const href = siteUrl
              ? `${l.href}?url=${encodeURIComponent(siteUrl)}`
              : l.href;
            const score = scan?.aiReadiness?.layers?.[l.key];
            return (
              <Link
                key={l.key}
                href={href}
                className="flex items-center justify-between rounded-lg border bg-card px-3 py-2.5 text-sm no-underline transition-colors hover:border-primary hover:bg-accent"
              >
                <span className="font-medium">{l.label} details</span>
                {score != null && (
                  <span className="tabular-nums text-muted-foreground">{score}</span>
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </ScanGate>
  );
}
