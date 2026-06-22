"use client";

// Combined okara-style dashboard, scoped to the ACTIVE SITE (the brand profile
// selected in the sidebar Site Switcher). One unified Google connection powers
// five tabs — Traffic (live GA4 + Search Console) and SEO / Links / Technical /
// GEO (an on-demand single-page audit). Every widget is locked to the active
// site's domain: we match the active site to a Search Console property + GA4
// property once here and pass those down, instead of each widget auto-picking
// "the first one". When no Google property matches, the widget shows a notice
// rather than another site's data. The audit scans the active site URL directly.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useActiveSite } from "@/components/active-site-provider";
import { ScanContext } from "./scan-context";
import TrafficTab from "./traffic-tab";
import SeoTab from "./seo-tab";
import LinksTab from "./links-tab";
import TechnicalTab from "./technical-tab";
import GeoTab from "./geo-tab";

const AUDIT_TABS = new Set(["seo", "links", "technical", "geo"]);

// A URL/host reduced to its registrable-ish domain ("example.com"), or null.
function bareDomain(input) {
  if (!input) return null;
  try {
    return new URL(/^https?:\/\//i.test(input) ? input : `https://${input}`).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

// The domain a Search Console property covers: "sc-domain:example.com" and
// "https://www.example.com/" both reduce to "example.com".
function gscSiteDomain(site) {
  if (!site) return null;
  return bareDomain(site.startsWith("sc-domain:") ? site.slice("sc-domain:".length) : site);
}

// Pick the GSC property matching the target domain. Prefer a domain property
// (sc-domain:) over a URL-prefix one — it covers http/https + all subpaths.
function matchGscSite(sites, domain) {
  if (!domain || !sites?.length) return null;
  const matches = sites.filter((s) => gscSiteDomain(s) === domain);
  return matches.find((s) => s.startsWith("sc-domain:")) || matches[0] || null;
}

export default function SeoDashboard({ email }) {
  const { activeSite } = useActiveSite();
  const targetUrl = activeSite?.website_url || null;
  const targetDomain = useMemo(() => bareDomain(targetUrl), [targetUrl]);
  // The audit's siteUrlForScan only accepts a scheme'd URL; profiles often store
  // a schemeless host ("example.com"), so add https:// before scanning.
  const auditUrl = useMemo(
    () => (!targetUrl ? null : /^https?:\/\//i.test(targetUrl) ? targetUrl : `https://${targetUrl}`),
    [targetUrl]
  );

  const [tab, setTab] = useState("traffic");

  // Resolved Google matches for the active site (fetched once).
  const [gscSites, setGscSites] = useState(null); // null = loading
  const [gaProps, setGaProps] = useState(null); // null = loading

  // Shared audit state — the audit scans the active site URL directly.
  const [scan, setScan] = useState(null);
  const [status, setStatus] = useState("idle"); // idle|loading|done|error|unsupported
  const [error, setError] = useState(null);
  const [cached, setCached] = useState(false);
  const auditedUrl = useRef(null);

  // Load the GSC site list + GA property list once, to match the active site.
  useEffect(() => {
    fetch("/api/gsc/sites")
      .then((r) => r.json())
      .then((j) => setGscSites(j.sites || []))
      .catch(() => setGscSites([]));
    fetch("/api/ga/properties")
      .then((r) => r.json())
      .then((j) => setGaProps(j.properties || []))
      .catch(() => setGaProps([]));
  }, []);

  const matchedSite = useMemo(() => matchGscSite(gscSites, targetDomain), [gscSites, targetDomain]);
  const matchedProperty = useMemo(
    () => gaProps?.find((p) => p.domain && p.domain === targetDomain)?.property || null,
    [gaProps, targetDomain]
  );
  const gscNoMatch = gscSites !== null && !matchedSite;
  const gaNoMatch = gaProps !== null && !matchedProperty;

  const runAudit = useCallback(
    async (force = false) => {
      if (!auditUrl) {
        setStatus("unsupported");
        return;
      }
      setStatus("loading");
      setError(null);
      try {
        const r = await fetch(
          `/api/seo/audit?site=${encodeURIComponent(auditUrl)}${force ? "&force=1" : ""}`
        );
        const j = await r.json();
        if (j.error) {
          setStatus(j.error === "no_url_for_ga_property" ? "unsupported" : "error");
          setError(j.error === "not_connected" ? "Reconnect your Google account." : j.error);
          return;
        }
        setScan(j.result);
        setCached(!!j.cached);
        setStatus("done");
        auditedUrl.current = auditUrl;
      } catch (e) {
        setStatus("error");
        setError(e.message);
      }
    },
    [auditUrl]
  );

  // Lazily audit when an audit-backed tab is active and the current scan doesn't
  // match the active site. Switching among audit tabs reuses the same result.
  useEffect(() => {
    if (!AUDIT_TABS.has(tab)) return;
    if (!auditUrl) return;
    if (status === "loading") return;
    if (scan && auditedUrl.current === auditUrl) return;
    runAudit(false);
  }, [tab, auditUrl, scan, status, runAudit]);

  const rescan = useCallback(() => runAudit(true), [runAudit]);

  const ctx = { scan, status, error, cached, rescan };

  // No active site, or one without a URL: scope is undefined, so guide the user
  // instead of showing another site's data.
  if (!activeSite) {
    return (
      <Card>
        <CardContent className="flex flex-col items-start gap-3 py-6 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">No active site selected.</p>
          <p>Pick a site from the sidebar, or create one to scope these insights to it.</p>
          <Link href="/profiles" className="text-primary underline-offset-4 hover:underline">
            Manage sites
          </Link>
        </CardContent>
      </Card>
    );
  }
  if (!targetDomain) {
    return (
      <Card>
        <CardContent className="flex flex-col items-start gap-3 py-6 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">
            “{activeSite.name}” has no website URL.
          </p>
          <p>Add a website URL to this site so we can match its Search Console and Analytics data.</p>
          <Link href="/profiles" className="text-primary underline-offset-4 hover:underline">
            Edit site
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Tabs value={tab} onValueChange={setTab} className="w-full">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <TabsList>
          <TabsTrigger value="traffic">Traffic</TabsTrigger>
          <TabsTrigger value="seo">SEO</TabsTrigger>
          <TabsTrigger value="links">Links</TabsTrigger>
          <TabsTrigger value="technical">Technical</TabsTrigger>
          <TabsTrigger value="geo">GEO</TabsTrigger>
        </TabsList>

        {/* Locked to the active site — no per-widget property picker. */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            Showing <span className="font-medium text-foreground">{targetDomain}</span>
          </span>
          {AUDIT_TABS.has(tab) && (
            <Button variant="outline" size="sm" onClick={rescan} disabled={status === "loading"}>
              {status === "loading" ? "Auditing…" : "Re-scan"}
            </Button>
          )}
        </div>
      </div>

      <ScanContext.Provider value={ctx}>
        <TabsContent value="traffic" className="pt-4">
          <TrafficTab
            email={email}
            domain={targetDomain}
            site={matchedSite}
            property={matchedProperty}
            gscNoMatch={gscNoMatch}
            gaNoMatch={gaNoMatch}
          />
        </TabsContent>
        <TabsContent value="seo" className="pt-4">
          <SeoTab />
        </TabsContent>
        <TabsContent value="links" className="pt-4">
          <LinksTab />
        </TabsContent>
        <TabsContent value="technical" className="pt-4">
          <TechnicalTab />
        </TabsContent>
        <TabsContent value="geo" className="pt-4">
          <GeoTab />
        </TabsContent>
      </ScanContext.Provider>
    </Tabs>
  );
}
