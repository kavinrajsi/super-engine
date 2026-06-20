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

  if (status === "loading" || status === "idle" || !status) {
    return <p className="py-6 text-sm text-muted-foreground">Running site audit…</p>;
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
