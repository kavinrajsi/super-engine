"use client";

// AI Readiness: overall score + four lens bars (AEO/GEO/AIO/AGO), llms.txt /
// llms-full.txt / ai.txt validation, and AI-crawler access.

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import ScoreRing from "./score-ring";

const LENSES = [
  { key: "aeo", name: "AEO", full: "Answer Engine — be the direct answer" },
  { key: "geo", name: "GEO", full: "Generative Engine — be citable" },
  { key: "aio", name: "AIO", full: "AI Overviews — be machine-readable" },
  { key: "ago", name: "AGO", full: "Agent Access — be crawlable by AI bots" },
];

const SEV_COLOR = {
  error: "text-[var(--error)]",
  warning: "text-[var(--warning)]",
  info: "text-[var(--info)]",
};

function FileStatus({ label, info }) {
  let badge;
  if (!info?.present) badge = <Badge variant="outline">✗ missing</Badge>;
  else if (info.valid && !(info.findings?.length)) badge = <Badge>✓ valid</Badge>;
  else if (info.valid)
    badge = <Badge variant="secondary">✓ valid · {info.findings.length} note(s)</Badge>;
  else badge = <Badge variant="destructive">⚠ invalid</Badge>;

  return (
    <div className="rounded-md border p-3">
      <div className="flex items-center justify-between">
        <span className="font-mono text-sm">{label}</span>
        {badge}
      </div>
      {info?.present && info.findings?.length > 0 && (
        <ul className="mt-2 space-y-1">
          {info.findings.map((f, i) => (
            <li key={i} className="flex items-baseline gap-2 text-xs">
              <span className={`font-semibold uppercase ${SEV_COLOR[f.severity] || ""}`}>
                {f.severity}
              </span>
              {f.line != null && <span className="font-mono text-muted-foreground">L{f.line}</span>}
              <span>{f.message}</span>
            </li>
          ))}
        </ul>
      )}
      {info?.stats?.title && (
        <p className="mt-1 text-xs text-muted-foreground">
          “{info.stats.title}”{typeof info.stats.links === "number" ? ` · ${info.stats.links} link(s)` : ""}
        </p>
      )}
    </div>
  );
}

export default function AiReadinessPanel({ readiness }) {
  if (!readiness) return null;
  const { overall, layers, site } = readiness;
  const blocked = site?.botsBlocked || [];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">AI search readiness</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-6 sm:flex-row">
          <ScoreRing score={overall ?? 0} size={120} label="Overall" />
          <div className="grid flex-1 gap-4">
            {LENSES.map((l) => (
              <div key={l.key}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-medium">{l.name}</span>
                  <span className="tabular-nums text-muted-foreground">{layers?.[l.key] ?? "—"}</span>
                </div>
                <Progress value={layers?.[l.key] ?? 0} />
                <p className="mt-1 text-xs text-muted-foreground">{l.full}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">AI files &amp; crawler access</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <FileStatus label="/llms.txt" info={site?.llms} />
          <FileStatus label="/llms-full.txt" info={site?.llmsFull} />
          <FileStatus label="/ai.txt" info={site?.aiTxt} />
          <div className="rounded-md border p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">AI crawler access</span>
              {blocked.length === 0 ? (
                <Badge>✓ allowed</Badge>
              ) : (
                <Badge variant="destructive">
                  ✗ {blocked.length} blocked
                </Badge>
              )}
            </div>
            {blocked.length > 0 && (
              <p className="mt-1 text-xs text-muted-foreground">Blocked: {blocked.join(", ")}</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
