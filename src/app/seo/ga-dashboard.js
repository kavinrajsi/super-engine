"use client";

// Connected Google Analytics (GA4) view: property + date-range selectors,
// summary cards with period-over-period deltas, a users/sessions trend, and top
// pages / channels / countries. Mirrors the Search Console dashboard.

import { useEffect, useState } from "react";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  activeUsers: { label: "Users", color: "var(--primary)" },
  sessions: { label: "Sessions", color: "var(--info)" },
};

const nf = new Intl.NumberFormat("en-US");
const fmtInt = (n) => nf.format(Math.round(n || 0));
const fmtPct = (n) => `${((n || 0) * 100).toFixed(1)}%`;
// GA returns averageSessionDuration in seconds.
const fmtDuration = (s) => {
  const n = Math.round(s || 0);
  const m = Math.floor(n / 60);
  const sec = n % 60;
  return `${m}m ${String(sec).padStart(2, "0")}s`;
};

function shortUrl(u) {
  if (!u) return u;
  return u.length > 48 ? `${u.slice(0, 47)}…` : u;
}

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

// A simple two-metric table (key + value columns) for pages/channels/countries.
function TopTable({ caption, label, rows, keyName, metricKey, metricLabel }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{caption}</CardTitle>
      </CardHeader>
      <CardContent>
        {(!rows || rows.length === 0) ? (
          <p className="text-sm text-muted-foreground">No data for this range.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{label}</TableHead>
                <TableHead className="text-right">{metricLabel}</TableHead>
                <TableHead className="text-right">Users</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r, i) => (
                <TableRow key={i}>
                  <TableCell className="max-w-[22rem] truncate font-medium" title={r.key}>
                    {keyName === "page" ? shortUrl(r.key) : r.key || "(not set)"}
                  </TableCell>
                  <TableCell className="text-right">{fmtInt(r[metricKey])}</TableCell>
                  <TableCell className="text-right">{fmtInt(r.activeUsers)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

export default function GaDashboard({ email }) {
  const [props, setProps] = useState(null); // null = loading
  const [property, setProperty] = useState("");
  const [days, setDays] = useState(28);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load the property list once.
  useEffect(() => {
    fetch("/api/ga/properties")
      .then((r) => r.json())
      .then((j) => {
        if (j.error) throw new Error(j.error);
        setProps(j.properties || []);
        setProperty((j.properties || [])[0]?.property || "");
      })
      .catch((e) => {
        setProps([]);
        setError(e.message);
      });
  }, []);

  // Fetch the report whenever the property or range changes.
  useEffect(() => {
    if (!property) return;
    setLoading(true);
    setError(null);
    fetch(`/api/ga/report?property=${encodeURIComponent(property)}&days=${days}`)
      .then((r) => r.json())
      .then((j) => {
        if (j.error) throw new Error(j.error);
        setReport(j);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [property, days]);

  const t = report?.totals;
  const d = report?.deltas;

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={property}
          onChange={(e) => setProperty(e.target.value)}
          className="h-9 max-w-[20rem] rounded-md border bg-background px-3 text-sm"
          disabled={!props || props.length === 0}
        >
          {props === null && <option>Loading properties…</option>}
          {props?.length === 0 && <option>No GA4 properties found</option>}
          {props?.map((p) => (
            <option key={p.property} value={p.property}>
              {p.displayName}
              {p.account ? ` — ${p.account}` : ""}
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

        {email && (
          <span className="ml-auto hidden text-xs text-muted-foreground sm:inline">
            Connected as {email}
          </span>
        )}
      </div>

      {error && (
        <p className="rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-warning">
          {error}
        </p>
      )}

      {loading && !report && <p className="text-sm text-muted-foreground">Loading Analytics data…</p>}

      {report && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <StatCard label="Active users" value={fmtInt(t.activeUsers)} delta={<Delta d={d.activeUsers} />} />
            <StatCard label="Sessions" value={fmtInt(t.sessions)} delta={<Delta d={d.sessions} />} />
            <StatCard label="Pageviews" value={fmtInt(t.screenPageViews)} delta={<Delta d={d.screenPageViews} />} />
            <StatCard label="Engagement" value={fmtPct(t.engagementRate)} delta={<Delta d={d.engagementRate} percent />} />
            <StatCard label="Avg session" value={fmtDuration(t.averageSessionDuration)} delta={<Delta d={d.averageSessionDuration} />} />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Users &amp; sessions</CardTitle>
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
                    tickFormatter={(v) => (v || "").slice(5)}
                  />
                  <YAxis tickLine={false} axisLine={false} width={40} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line type="monotone" dataKey="activeUsers" stroke="var(--color-activeUsers)" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="sessions" stroke="var(--color-sessions)" strokeWidth={2} dot={false} />
                </LineChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <TopTable
              caption="Top pages"
              label="Page"
              rows={report.topPages}
              keyName="page"
              metricKey="screenPageViews"
              metricLabel="Views"
            />
            <TopTable
              caption="Top channels"
              label="Channel"
              rows={report.topChannels}
              keyName="channel"
              metricKey="sessions"
              metricLabel="Sessions"
            />
          </div>

          <TopTable
            caption="Top countries"
            label="Country"
            rows={report.topCountries}
            keyName="country"
            metricKey="activeUsers"
            metricLabel="Users"
          />
        </>
      )}
    </div>
  );
}
