"use client";

// Traffic tab — the okara "how people found you" funnel + channel mix on top of
// the full GA4 and Search Console dashboards. Everything is scoped to the active
// site: the parent resolves the matching GSC `site` + GA `property` and passes
// them in, so the funnel and both dashboards show only that site's data (or a
// notice when no property matches).

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import GaDashboard from "./ga-dashboard";
import GscDashboard from "./gsc-dashboard";
import CloudflareCard from "./cloudflare-card";

const nf = new Intl.NumberFormat("en-US");
const fmtInt = (n) => (n == null ? "—" : nf.format(Math.round(n)));
const fmtPct = (n) => (n == null ? "—" : `${(n * 100).toFixed(1)}%`);

function FunnelStage({ stage, prev }) {
  const rate = prev?.value && stage.value != null ? stage.value / prev.value : null;
  return (
    <div className="flex-1">
      {prev && (
        <div className="mb-1 text-center text-xs text-muted-foreground">
          {rate == null ? "" : `↓ ${(rate * 100).toFixed(1)}%`}
        </div>
      )}
      <Card>
        <CardContent className="py-4 text-center">
          <div className="text-xs text-muted-foreground">{stage.label}</div>
          <div className="mt-1 text-2xl font-bold">{fmtInt(stage.value)}</div>
        </CardContent>
      </Card>
    </div>
  );
}

function FunnelCard({ funnel }) {
  if (!funnel?.stages?.length) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">How people found you</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          {funnel.stages.map((s, i) => (
            <FunnelStage key={s.key} stage={s} prev={i > 0 ? funnel.stages[i - 1] : null} />
          ))}
        </div>

        {funnel.channels?.length > 0 && (
          <div className="space-y-2 pt-2">
            <div className="text-sm font-medium text-muted-foreground">Where they came from</div>
            {funnel.channels.slice(0, 6).map((c) => (
              <div key={c.name} className="flex items-center gap-3 text-sm">
                <span className="w-32 truncate" title={c.name}>{c.name}</span>
                <div className="h-2 flex-1 rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${Math.round(c.share * 100)}%` }} />
                </div>
                <span className="w-12 text-right tabular-nums text-muted-foreground">{fmtPct(c.share)}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function TrafficTab({ email, connected, domain, site, property, gscNoMatch, gaNoMatch }) {
  const [funnel, setFunnel] = useState(null);

  // Scope the funnel to the active-site match. Skip the call entirely when
  // neither half matched — nothing to show.
  useEffect(() => {
    setFunnel(null);
    if (!site && !property) return;
    const params = new URLSearchParams({ days: "28" });
    if (site) params.set("site", site);
    if (property) params.set("property", property);
    fetch(`/api/seo/funnel?${params}`)
      .then((r) => r.json())
      .then((j) => {
        if (!j.error) setFunnel(j.funnel);
      })
      .catch(() => {});
  }, [site, property]);

  return (
    <div className="space-y-8">
      {/* Cloudflare is its own (token) connection — show it regardless of Google. */}
      <CloudflareCard domain={domain} />

      {!connected ? (
        <Card>
          <CardContent className="flex flex-col items-start gap-3 py-6">
            <p className="text-sm text-muted-foreground">
              Connect Google to see your Analytics traffic and Search Console queries, pages, and
              ranking opportunities. The audit tabs work without it.
            </p>
            <a href="/api/gsc/auth" className={buttonVariants({ size: "lg" })}>
              Connect Google
            </a>
          </CardContent>
        </Card>
      ) : (
        <>
          <FunnelCard funnel={funnel} />

          <section className="space-y-4">
            <h2 className="text-lg font-semibold">Search Console</h2>
            <GscDashboard email={email} domain={domain} site={site} noMatch={gscNoMatch} />
          </section>

          <section className="space-y-4">
            <h2 className="text-lg font-semibold">Analytics</h2>
            <GaDashboard email={email} domain={domain} property={property} noMatch={gaNoMatch} />
          </section>
        </>
      )}
    </div>
  );
}
