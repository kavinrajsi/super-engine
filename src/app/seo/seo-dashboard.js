"use client";

// Combined okara-style dashboard. Traffic (live GA4 + Search Console, scoped to
// the active site) sits alongside a full on-demand site audit — SEO / Pages /
// Issues / Technical / GEO / Tracking — that mirrors the standalone /scan. The
// audit works on ANY URL (typed in the audit bar or the active site), with or
// without Google connected, and supports deep multi-page scans.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useActiveSite } from "@/components/active-site-provider";
import { ScanContext } from "./scan-context";
import TrafficTab from "./traffic-tab";
import SeoTab from "./seo-tab";
import PagesTab from "./pages-tab";
import LinksTab from "./links-tab";
import TechnicalTab from "./technical-tab";
import GeoTab from "./geo-tab";
import TrackingTab from "./tracking-tab";

const AUDIT_TABS = new Set(["seo", "pages", "links", "technical", "geo", "tracking"]);

// A URL/host reduced to its registrable-ish domain ("example.com"), or null.
function bareDomain(input) {
  if (!input) return null;
  try {
    return new URL(/^https?:\/\//i.test(input) ? input : `https://${input}`).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

// (input) -> a scheme'd, canonical URL string, or null. Local copy so this
// client component doesn't import the server-only @/lib/site/active module.
function toUrl(input) {
  const s = (input || "").trim();
  if (!s) return null;
  try {
    return new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`).toString();
  } catch {
    return null;
  }
}

const gscSiteDomain = (site) =>
  !site ? null : bareDomain(site.startsWith("sc-domain:") ? site.slice("sc-domain:".length) : site);

// Prefer a domain property (sc-domain:) over a URL-prefix one.
function matchGscSite(sites, domain) {
  if (!domain || !sites?.length) return null;
  const matches = sites.filter((s) => gscSiteDomain(s) === domain);
  return matches.find((s) => s.startsWith("sc-domain:")) || matches[0] || null;
}

export default function SeoDashboard({ email, connected = false, initialUrl = "", initialDeep = false }) {
  const { activeSite } = useActiveSite();
  const activeUrl = useMemo(() => toUrl(activeSite?.website_url), [activeSite?.website_url]);
  // A URL passed via ?url= (hero form / nav) takes precedence over the active site.
  const initialTarget = useMemo(() => toUrl(initialUrl), [initialUrl]);

  const [tab, setTab] = useState(initialUrl ? "seo" : connected ? "traffic" : "seo");

  // Audit-bar state: the URL field + deep toggle, and the URL actually audited.
  const [urlInput, setUrlInput] = useState(initialUrl || activeSite?.website_url || "");
  const [deep, setDeep] = useState(!!initialDeep);
  const [target, setTarget] = useState(initialTarget || activeUrl);
  const didInitial = useRef(false);

  // Resolved Google matches for the active site (for the Traffic tab).
  const [gscSites, setGscSites] = useState(null);
  const [gaProps, setGaProps] = useState(null);

  // Shared audit state.
  const [scan, setScan] = useState(null);
  const [status, setStatus] = useState("idle"); // idle|loading|done|error|empty|unsupported
  const [error, setError] = useState(null);
  const [cached, setCached] = useState(false);
  const auditedTarget = useRef(null);

  // When the active site changes, reset the audit bar + target to it — unless a
  // URL was passed in via ?url=, which drives the audit instead.
  useEffect(() => {
    if (initialUrl) return;
    setUrlInput(activeSite?.website_url || "");
    setTarget(activeUrl);
    setScan(null);
    setStatus("idle");
    auditedTarget.current = null;
  }, [activeUrl, activeSite?.website_url, initialUrl]);

  // Load GSC site + GA property lists once, to scope the Traffic tab.
  useEffect(() => {
    if (!connected) return;
    fetch("/api/gsc/sites").then((r) => r.json()).then((j) => setGscSites(j.sites || [])).catch(() => setGscSites([]));
    fetch("/api/ga/properties").then((r) => r.json()).then((j) => setGaProps(j.properties || [])).catch(() => setGaProps([]));
  }, [connected]);

  const targetDomain = useMemo(() => bareDomain(activeUrl), [activeUrl]);
  const matchedSite = useMemo(() => matchGscSite(gscSites, targetDomain), [gscSites, targetDomain]);
  const matchedProperty = useMemo(
    () => gaProps?.find((p) => p.domain && p.domain === targetDomain)?.property || null,
    [gaProps, targetDomain]
  );
  const gscNoMatch = gscSites !== null && !matchedSite;
  const gaNoMatch = gaProps !== null && !matchedProperty;

  const runAudit = useCallback(async (t, { full = false, force = false, deepScan = false } = {}) => {
    if (!t) {
      setStatus("empty");
      return;
    }
    setStatus("loading");
    setError(null);
    try {
      const params = new URLSearchParams({ url: t });
      if (full) params.set("full", "1");
      if (deepScan) params.set("deep", "1");
      if (force) params.set("force", "1");
      const r = await fetch(`/api/seo/audit?${params.toString()}`);
      const j = await r.json();
      if (j.error) {
        setStatus("error");
        setError(j.error === "unauthorized" ? "Sign in to run audits." : j.error);
        return;
      }
      setScan(j.result);
      setCached(!!j.cached);
      setStatus("done");
      auditedTarget.current = t;
    } catch (e) {
      setStatus("error");
      setError(e.message);
    }
  }, []);

  // Lazily audit when an audit tab opens for a new target. A URL arriving via
  // ?url= gets a full (optionally deep) scan once; otherwise a cheap single page.
  useEffect(() => {
    if (!AUDIT_TABS.has(tab)) return;
    if (status === "loading") return;
    if (!target) {
      setStatus("empty");
      return;
    }
    if (scan && auditedTarget.current === target) return;
    const full = !!initialTarget && initialTarget === target && !didInitial.current;
    if (full) didInitial.current = true;
    runAudit(target, { full, force: false, deepScan: full ? !!initialDeep : false });
  }, [tab, target, scan, status, runAudit, initialTarget, initialDeep]);

  function onRun(e) {
    e?.preventDefault?.();
    const t = toUrl(urlInput);
    if (!t) {
      setStatus("error");
      setError("Enter a valid site URL.");
      return;
    }
    setTarget(t);
    runAudit(t, { full: true, force: true, deepScan: deep });
  }

  const rescan = useCallback(
    () => target && runAudit(target, { full: true, force: true, deepScan: deep }),
    [target, deep, runAudit]
  );

  const ctx = { scan, status, error, cached, rescan };

  const showAuditTools = AUDIT_TABS.has(tab);

  return (
    <Tabs value={tab} onValueChange={setTab} className="w-full">
      <TabsList>
        <TabsTrigger value="traffic">Traffic</TabsTrigger>
        <TabsTrigger value="seo">SEO</TabsTrigger>
        <TabsTrigger value="pages">Pages</TabsTrigger>
        <TabsTrigger value="links">Links</TabsTrigger>
        <TabsTrigger value="technical">Technical</TabsTrigger>
        <TabsTrigger value="geo">GEO</TabsTrigger>
        <TabsTrigger value="tracking">Tracking</TabsTrigger>
      </TabsList>

      {/* Audit bar — type any URL, optionally deep-scan, and run. */}
      {showAuditTools && (
        <div className="mt-4 space-y-1.5">
          <form
            onSubmit={onRun}
            className="flex flex-wrap items-center gap-2 rounded-lg border bg-card p-3 shadow-sm"
          >
            <Input
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="yourdomain.com"
              aria-label="Site URL to audit"
              inputMode="url"
              aria-invalid={status === "error" || undefined}
              className="h-9 min-w-[12rem] flex-1 font-mono text-sm"
            />
            <Label className="flex cursor-pointer items-center gap-2 text-sm font-normal text-muted-foreground">
              <Checkbox checked={deep} onCheckedChange={(v) => setDeep(!!v)} />
              Deep scan
            </Label>
            <Button
              type="submit"
              size="lg"
              disabled={status === "loading"}
              className="shrink-0 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {status === "loading" ? "Auditing…" : "Run audit"}
            </Button>
          </form>
          {status === "error" && error && (
            <p className="px-1 text-sm text-error">{error}</p>
          )}
          {status === "loading" && (
            <div className="overflow-hidden rounded-full bg-border" style={{ height: "2px" }}>
              <div
                className="audit-progress-bar h-full w-1/3 rounded-full bg-primary"
                style={{ animation: "madrank-progress 1.4s ease-in-out infinite" }}
              />
            </div>
          )}
        </div>
      )}

      <ScanContext.Provider value={ctx}>
        <TabsContent value="traffic" className="pt-4">
          <TrafficTab
            email={email}
            connected={connected}
            domain={targetDomain}
            site={matchedSite}
            property={matchedProperty}
            gscNoMatch={gscNoMatch}
            gaNoMatch={gaNoMatch}
          />
        </TabsContent>
        <TabsContent value="seo" className="pt-4"><SeoTab /></TabsContent>
        <TabsContent value="pages" className="pt-4"><PagesTab /></TabsContent>
        <TabsContent value="links" className="pt-4"><LinksTab /></TabsContent>
        <TabsContent value="technical" className="pt-4"><TechnicalTab /></TabsContent>
        <TabsContent value="geo" className="pt-4"><GeoTab /></TabsContent>
        <TabsContent value="tracking" className="pt-4"><TrackingTab /></TabsContent>
      </ScanContext.Provider>
    </Tabs>
  );
}
