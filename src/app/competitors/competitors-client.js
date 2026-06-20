"use client";

// Find-competitors UI: a domain input (prefilled from the connected GSC site),
// a button that discovers competitors on demand, and a selectable list that
// deep-links into /compare. Discovery is paid, so it only runs on click.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const MAX_SELECT = 3; // /compare takes the target + up to 3 competitors

// Reduce any URL/host/GSC-property string to a bare host.
function toHost(s) {
  if (!s) return "";
  let v = s.replace(/^sc-domain:/, "").trim();
  try {
    v = new URL(/^https?:\/\//i.test(v) ? v : `https://${v}`).hostname;
  } catch {
    /* leave as-is */
  }
  return v.replace(/^www\./, "");
}

export default function CompetitorsClient() {
  const router = useRouter();
  const [domain, setDomain] = useState("");
  const [status, setStatus] = useState("idle"); // idle|loading|done|error|unconfigured
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(() => new Set());

  // Prefill from the connected GSC property (first site), if any.
  useEffect(() => {
    fetch("/api/gsc/sites")
      .then((r) => r.json())
      .then((j) => {
        const first = (j.sites || [])[0];
        if (first) setDomain(toHost(first));
      })
      .catch(() => {});
  }, []);

  async function find() {
    const host = toHost(domain);
    if (!host) return;
    setStatus("loading");
    setError(null);
    setSelected(new Set());
    try {
      const r = await fetch(`/api/seo/competitors?url=${encodeURIComponent(host)}`);
      const j = await r.json();
      if (j.error) {
        setStatus("error");
        setError(j.error);
        return;
      }
      if (!j.configured) {
        setStatus("unconfigured");
        return;
      }
      setData(j);
      setStatus("done");
    } catch (e) {
      setStatus("error");
      setError(e.message);
    }
  }

  function toggle(host) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(host)) next.delete(host);
      else if (next.size < MAX_SELECT) next.add(host);
      return next;
    });
  }

  function compareSelected() {
    const target = toHost(domain);
    const params = new URLSearchParams();
    params.append("url", target);
    for (const h of selected) params.append("url", h);
    router.push(`/compare?${params.toString()}`);
  }

  const competitors = data?.competitors || [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          type="text"
          inputMode="url"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          placeholder="yourdomain.com"
          aria-label="Your domain"
          className="h-10 max-w-xs"
        />
        <Button onClick={find} disabled={!domain.trim() || status === "loading"}>
          {status === "loading" ? "Finding…" : "Find competitors"}
        </Button>
        {data?.cached && <span className="text-xs text-muted-foreground">cached</span>}
      </div>

      {status === "error" && (
        <p className="rounded-md border border-error/40 bg-error/10 px-3 py-2 text-sm text-error">{error}</p>
      )}

      {status === "unconfigured" && (
        <Card>
          <CardContent className="space-y-1 py-6 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">Discovery isn&rsquo;t configured</p>
            <p>
              Set <code className="font-mono">DATAFORSEO_LOGIN</code>/<code className="font-mono">DATAFORSEO_PASSWORD</code>{" "}
              and/or <code className="font-mono">AI_GATEWAY_API_KEY</code> to auto-discover competitors.
            </p>
          </CardContent>
        </Card>
      )}

      {status === "done" && (
        <Card>
          <CardContent className="space-y-3 py-4">
            {competitors.length === 0 ? (
              <p className="text-sm text-muted-foreground">No competitors found for {data.target}.</p>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    {competitors.length} competitor(s) for <span className="font-medium text-foreground">{data.target}</span>
                  </p>
                  <Button size="sm" onClick={compareSelected} disabled={selected.size === 0}>
                    Compare {selected.size > 0 ? `(${selected.size})` : "these"}
                  </Button>
                </div>
                <ul className="divide-y">
                  {competitors.map((c) => (
                    <li key={c.domain} className="flex items-center gap-3 py-2">
                      <input
                        type="checkbox"
                        checked={selected.has(c.domain)}
                        onChange={() => toggle(c.domain)}
                        disabled={!selected.has(c.domain) && selected.size >= MAX_SELECT}
                        aria-label={`Select ${c.domain}`}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium">{c.domain}</div>
                        {c.name && <div className="truncate text-xs text-muted-foreground">{c.name}</div>}
                      </div>
                      {c.commonKeywords != null && (
                        <span className="shrink-0 text-xs text-muted-foreground">{c.commonKeywords} shared kw</span>
                      )}
                      <div className="flex shrink-0 gap-1">
                        {(c.sources || []).map((s) => (
                          <Badge key={s} variant="outline" className="text-[10px] uppercase">
                            {s === "serp" ? "SERP" : "AI"}
                          </Badge>
                        ))}
                      </div>
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-muted-foreground">
                  Select up to {MAX_SELECT} to benchmark them head-to-head.
                </p>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
