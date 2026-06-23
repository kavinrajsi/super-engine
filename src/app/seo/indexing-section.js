"use client";

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

const nf = new Intl.NumberFormat("en-US");
const fmtInt = (n) => nf.format(Math.round(n || 0));

function shortUrl(u) {
  try {
    const x = new URL(u);
    return x.pathname === "/" ? x.host : x.pathname + x.search;
  } catch {
    return u;
  }
}

function SummaryChip({ label, value, sub, highlight }) {
  return (
    <Card>
      <CardContent className="py-4">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className={`mt-1 text-2xl font-bold ${highlight || ""}`}>{value}</div>
        {sub && <div className="mt-0.5 text-xs text-muted-foreground">{sub}</div>}
      </CardContent>
    </Card>
  );
}

export default function IndexingSection({ site }) {
  const [status, setStatus] = useState("idle"); // idle | checking | ready | loading | done | error
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!site) return;
    setStatus("checking");
    setData(null);
    setError(null);
    fetch(`/api/gsc/indexing?site=${encodeURIComponent(site)}&check=1`)
      .then((r) => r.json())
      .then((j) => {
        if (j.configured) setStatus("ready");
        else setStatus("idle");
      })
      .catch(() => setStatus("idle"));
  }, [site]);

  function load(force = false) {
    setStatus("loading");
    setError(null);
    const url = `/api/gsc/indexing?site=${encodeURIComponent(site)}${force ? "&force=1" : ""}`;
    fetch(url)
      .then((r) => r.json())
      .then((j) => {
        if (j.error) {
          setError(j.error);
          setStatus("error");
        } else {
          setData(j);
          setStatus("done");
        }
      })
      .catch((e) => {
        setError(e.message);
        setStatus("error");
      });
  }

  if (status === "idle" || status === "checking") return null;

  if (status === "ready" || (status === "loading" && !data)) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Page indexing</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Inspect how Google sees your pages — which are indexed and why others aren&apos;t.
            Samples up to 15 pages from your sitemap via the URL Inspection API (2,000/day limit; results cached 24h).
          </p>
          <Button size="sm" onClick={() => load(false)} disabled={status === "loading"}>
            {status === "loading" ? "Inspecting pages…" : "Load indexing report"}
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (status === "error") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Page indexing</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-error">{error || "Failed to load indexing data."}</p>
          <Button size="sm" variant="outline" onClick={() => load(false)}>Retry</Button>
        </CardContent>
      </Card>
    );
  }

  // status === "done" or loading with cached data
  const { summary, inspections = [], totalSubmitted, cached } = data;

  const reasonEntries = Object.entries(summary?.byReason || {}).sort(([, a], [, b]) => b - a);

  return (
    <div className="space-y-4">
      {/* Summary chips */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryChip
          label="Submitted"
          value={fmtInt(totalSubmitted)}
          sub="from sitemap(s)"
        />
        <SummaryChip
          label="Inspected"
          value={fmtInt(summary?.total)}
          sub="pages sampled"
        />
        <SummaryChip
          label="Indexed"
          value={fmtInt(summary?.indexed)}
          sub={`of ${summary?.total || 0} inspected`}
          highlight={summary?.notIndexed === 0 ? "text-pass" : ""}
        />
        <SummaryChip
          label="Not indexed"
          value={fmtInt(summary?.notIndexed)}
          sub="pages with issues"
          highlight={summary?.notIndexed > 0 ? "text-error" : ""}
        />
      </div>

      {/* Why pages aren't indexed */}
      <Card>
        <CardHeader className="flex flex-row items-center gap-2">
          <CardTitle className="text-base">Why pages aren&apos;t indexed</CardTitle>
          {cached && (
            <Badge variant="outline" className="text-xs font-normal">cached</Badge>
          )}
        </CardHeader>
        <CardContent>
          {reasonEntries.length === 0 ? (
            <p className="text-sm text-pass font-medium">All inspected pages are indexed ✓</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reason</TableHead>
                  <TableHead className="text-right">Count</TableHead>
                  <TableHead>Source</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reasonEntries.map(([reason, count]) => {
                  const isWebsite = WEBSITE_REASONS.has(reason);
                  return (
                    <TableRow key={reason}>
                      <TableCell className="font-medium">{reason}</TableCell>
                      <TableCell className="text-right">{fmtInt(count)}</TableCell>
                      <TableCell>
                        <Badge variant={isWebsite ? "destructive" : "outline"}>
                          {isWebsite ? "Website" : "Google systems"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Per-page inspection results */}
      {inspections.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <CardTitle className="text-base">Inspected pages</CardTitle>
            <Button size="sm" variant="ghost" className="ml-auto text-xs" onClick={() => load(true)}>
              Refresh
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Page</TableHead>
                  <TableHead>Verdict</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Last crawled</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inspections.map((row, i) => (
                  <TableRow key={i}>
                    <TableCell
                      className="max-w-[18rem] truncate font-mono text-xs"
                      title={row.url}
                    >
                      {shortUrl(row.url)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          row.indexed
                            ? "outline"
                            : row.verdict === null
                              ? "secondary"
                              : "destructive"
                        }
                      >
                        {row.indexed ? "Indexed" : row.verdict || "Error"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {row.reason || "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {row.lastCrawlTime
                        ? new Date(row.lastCrawlTime).toLocaleDateString()
                        : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Reasons sourced from the website itself (fixable by the site owner)
const WEBSITE_REASONS = new Set([
  "Not found (404)",
  "403 Forbidden",
  "5xx server error",
  "Soft 404",
  "Blocked by robots.txt",
  "Excluded by noindex",
  "Page with redirect",
  "Alternate page with proper canonical tag",
]);
