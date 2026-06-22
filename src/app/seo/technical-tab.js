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

const CHIP_TONE = {
  pass: "border-pass/30 bg-pass/10 text-pass",
  warning: "border-warning/30 bg-warning/10 text-warning",
  error: "border-error/30 bg-error/10 text-error",
  muted: "border-border bg-muted text-muted-foreground",
};

function HeadingChip({ tone = "muted", children }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${CHIP_TONE[tone]}`}
    >
      {children}
    </span>
  );
}

function HeadingStructure({ headings, h1s }) {
  const byLevel = headings?.byLevel || {};
  const levels = ["h1", "h2", "h3", "h4", "h5", "h6"];
  const counts = levels.map((l) => byLevel[l] || 0);
  const total = headings?.count ?? counts.reduce((a, b) => a + b, 0);
  const max = Math.max(1, ...counts);
  const h1Count = byLevel.h1 || 0;
  const skips = headings?.skips || 0;

  const h1Tone = h1Count === 1 ? "pass" : h1Count === 0 ? "error" : "warning";
  const h1Label = h1Count === 1 ? "Single H1" : h1Count === 0 ? "No H1" : `${h1Count} H1s`;
  const skipTone = skips === 0 ? "pass" : "warning";
  const skipLabel = skips === 0 ? "Clean hierarchy" : `${skips} level skip${skips > 1 ? "s" : ""}`;

  return (
    <div className="space-y-4">
      {/* health summary */}
      <div className="flex flex-wrap gap-2">
        <HeadingChip tone={h1Tone}>{h1Label}</HeadingChip>
        <HeadingChip tone={skipTone}>{skipLabel}</HeadingChip>
        <HeadingChip tone="muted">{total} heading{total === 1 ? "" : "s"}</HeadingChip>
      </div>

      {/* per-level distribution */}
      <div className="space-y-1.5">
        {levels.map((l, i) => {
          const n = counts[i];
          return (
            <div key={l} className="flex items-center gap-3">
              <span className="w-7 font-mono text-xs uppercase text-muted-foreground">{l}</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${(n / max) * 100}%`,
                    backgroundColor: l === "h1" ? "var(--primary)" : "var(--info)",
                  }}
                />
              </div>
              <span className="w-6 text-right font-mono text-xs tabular-nums">{n}</span>
            </div>
          );
        })}
      </div>

      {/* the actual H1 text — the page's primary topic signal */}
      {h1s?.length > 0 ? (
        <div className="rounded-lg border bg-muted/30 p-3">
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            H1 text
          </div>
          <ul className="mt-1.5 space-y-1">
            {h1s.slice(0, 4).map((t, i) => (
              <li key={i} className="truncate text-sm" title={t}>
                {t}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-sm text-warning">No H1 found — add a single, descriptive H1.</p>
      )}
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
            <HeadingStructure headings={s?.headings} h1s={s?.h1s} />
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
