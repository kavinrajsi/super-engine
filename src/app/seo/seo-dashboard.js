"use client";

// Combined okara-style dashboard: one unified Google connection powers five tabs
// — Traffic (live GA4 + Search Console) and SEO / Links / Technical / GEO (an
// on-demand single-page audit of the selected Search Console property). The
// audit runs lazily the first time a non-Traffic tab is viewed and is shared
// across those tabs via ScanContext (one scan per selected site).

import { useCallback, useEffect, useRef, useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ScanContext } from "./scan-context";
import TrafficTab from "./traffic-tab";
import SeoTab from "./seo-tab";
import LinksTab from "./links-tab";
import TechnicalTab from "./technical-tab";
import GeoTab from "./geo-tab";

const AUDIT_TABS = new Set(["seo", "links", "technical", "geo"]);

// Friendly label for a GSC property string.
function siteLabel(site) {
  if (!site) return site;
  return site.startsWith("sc-domain:") ? `${site.slice("sc-domain:".length)} (domain)` : site;
}

export default function SeoDashboard({ email }) {
  const [tab, setTab] = useState("traffic");

  // Shared property selector — Search Console sites are the audit URL source.
  const [sites, setSites] = useState(null); // null = loading
  const [site, setSite] = useState("");

  // Shared audit state.
  const [scan, setScan] = useState(null);
  const [status, setStatus] = useState("idle"); // idle|loading|done|error|unsupported
  const [error, setError] = useState(null);
  const [cached, setCached] = useState(false);
  const auditedSite = useRef(null);

  useEffect(() => {
    fetch("/api/gsc/sites")
      .then((r) => r.json())
      .then((j) => {
        const list = j.sites || [];
        setSites(list);
        setSite(list[0] || "");
      })
      .catch(() => setSites([]));
  }, []);

  const runAudit = useCallback(
    async (force = false) => {
      if (!site) {
        setStatus("unsupported");
        return;
      }
      setStatus("loading");
      setError(null);
      try {
        const r = await fetch(`/api/seo/audit?site=${encodeURIComponent(site)}${force ? "&force=1" : ""}`);
        const j = await r.json();
        if (j.error) {
          setStatus(j.error === "no_url_for_ga_property" ? "unsupported" : "error");
          setError(j.error === "not_connected" ? "Reconnect your Google account." : j.error);
          return;
        }
        setScan(j.result);
        setCached(!!j.cached);
        setStatus("done");
        auditedSite.current = site;
      } catch (e) {
        setStatus("error");
        setError(e.message);
      }
    },
    [site]
  );

  // Lazily audit when an audit-backed tab is active and the current scan doesn't
  // match the selected site. Switching among audit tabs reuses the same result.
  useEffect(() => {
    if (!AUDIT_TABS.has(tab)) return;
    if (sites === null) return; // wait for the site list
    if (status === "loading") return;
    if (scan && auditedSite.current === site) return;
    runAudit(false);
  }, [tab, site, sites, scan, status, runAudit]);

  const rescan = useCallback(() => runAudit(true), [runAudit]);

  const ctx = { scan, status, error, cached, rescan };

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

        {/* Audited-site selector — only relevant for the non-Traffic tabs. */}
        {AUDIT_TABS.has(tab) && (
          <div className="flex items-center gap-2">
            <select
              value={site}
              onChange={(e) => setSite(e.target.value)}
              className="h-9 max-w-[18rem] rounded-md border bg-background px-3 text-sm"
              disabled={!sites || sites.length === 0}
            >
              {sites === null && <option>Loading sites…</option>}
              {sites?.length === 0 && <option>No Search Console sites</option>}
              {sites?.map((s) => (
                <option key={s} value={s}>
                  {siteLabel(s)}
                </option>
              ))}
            </select>
            <Button variant="outline" size="sm" onClick={rescan} disabled={!site || status === "loading"}>
              {status === "loading" ? "Auditing…" : "Re-scan"}
            </Button>
          </div>
        )}
      </div>

      <ScanContext.Provider value={ctx}>
        <TabsContent value="traffic" className="pt-4">
          <TrafficTab />
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
