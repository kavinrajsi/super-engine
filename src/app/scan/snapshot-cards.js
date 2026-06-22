"use client";

// Consolidated "Site health snapshot": SEO score + performance (real today) +
// backlinks + live SERP. Backlinks/SERP no-op to a "connect a provider" card
// until an external provider is wired; performance lazily runs PageSpeed.

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { candidateKeywords } from "@/lib/seo/keywords";
import ScoreRing from "./score-ring";

function rootSignals(result) {
  const pages = result?.pages || [];
  const p = pages.find((x) => x.url === result.rootUrl && x.signals) || pages.find((x) => x.signals);
  return p?.signals || null;
}

function grade(s) {
  if (s == null) return "—";
  if (s >= 90) return "A";
  if (s >= 75) return "B";
  if (s >= 60) return "C";
  if (s >= 40) return "D";
  return "F";
}

// A compact metric tile with a value + sublabel, used for the headline row.
function MetricTile({ label, value, sub, tone }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`mt-1 text-2xl font-bold tabular-nums ${tone || ""}`}>{value}</div>
      {sub && <div className="mt-0.5 text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}

function ConnectCard({ title, what }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">Connect a provider</p>
        <p>{what}</p>
      </CardContent>
    </Card>
  );
}

// Tiny inline sparkline of position-over-time (inverted: better rank = higher).
function Sparkline({ points, width = 120, height = 24 }) {
  const vals = points.map((p) => p.position).filter((v) => v != null);
  if (vals.length < 2) return null;
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const range = max - min || 1;
  const n = points.length;
  const coords = points
    .map((p, i) => ({
      x: n > 1 ? (i / (n - 1)) * width : 0,
      y: p.position == null ? null : ((p.position - min) / range) * (height - 4) + 2,
    }))
    .filter((c) => c.y != null);
  const d = coords.map((c, i) => `${i ? "L" : "M"}${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(" ");
  return (
    <svg width={width} height={height} aria-hidden="true">
      <path d={d} fill="none" stroke="var(--primary)" strokeWidth="1.5" />
    </svg>
  );
}

// Rank-over-time, read from stored SERP snapshots. Renders nothing until at
// least one keyword has 2+ data points (i.e. the rank cron has run a few days).
function RankHistory({ url }) {
  const [history, setHistory] = useState(null);
  useEffect(() => {
    if (!url) return;
    fetch(`/api/seo/serp-history?url=${encodeURIComponent(url)}`)
      .then((r) => r.json())
      .then((j) => setHistory(j.history || null))
      .catch(() => {});
  }, [url]);

  const rows = (history?.keywords || []).filter(
    (k) => k.points.filter((p) => p.position != null).length >= 2
  );
  if (!rows.length) return null;

  return (
    <div className="mt-4 space-y-2 border-t pt-3">
      <div className="text-xs font-medium text-muted-foreground">Rank over time</div>
      {rows.slice(0, 6).map((k) => {
        const pts = k.points.filter((p) => p.position != null);
        const latest = pts[pts.length - 1]?.position;
        const delta = pts[0]?.position != null && latest != null ? pts[0].position - latest : 0;
        return (
          <div key={k.keyword} className="flex items-center gap-3 text-sm">
            <span className="w-32 truncate" title={k.keyword}>{k.keyword}</span>
            <Sparkline points={k.points} />
            <span className="ml-auto tabular-nums">
              #{latest}{" "}
              {delta > 0 && <span className="text-pass">▲{delta}</span>}
              {delta < 0 && <span className="text-error">▼{-delta}</span>}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function SnapshotCards({ result, onSelect }) {
  const [perf, setPerf] = useState({ status: "idle", score: null, error: null });
  const [backlinks, setBacklinks] = useState({ status: "idle", data: null });
  const [serp, setSerp] = useState({ status: "idle", data: null });

  const url = result?.rootUrl;
  const keywords = candidateKeywords(rootSignals(result));

  // Performance: one lazy PageSpeed call (mobile). Friendly on keyless 429.
  useEffect(() => {
    if (!url) return;
    setPerf({ status: "loading", score: null, error: null });
    fetch(`/api/pagespeed?url=${encodeURIComponent(url)}&strategy=mobile`)
      .then((r) => r.json())
      .then((j) => {
        if (j.error) setPerf({ status: "error", score: null, error: j.error });
        else setPerf({ status: "done", score: j.scores?.performance ?? null, error: null });
      })
      .catch((e) => setPerf({ status: "error", score: null, error: e.message }));
  }, [url]);

  // Backlinks/SERP are PAID once a provider is wired — only do a cheap capability
  // probe on render (?check=1, no provider call); the real fetch is button-gated.
  useEffect(() => {
    if (!url) return;
    setBacklinks({ status: "done", data: null });
    fetch(`/api/seo/backlinks?url=${encodeURIComponent(url)}&check=1`)
      .then((r) => r.json())
      .then((j) => setBacklinks({ status: "done", data: j }))
      .catch(() => setBacklinks({ status: "done", data: { configured: false } }));
  }, [url]);

  useEffect(() => {
    if (!url) return;
    setSerp({ status: "done", data: null });
    fetch(`/api/seo/serp?url=${encodeURIComponent(url)}&check=1`)
      .then((r) => r.json())
      .then((j) => setSerp({ status: "done", data: j }))
      .catch(() => setSerp({ status: "done", data: { configured: false } }));
  }, [url]);

  // Button-triggered paid fetches.
  function loadBacklinks() {
    setBacklinks((s) => ({ ...s, status: "loading" }));
    fetch(`/api/seo/backlinks?url=${encodeURIComponent(url)}`)
      .then((r) => r.json())
      .then((j) => setBacklinks({ status: "done", data: j }))
      .catch((e) => setBacklinks({ status: "done", data: { configured: true, error: e.message } }));
  }
  function loadSerp() {
    setSerp((s) => ({ ...s, status: "loading" }));
    fetch(`/api/seo/serp?url=${encodeURIComponent(url)}&keywords=${encodeURIComponent(keywords.join(","))}`)
      .then((r) => r.json())
      .then((j) => setSerp({ status: "done", data: j }))
      .catch((e) => setSerp({ status: "done", data: { configured: true, error: e.message } }));
  }

  const bl = backlinks.data;
  const blConfigured = bl?.configured;
  const blLoaded = !!bl?.summary;
  const sp = serp.data;
  const spConfigured = sp?.configured;
  const spLoaded = !!sp?.results;

  const perfValue =
    perf.status === "loading" ? "…" : perf.status === "error" ? "—" : perf.score ?? "—";
  const referring = blLoaded ? bl.summary?.referringDomains ?? "—" : "—";
  const ranked = spLoaded ? (sp.results || []).filter((r) => r.found).length : "—";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Site health snapshot</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Headline row */}
        <div className="flex flex-col items-center gap-6 sm:flex-row">
          <ScoreRing
            score={result?.siteScore ?? 0}
            grade={grade(result?.siteScore)}
            size={120}
            label="SEO score"
          />
          <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-3">
            <button type="button" onClick={() => onSelect?.("performance")} className="text-left">
              <MetricTile label="Performance" value={perfValue} sub="PageSpeed (mobile)" />
            </button>
            <MetricTile label="Referring domains" value={referring} sub={blLoaded ? "backlinks" : blConfigured ? "load below" : "not connected"} />
            <MetricTile label="Keywords ranked" value={ranked} sub={spLoaded ? `of ${keywords.length} checked` : spConfigured ? "load below" : "not connected"} />
          </div>
        </div>

        {perf.status === "error" && (
          <p className="rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning">
            {perf.error}
          </p>
        )}

        {/* Backlinks + SERP detail */}
        <div className="grid gap-6 lg:grid-cols-2">
          {blConfigured && !blLoaded ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Backlinks</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  {bl?.error ? bl.error : "Fetch referring domains, backlinks, and domain rating from your provider."}
                </p>
                <Button size="sm" onClick={loadBacklinks} disabled={backlinks.status === "loading"}>
                  {backlinks.status === "loading" ? "Loading…" : "Load backlinks"}
                </Button>
              </CardContent>
            </Card>
          ) : blConfigured ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Backlinks</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <div className="text-xl font-bold">{bl.summary?.backlinks ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">Backlinks</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold">{bl.summary?.referringDomains ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">Ref. domains</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold">{bl.summary?.domainRating ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">Domain rating</div>
                  </div>
                </div>
                {bl.topReferrers?.length > 0 && (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Referring domain</TableHead>
                        <TableHead className="text-right">Links</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bl.topReferrers.slice(0, 8).map((r, i) => (
                        <TableRow key={i}>
                          <TableCell className="max-w-[18rem] truncate font-medium">{r.domain}</TableCell>
                          <TableCell className="text-right">{r.backlinks ?? "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          ) : (
            <ConnectCard
              title="Backlinks"
              what="Referring domains, total backlinks, and domain authority need an external provider (e.g. DataForSEO). Set the provider credentials to enable this."
            />
          )}

          {spConfigured && !spLoaded ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Live SERP</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  {sp?.error
                    ? sp.error
                    : keywords.length
                      ? `Check live Google rank for ${keywords.length} keyword(s) from this page.`
                      : "No keywords detected on this page to rank-check."}
                </p>
                <Button size="sm" onClick={loadSerp} disabled={serp.status === "loading" || !keywords.length}>
                  {serp.status === "loading" ? "Loading…" : "Load live rank"}
                </Button>
              </CardContent>
            </Card>
          ) : spConfigured ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Live SERP{" "}
                  <Badge variant="outline" className="ml-1 align-middle">
                    {(sp.results || []).length} keywords
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {(sp.results || []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">No keywords to check.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Keyword</TableHead>
                        <TableHead className="text-right">Position</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sp.results.map((r, i) => (
                        <TableRow key={i}>
                          <TableCell className="max-w-[18rem] truncate font-medium">{r.keyword}</TableCell>
                          <TableCell className="text-right">
                            {r.found ? `#${r.position}` : <span className="text-muted-foreground">not in top</span>}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
                <RankHistory url={url} />
              </CardContent>
            </Card>
          ) : (
            <ConnectCard
              title="Live SERP"
              what="Live Google rank for your keywords needs a SERP provider (e.g. DataForSEO, SerpApi). Set the provider credentials to enable rank tracking."
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
