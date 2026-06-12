"use client";

// Connected Search Console view: property + date-range selectors, summary cards
// with period-over-period deltas, a clicks/impressions trend, top queries/pages,
// and striking-distance opportunities.

import { useEffect, useState } from "react";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
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
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

const RANGES = [
  { days: 7, label: "7 days" },
  { days: 28, label: "28 days" },
  { days: 90, label: "90 days" },
];

const CHART_CONFIG = {
  clicks: { label: "Clicks", color: "var(--primary)" },
  impressions: { label: "Impressions", color: "var(--info)" },
};

const nf = new Intl.NumberFormat("en-US");
const fmtInt = (n) => nf.format(Math.round(n || 0));
const fmtPct = (n) => `${((n || 0) * 100).toFixed(1)}%`;
const fmtPos = (n) => (n ? n.toFixed(1) : "—");

function shortUrl(u) {
  try {
    const x = new URL(u);
    return x.pathname === "/" ? x.host : x.pathname + x.search;
  } catch {
    return u;
  }
}

// For position, lower is better, so a negative change is good.
function Delta({ d, invert = false, percent = false }) {
  if (!d || d.prev === 0) return null;
  const up = d.change > 0;
  const good = invert ? !up : up;
  if (Math.abs(d.change) < 1e-9) return null;
  const text = percent
    ? `${up ? "+" : ""}${(d.change * 100).toFixed(1)}pp`
    : d.pct != null
      ? `${up ? "+" : ""}${(d.pct * 100).toFixed(0)}%`
      : `${up ? "+" : ""}${fmtInt(d.change)}`;
  return (
    <span className={good ? "text-pass" : "text-error"}>
      {up ? "▲" : "▼"} {text}
    </span>
  );
}

function StatCard({ label, value, delta }) {
  return (
    <Card>
      <CardContent className="py-4">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="mt-1 text-2xl font-bold">{value}</div>
        <div className="mt-0.5 text-xs">{delta}</div>
      </CardContent>
    </Card>
  );
}

function MetricTable({ caption, label, rows, keyName }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{caption}</CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No data for this range.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{label}</TableHead>
                <TableHead className="text-right">Clicks</TableHead>
                <TableHead className="text-right">Impr.</TableHead>
                <TableHead className="text-right">CTR</TableHead>
                <TableHead className="text-right">Pos.</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r, i) => (
                <TableRow key={i}>
                  <TableCell className="max-w-[22rem] truncate font-medium" title={r.key}>
                    {keyName === "page" ? shortUrl(r.key) : r.key}
                  </TableCell>
                  <TableCell className="text-right">{fmtInt(r.clicks)}</TableCell>
                  <TableCell className="text-right">{fmtInt(r.impressions)}</TableCell>
                  <TableCell className="text-right">{fmtPct(r.ctr)}</TableCell>
                  <TableCell className="text-right">{fmtPos(r.position)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

export default function GscDashboard({ email }) {
  const [sites, setSites] = useState(null); // null = loading
  const [site, setSite] = useState("");
  const [days, setDays] = useState(28);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load the property list once.
  useEffect(() => {
    fetch("/api/gsc/sites")
      .then((r) => r.json())
      .then((j) => {
        if (j.error) throw new Error(j.error);
        setSites(j.sites || []);
        setSite((j.sites || [])[0] || "");
      })
      .catch((e) => {
        setSites([]);
        setError(e.message);
      });
  }, []);

  // Fetch the report whenever the property or range changes.
  useEffect(() => {
    if (!site) return;
    setLoading(true);
    setError(null);
    fetch(`/api/gsc/report?site=${encodeURIComponent(site)}&days=${days}`)
      .then((r) => r.json())
      .then((j) => {
        if (j.error) throw new Error(j.error);
        setReport(j);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [site, days]);

  async function disconnect() {
    await fetch("/api/gsc/disconnect", { method: "POST" });
    window.location.href = "/search-console";
  }

  const t = report?.totals;
  const d = report?.deltas;

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={site}
          onChange={(e) => setSite(e.target.value)}
          className="h-9 rounded-md border bg-background px-3 text-sm"
          disabled={!sites || sites.length === 0}
        >
          {sites === null && <option>Loading properties…</option>}
          {sites?.length === 0 && <option>No properties found</option>}
          {sites?.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <div className="inline-flex rounded-md border p-0.5 text-xs">
          {RANGES.map((r) => (
            <button
              key={r.days}
              onClick={() => setDays(r.days)}
              className={`rounded px-2.5 py-1 ${
                days === r.days ? "bg-primary text-primary-foreground" : ""
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-3 text-xs text-muted-foreground">
          {email && <span className="hidden sm:inline">Connected as {email}</span>}
          <Button variant="outline" size="sm" onClick={disconnect}>
            Disconnect
          </Button>
        </div>
      </div>

      {error && (
        <p className="rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-warning">
          {error}
        </p>
      )}

      {loading && !report && (
        <p className="text-sm text-muted-foreground">Loading Search Console data…</p>
      )}

      {report && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Clicks" value={fmtInt(t.clicks)} delta={<Delta d={d.clicks} />} />
            <StatCard label="Impressions" value={fmtInt(t.impressions)} delta={<Delta d={d.impressions} />} />
            <StatCard label="Avg CTR" value={fmtPct(t.ctr)} delta={<Delta d={d.ctr} percent />} />
            <StatCard label="Avg position" value={fmtPos(t.position)} delta={<Delta d={d.position} invert />} />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Clicks &amp; impressions</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={CHART_CONFIG} className="aspect-auto h-64 w-full">
                <LineChart data={report.trend} margin={{ left: 4, right: 8, top: 8 }}>
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    minTickGap={32}
                    tickFormatter={(v) => v.slice(5)}
                  />
                  <YAxis tickLine={false} axisLine={false} width={40} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line
                    type="monotone"
                    dataKey="clicks"
                    stroke="var(--color-clicks)"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="impressions"
                    stroke="var(--color-impressions)"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <MetricTable caption="Top queries" label="Query" rows={report.topQueries} keyName="query" />
            <MetricTable caption="Top pages" label="Page" rows={report.topPages} keyName="page" />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Striking-distance opportunities{" "}
                <Badge variant="outline" className="ml-1 align-middle">
                  pos 5–20
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {report.strikingDistance.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No near-page-one queries with meaningful impressions in this range.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Query</TableHead>
                      <TableHead className="text-right">Impr.</TableHead>
                      <TableHead className="text-right">Clicks</TableHead>
                      <TableHead className="text-right">CTR</TableHead>
                      <TableHead className="text-right">Pos.</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.strikingDistance.map((r, i) => (
                      <TableRow key={i}>
                        <TableCell className="max-w-[22rem] truncate font-medium" title={r.query}>
                          {r.query}
                        </TableCell>
                        <TableCell className="text-right">{fmtInt(r.impressions)}</TableCell>
                        <TableCell className="text-right">{fmtInt(r.clicks)}</TableCell>
                        <TableCell className="text-right">{fmtPct(r.ctr)}</TableCell>
                        <TableCell className="text-right font-medium">{fmtPos(r.position)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
