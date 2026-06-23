"use client";

// SEO tab — on-page SEO health for the audited site. A headline strip of
// content-quality cards (from scan.contentSummary) over the reused scan
// Overview + Issues panels.

import { Card, CardContent } from "@/components/ui/card";
import OverviewPanel from "@/app/scan/overview-panel";
import IssuesPanel from "@/app/scan/issues-panel";
import ScoreInfoButton from "@/app/scan/score-info";
import ScanGate from "./scan-gate";
import { useScan } from "./scan-context";

function StatCard({ label, value, hint, info }) {
  return (
    <Card>
      <CardContent className="py-4">
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          {label}
          {info}
        </div>
        <div className="mt-1 text-2xl font-bold">{value ?? "—"}</div>
        {hint && <div className="mt-0.5 text-xs text-muted-foreground">{hint}</div>}
      </CardContent>
    </Card>
  );
}

const noop = () => {};

export default function SeoTab() {
  const { scan } = useScan() || {};
  const cs = scan?.contentSummary;

  return (
    <ScanGate>
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            label="Site score"
            value={scan?.siteScore != null ? `${scan.siteScore}` : "—"}
            info={<ScoreInfoButton type="seo" />}
          />
          <StatCard
            label="Readability"
            value={cs?.readabilityGrade || "—"}
            hint={cs?.readabilityEase != null ? `Flesch ${cs.readabilityEase}` : null}
          />
          <StatCard
            label="Content relevance"
            value={cs?.relevanceScore != null ? `${cs.relevanceScore}%` : "—"}
          />
          <StatCard
            label="Content ratio"
            value={cs?.contentRatioPct != null ? `${cs.contentRatioPct}%` : "—"}
            hint={cs?.wordCount != null ? `${cs.wordCount} words` : null}
          />
        </div>

        {/* Reused scan panels — pass a no-op onSelect (no sidebar here). */}
        <OverviewPanel result={scan} onSelect={noop} />
        <IssuesPanel result={scan} />
      </div>
    </ScanGate>
  );
}
