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

export default function Gsc404Urls({ site }) {
  const [status, setStatus] = useState("idle"); // idle | checking | ready | loading | done | error
  const [urls404, setUrls404] = useState([]);
  const [sampled, setSampled] = useState(0);
  const [cached, setCached] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!site) return;
    setStatus("checking");
    setUrls404([]);
    fetch(`/api/gsc/indexing?site=${encodeURIComponent(site)}&check=1`)
      .then((r) => r.json())
      .then((j) => setStatus(j.configured ? "ready" : "idle"))
      .catch(() => setStatus("idle"));
  }, [site]);

  function load(force = false) {
    setStatus("loading");
    setError(null);
    fetch(`/api/gsc/indexing?site=${encodeURIComponent(site)}${force ? "&force=1" : ""}`)
      .then((r) => r.json())
      .then((j) => {
        if (j.error) { setError(j.error); setStatus("error"); return; }
        const found = (j.inspections || []).filter((i) => i.reason === "Not found (404)");
        setUrls404(found);
        setSampled(j.summary?.total || 0);
        setCached(!!j.cached);
        setStatus("done");
      })
      .catch((e) => { setError(e.message); setStatus("error"); });
  }

  if (status === "idle" || status === "checking") return null;

  if (status === "ready" || (status === "loading" && urls404.length === 0)) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Not found (404) URLs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Find pages Google tried to crawl but got a 404 response. Samples up to 50 URLs from
            your sitemap via the URL Inspection API (results cached 24h).
          </p>
          <Button size="sm" onClick={() => load(false)} disabled={status === "loading"}>
            {status === "loading" ? "Checking URLs…" : "Find 404 URLs"}
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (status === "error") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Not found (404) URLs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-error">{error || "Failed to load indexing data."}</p>
          <Button size="sm" variant="outline" onClick={() => load(false)}>Retry</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2">
        <CardTitle className="text-base">Not found (404) URLs</CardTitle>
        {urls404.length > 0 && (
          <Badge variant="destructive" className="text-xs">{urls404.length}</Badge>
        )}
        {cached && (
          <Badge variant="outline" className="text-xs font-normal">cached</Badge>
        )}
        <Button size="sm" variant="ghost" className="ml-auto text-xs" onClick={() => load(true)}>
          Refresh
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {urls404.length === 0 ? (
          <p className="text-sm font-medium text-pass">
            No 404s found among {sampled} sampled URLs ✓
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>URL</TableHead>
                <TableHead>Last crawled</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {urls404.map((row, i) => (
                <TableRow key={i}>
                  <TableCell className="font-mono text-xs" title={row.url}>
                    <a
                      href={row.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline break-all"
                    >
                      {row.url}
                    </a>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                    {row.lastCrawlTime
                      ? new Date(row.lastCrawlTime).toLocaleDateString()
                      : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        <p className="text-xs text-muted-foreground">
          Based on {sampled} URLs sampled from your sitemap
        </p>
      </CardContent>
    </Card>
  );
}
