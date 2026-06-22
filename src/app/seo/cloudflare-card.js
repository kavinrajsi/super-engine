"use client";

// Cloudflare analytics card for the Traffic tab: connect a read-only Analytics
// token once, then show Web Analytics (RUM) + zone HTTP traffic for the active
// site's zone. Token is verified + stored encrypted server-side (never here).

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const nf = new Intl.NumberFormat("en-US");
const fmtInt = (n) => (n == null ? "—" : nf.format(Math.round(n)));
const fmtPct = (n) => (n == null ? "—" : `${(n * 100).toFixed(0)}%`);
function fmtBytes(n) {
  if (n == null) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1048576) return `${Math.round(n / 1024)} KB`;
  if (n < 1073741824) return `${(n / 1048576).toFixed(1)} MB`;
  return `${(n / 1073741824).toFixed(2)} GB`;
}

function Stat({ label, value, sub }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-bold tabular-nums">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}

export default function CloudflareCard({ domain }) {
  const [connected, setConnected] = useState(null); // null = loading
  const [token, setToken] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [report, setReport] = useState(null);
  const [loadingReport, setLoadingReport] = useState(false);

  useEffect(() => {
    fetch("/api/cloudflare/settings")
      .then((r) => r.json())
      .then((j) => setConnected(!!j.connected))
      .catch(() => setConnected(false));
  }, []);

  const loadReport = useCallback(() => {
    if (!domain) return;
    setLoadingReport(true);
    fetch(`/api/cloudflare/report?url=${encodeURIComponent(domain)}`)
      .then((r) => r.json())
      .then((j) => setReport(j))
      .catch((e) => setReport({ error: e.message }))
      .finally(() => setLoadingReport(false));
  }, [domain]);

  useEffect(() => {
    if (connected && domain) loadReport();
  }, [connected, domain, loadReport]);

  async function connect() {
    if (!token.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/cloudflare/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: token.trim() }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Couldn't connect.");
      setToken("");
      setConnected(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function disconnect() {
    await fetch("/api/cloudflare/settings", { method: "DELETE" }).catch(() => {});
    setConnected(false);
    setReport(null);
  }

  if (connected === null) return null; // initial load

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle className="text-base">Cloudflare</CardTitle>
        {connected && (
          <Button variant="ghost" size="xs" onClick={disconnect}>
            Disconnect
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {!connected ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Connect a Cloudflare <span className="font-medium text-foreground">read-only</span> API
              token to see Web Analytics + zone traffic (cache ratio, bot/threat traffic). Create one
              with <span className="font-mono text-xs">Account Analytics: Read</span> +{" "}
              <span className="font-mono text-xs">Zone Analytics: Read</span> at{" "}
              <a
                href="https://dash.cloudflare.com/profile/api-tokens"
                target="_blank"
                rel="noreferrer"
                className="underline"
              >
                Cloudflare → API Tokens
              </a>
              .
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Input
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Cloudflare API token"
                className="h-9 min-w-[14rem] flex-1 font-mono text-sm"
              />
              <Button size="sm" onClick={connect} disabled={saving || !token.trim()}>
                {saving ? "Verifying…" : "Connect"}
              </Button>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        ) : loadingReport ? (
          <p className="text-sm text-muted-foreground">Loading Cloudflare data…</p>
        ) : report?.error ? (
          <p className="text-sm text-destructive">{report.error}</p>
        ) : report && report.zoneFound === false ? (
          <p className="text-sm text-muted-foreground">
            No active Cloudflare zone found for <span className="font-medium">{domain}</span> on this
            account.
          </p>
        ) : report ? (
          <div className="space-y-4">
            <div className="text-xs text-muted-foreground">
              Zone <span className="font-medium text-foreground">{report.zone?.name}</span> · last{" "}
              {report.days} days
            </div>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
              <Stat label="Page views" value={fmtInt(report.webAnalytics?.totals?.pageViews)} sub="Web Analytics (RUM)" />
              <Stat label="Visits" value={fmtInt(report.webAnalytics?.totals?.visits)} sub="Web Analytics (RUM)" />
              <Stat label="Requests" value={fmtInt(report.zoneHttp?.totals?.requests)} sub="zone HTTP" />
              <Stat label="Cache ratio" value={fmtPct(report.zoneHttp?.totals?.cacheRatio)} sub="cached / total" />
              <Stat label="Threats" value={fmtInt(report.zoneHttp?.totals?.threats)} sub="blocked" />
              <Stat label="Bandwidth" value={fmtBytes(report.zoneHttp?.totals?.bytes)} sub="served" />
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
