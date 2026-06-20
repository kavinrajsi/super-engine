"use client";

// Overview: AI-search scorecard first, then SEO health + stats, status alerts,
// and the top issues.

import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { questsFromIssues } from "@/lib/seo/gamify";
import ScoreRing from "./score-ring";
import SnapshotCards from "./snapshot-cards";

const SEV_BADGE = { error: "destructive", warning: "secondary", info: "outline" };

const AI_LENSES = [
  { key: "aeo", label: "AEO" },
  { key: "aio", label: "AIO" },
  { key: "geo", label: "GEO" },
  { key: "ago", label: "AGO" },
];

function grade(s) {
  if (s == null) return "—";
  if (s >= 90) return "A";
  if (s >= 75) return "B";
  if (s >= 60) return "C";
  if (s >= 40) return "D";
  return "F";
}

function scoreColor(s) {
  if (s == null) return "var(--muted-foreground)";
  if (s >= 75) return "var(--pass)";
  if (s >= 50) return "var(--warning)";
  return "var(--error)";
}

function shortPath(u) {
  try {
    const x = new URL(u);
    return x.pathname === "/" ? x.host : x.pathname + x.search;
  } catch {
    return u;
  }
}

export default function OverviewPanel({ result, onSelect }) {
  const pages = result.pages;
  const ai = result.aiReadiness;
  const errors = pages.reduce((n, p) => n + (p.audit?.counts.error || 0), 0);
  const warnings = pages.reduce((n, p) => n + (p.audit?.counts.warning || 0), 0);
  const allIssues = pages.flatMap((p) => [
    ...(p.audit?.issues || []),
    ...(p.aiAudit?.issues || []),
  ]);
  const topIssues = questsFromIssues(allIssues).slice(0, 6);

  const stats = [
    { label: "Pages analyzed", value: pages.length },
    { label: "Errors", value: errors },
    { label: "Warnings", value: warnings },
    { label: "Trackers", value: result.analytics?.tools.length ?? 0 },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Consolidated site health snapshot — SEO score, performance, backlinks, SERP */}
      <SnapshotCards result={result} onSelect={onSelect} />

      {/* AI search readiness — first */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">AI search readiness</CardTitle>
          <CardDescription>How well this site works for AI answer engines</CardDescription>
          <CardAction>
            <Button variant="outline" size="sm" onClick={() => onSelect("ai")}>
              View AI details
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-6 sm:flex-row">
          <ScoreRing score={ai?.overall ?? 0} size={120} label="Overall AI" />
          <div className="grid flex-1 grid-cols-2 gap-3 sm:grid-cols-4">
            {AI_LENSES.map((l) => (
              <div key={l.key} className="rounded-lg border bg-card p-3 text-center">
                <div
                  className="text-2xl font-bold tabular-nums"
                  style={{ color: scoreColor(ai?.layers?.[l.key]) }}
                >
                  {ai?.layers?.[l.key] ?? "—"}
                </div>
                <div className="text-xs uppercase tracking-wide text-muted-foreground">
                  {l.label}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* SEO health — second */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">SEO health</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-6 sm:flex-row">
          <ScoreRing
            score={result.siteScore ?? 0}
            grade={grade(result.siteScore)}
            size={140}
            label="Site health score"
          />
          <div className="grid flex-1 grid-cols-2 gap-3 sm:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} className="rounded-lg border bg-card p-3">
                <div className="text-2xl font-bold tabular-nums">{s.value}</div>
                <div className="text-xs uppercase tracking-wide text-muted-foreground">
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {!result.sitemap.found && (
          <Alert>
            <AlertTitle>No sitemap found</AlertTitle>
            <AlertDescription>
              Analyzed the homepage{result.deepScan ? " plus crawled pages" : ""}. Run a
              deep scan to discover more pages.
            </AlertDescription>
          </Alert>
        )}
        {result.headless?.available && result.headless.rendered > 0 && (
          <Alert>
            <AlertTitle>Headless rendering used</AlertTitle>
            <AlertDescription>
              Re-rendered {result.headless.rendered} JavaScript page(s) for accurate results.
            </AlertDescription>
          </Alert>
        )}
        {!result.headless?.available && result.headless?.candidates > 0 && (
          <Alert>
            <AlertTitle>{result.headless.candidates} JavaScript-rendered page(s)</AlertTitle>
            <AlertDescription>
              Set <span className="mono">BROWSER_WS_ENDPOINT</span> to enable headless
              rendering for accurate meta + tracker detection.
            </AlertDescription>
          </Alert>
        )}
        {result.deepScan && result.missingFromSitemap.length > 0 && (
          <Alert>
            <AlertTitle>{result.missingFromSitemap.length} page(s) missing from sitemap</AlertTitle>
            <AlertDescription>Found by crawling but not declared in the sitemap.</AlertDescription>
          </Alert>
        )}
      </div>

      {/* Internal link structure (deep scan only) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Internal link structure</CardTitle>
          <CardDescription>Orphan pages, click-depth, and most-linked pages</CardDescription>
        </CardHeader>
        <CardContent>
          {!result.internalGraph ? (
            <p className="text-sm text-muted-foreground">
              Run a deep scan to map internal links (orphan pages, click-depth, top-linked pages).
            </p>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="rounded-lg border p-3">
                  <div className="text-2xl font-bold tabular-nums">{result.internalGraph.pages}</div>
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">Pages crawled</div>
                </div>
                <div className="rounded-lg border p-3">
                  <div className={`text-2xl font-bold tabular-nums ${result.internalGraph.orphans.length ? "text-warning" : ""}`}>
                    {result.internalGraph.orphans.length}
                  </div>
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">Orphan pages</div>
                </div>
                <div className="rounded-lg border p-3">
                  <div className="text-2xl font-bold tabular-nums">{result.internalGraph.maxDepth}</div>
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">Max click-depth</div>
                </div>
              </div>
              {result.internalGraph.topLinked?.length > 0 && (
                <div>
                  <div className="mb-1 text-xs font-medium text-muted-foreground">Most internally-linked</div>
                  <ul className="space-y-1 text-sm">
                    {result.internalGraph.topLinked.slice(0, 5).map((p) => (
                      <li key={p.url} className="flex items-center justify-between gap-3">
                        <span className="min-w-0 truncate" title={p.url}>{shortPath(p.url)}</span>
                        <span className="shrink-0 text-muted-foreground">{p.inbound} links</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {result.internalGraph.orphans.length > 0 && (
                <div>
                  <div className="mb-1 text-xs font-medium text-muted-foreground">Orphan pages (no internal links in)</div>
                  <ul className="space-y-1 text-sm">
                    {result.internalGraph.orphans.slice(0, 5).map((u) => (
                      <li key={u} className="truncate text-warning" title={u}>{shortPath(u)}</li>
                    ))}
                    {result.internalGraph.orphans.length > 5 && (
                      <li className="text-xs text-muted-foreground">+{result.internalGraph.orphans.length - 5} more</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Top issues</CardTitle>
          <CardDescription>Highest-impact fixes across the site</CardDescription>
          <CardAction>
            <Button variant="outline" size="sm" onClick={() => onSelect("issues")}>
              View all
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="space-y-2">
          {topIssues.length === 0 ? (
            <p className="text-sm text-muted-foreground">No issues found 🎉</p>
          ) : (
            topIssues.map((q) => (
              <div key={q.ruleKey} className="flex items-start gap-3 rounded-lg border p-3">
                <Badge variant={SEV_BADGE[q.severity] || "outline"} className="mt-0.5 shrink-0">
                  {q.severity}
                </Badge>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">{q.title}</div>
                  {q.recommendation && (
                    <div className="text-xs text-muted-foreground">{q.recommendation}</div>
                  )}
                </div>
                <Badge variant="outline" className="shrink-0">
                  {q.category.toUpperCase()}
                </Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
