"use client";

// Technical tab — server/response characteristics, timings, render-blocking,
// content relevance, heading structure, social tags, plus the reused PageSpeed
// panel (Lighthouse scores + Core Web Vitals).

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import ScoreRing from "@/app/scan/score-ring";
import OgPreview from "@/app/scan/og-preview";
import PerformancePanel from "@/app/scan/performance-panel";
import ScanGate from "./scan-gate";
import { useScan } from "./scan-context";

function rootPageOf(scan) {
  if (!scan?.pages?.length) return null;
  return scan.pages.find((p) => p.url === scan.rootUrl && p.signals) || scan.pages.find((p) => p.signals) || null;
}

function fmtBytes(n) {
  if (n == null) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

// A two-column key/value row block inside a card.
function KvTable({ rows }) {
  return (
    <Table>
      <TableBody>
        {rows.map(([k, v]) => (
          <TableRow key={k}>
            <TableCell className="text-muted-foreground">{k}</TableCell>
            <TableCell className="text-right font-medium">{v}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function TimingCard({ label, ms, tone }) {
  return (
    <Card>
      <CardContent className="py-4">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className={`mt-1 text-2xl font-bold ${tone}`}>{ms == null ? "—" : `${ms}`}<span className="text-sm font-normal text-muted-foreground"> ms</span></div>
      </CardContent>
    </Card>
  );
}

function CoverageRow({ label, value }) {
  const pct = value == null ? null : Math.round(value * 100);
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span>{label}</span>
        <span className={pct == null ? "text-muted-foreground" : pct >= 50 ? "text-pass" : "text-warning"}>
          {pct == null ? "—" : `${pct}%`}
        </span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary" style={{ width: `${pct || 0}%` }} />
      </div>
    </div>
  );
}

function HeadingBars({ byLevel }) {
  const levels = ["h1", "h2", "h3", "h4", "h5", "h6"];
  const max = Math.max(1, ...levels.map((l) => byLevel?.[l] || 0));
  return (
    <div className="space-y-2">
      {levels.map((l) => {
        const n = byLevel?.[l] || 0;
        return (
          <div key={l} className="flex items-center gap-3 text-sm">
            <span className="w-8 uppercase text-muted-foreground">{l}</span>
            <div className="h-2 flex-1 rounded-full bg-muted">
              <div className="h-full rounded-full bg-info" style={{ width: `${(n / max) * 100}%` }} />
            </div>
            <span className="w-6 text-right tabular-nums">{n}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function TechnicalTab() {
  const { scan } = useScan() || {};
  const page = rootPageOf(scan);
  const s = page?.signals;
  const resp = page?.response;
  const timings = resp?.timings;
  const rel = s?.relevance;

  return (
    <ScanGate>
      <div className="space-y-6">
        {/* On-page overview */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">On-page overview</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-6 sm:flex-row sm:items-center">
            <ScoreRing score={page?.audit?.score ?? 0} grade={page?.audit?.grade} size={120} label="On-page" />
            <div className="flex-1">
              <KvTable
                rows={[
                  ["Server", resp?.server || "—"],
                  ["Status", page?.httpStatus ?? "—"],
                  ["Encoding", resp?.contentEncoding || "—"],
                  ["Page size", fmtBytes(resp?.byteSize)],
                  ["DOM nodes", s?.domNodes != null ? `${s.domNodes}${s.domNodesApprox ? " (approx)" : ""}` : "—"],
                  ["Cacheable", resp?.cacheable ? "Yes" : "No"],
                ]}
              />
            </div>
          </CardContent>
        </Card>

        {/* Server timing */}
        <div>
          <h3 className="mb-2 text-sm font-medium text-muted-foreground">Server timing (fetch — not Lighthouse)</h3>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            <TimingCard label="TTFB" ms={timings?.ttfbMs} tone="text-warning" />
            <TimingCard label="Download" ms={timings?.downloadMs} tone="text-pass" />
            <TimingCard label="Total" ms={timings?.totalMs} tone="" />
          </div>
        </div>

        {/* Render blocking + content relevance */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Render blocking</CardTitle>
            </CardHeader>
            <CardContent>
              <KvTable
                rows={[
                  ["Blocking scripts", s?.renderBlocking?.scripts ?? "—"],
                  ["Blocking stylesheets", s?.renderBlocking?.stylesheets ?? "—"],
                ]}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Content relevance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <CoverageRow label="Title" value={rel?.titleCoverage} />
              <CoverageRow label="Description" value={rel?.descCoverage} />
              <CoverageRow label="Keywords" value={rel?.keywordCoverage} />
              <CoverageRow label="Content rate" value={s?.contentRatio} />
            </CardContent>
          </Card>
        </div>

        {/* Heading structure */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Heading structure</CardTitle>
          </CardHeader>
          <CardContent>
            <HeadingBars byLevel={s?.headings?.byLevel} />
          </CardContent>
        </Card>

        {/* Social tags */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Social tags{" "}
              <Badge variant="outline" className="ml-1 align-middle">
                {s?.og?.title ? "OG" : "no OG"}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6 lg:grid-cols-2">
            <OgPreview og={s?.og} title={s?.title} description={s?.metaDescription} url={page?.url} />
            <KvTable
              rows={[
                ["og:title", s?.og?.title || "—"],
                ["og:image", s?.og?.image ? "✓" : "—"],
                ["twitter:card", s?.twitter?.card || "—"],
                ["twitter:image", s?.twitter?.image ? "✓" : "—"],
              ]}
            />
          </CardContent>
        </Card>

        {/* PageSpeed (Lighthouse scores + Core Web Vitals) */}
        <div>
          <h3 className="mb-2 text-sm font-medium text-muted-foreground">PageSpeed Insights</h3>
          <PerformancePanel url={scan?.rootUrl} />
        </div>
      </div>
    </ScanGate>
  );
}
