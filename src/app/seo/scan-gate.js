"use client";

// Shared loading/error/empty gate for the audit-backed tabs (SEO, Links,
// Technical, GEO). Renders children only once the shared scan has loaded.

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useScan } from "./scan-context";

export default function ScanGate({ children }) {
  const { scan, status, error, rescan } = useScan() || {};

  if (status === "unsupported") {
    return (
      <Card>
        <CardContent className="space-y-2 py-6 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">Pick a Search Console property</p>
          <p>
            Site audits are derived from your Search Console property URL. Select a property in the
            Traffic tab (a Google Analytics property alone doesn&rsquo;t carry a site URL).
          </p>
        </CardContent>
      </Card>
    );
  }

  if (status === "empty") {
    return (
      <div className="py-6">
        <p className="text-sm font-medium text-foreground">Enter a URL to audit</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Type any site URL in the field above and click Run audit.
        </p>
      </div>
    );
  }

  if (status === "loading" || status === "idle" || !status) {
    return (
      <div className="space-y-3 py-6">
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <span
            className="inline-block h-2 w-2 shrink-0 rounded-full bg-primary"
            style={{ animation: "madrank-blink 1.8s steps(2, start) infinite" }}
            aria-hidden="true"
          />
          Running site audit — this takes a few seconds
        </p>
        <div className="space-y-2" aria-hidden="true">
          {[72, 55, 64, 40].map((w, i) => (
            <div
              key={i}
              className="h-2 rounded-full bg-muted"
              style={{ width: `${w}%`, animation: `madrank-blink 1.8s steps(2, start) ${i * 0.2}s infinite` }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="space-y-3 py-6">
        <p className="rounded-md border border-error/40 bg-error/10 px-3 py-2 text-sm text-error">
          {error || "The audit couldn’t be completed."}
        </p>
        {rescan && (
          <Button variant="outline" size="sm" onClick={() => rescan()}>
            Try again
          </Button>
        )}
      </div>
    );
  }

  if (!scan) return <p className="py-6 text-sm text-muted-foreground">No audit data.</p>;

  return children;
}
