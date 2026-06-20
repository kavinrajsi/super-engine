"use client";

// Links tab — internal/external link profile + a sampled broken-link check
// (status per probed link, from signals.linkSample).

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import ScanGate from "./scan-gate";
import { useScan } from "./scan-context";

function rootPageOf(scan) {
  if (!scan?.pages?.length) return null;
  return scan.pages.find((p) => p.url === scan.rootUrl && p.signals) || scan.pages.find((p) => p.signals) || null;
}

function StatCard({ label, value }) {
  return (
    <Card>
      <CardContent className="py-4">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="mt-1 text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}

function shortUrl(u) {
  try {
    const x = new URL(u);
    return x.host + (x.pathname === "/" ? "" : x.pathname);
  } catch {
    return u;
  }
}

export default function LinksTab() {
  const { scan } = useScan() || {};
  const page = rootPageOf(scan);
  const links = page?.signals?.links;
  const oq = page?.signals?.outboundQuality;
  // Prefer the site-wide link health; fall back to the root page's sample.
  const sample = scan?.linkHealth?.sample || page?.signals?.linkSample || [];
  const broken = sample.filter((r) => !r.ok);

  return (
    <ScanGate>
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Total links" value={links?.total ?? "—"} />
          <StatCard label="Internal" value={links?.internal ?? "—"} />
          <StatCard label="External" value={links?.external ?? "—"} />
          <StatCard label="Broken (sampled)" value={`${broken.length}/${sample.length}`} />
        </div>

        {/* Outbound link quality */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Outbound link quality</CardTitle>
          </CardHeader>
          <CardContent>
            {!oq ? (
              <p className="text-sm text-muted-foreground">No outbound links found.</p>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                {[
                  ["Dofollow", oq.dofollow],
                  ["Nofollow", oq.nofollow],
                  ["Sponsored", oq.sponsored],
                  ["UGC", oq.ugc],
                  ["Empty anchor", oq.emptyAnchor],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-lg border p-3 text-center">
                    <div className={`text-xl font-bold ${label === "Empty anchor" && value > 0 ? "text-warning" : ""}`}>
                      {value ?? 0}
                    </div>
                    <div className="text-xs text-muted-foreground">{label}</div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Broken-link check{" "}
              <Badge variant="outline" className="ml-1 align-middle">
                sample of {sample.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {sample.length === 0 ? (
              <p className="text-sm text-muted-foreground">No links were probed.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Link</TableHead>
                    <TableHead className="text-right">Hops</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...sample]
                    .sort((a, b) => Number(a.ok) - Number(b.ok) || (b.redirectChain?.length || 0) - (a.redirectChain?.length || 0))
                    .map((r, i) => (
                      <TableRow key={i}>
                        <TableCell className="max-w-[26rem] truncate font-medium" title={r.url}>
                          {shortUrl(r.url)}
                          {r.redirectChain?.length > 0 && r.finalUrl && (
                            <span className="block truncate text-xs text-muted-foreground" title={r.finalUrl}>
                              → {shortUrl(r.finalUrl)}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {r.redirectChain?.length ? r.redirectChain.length : "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant={r.ok ? "outline" : "destructive"}>
                            {r.status || "ERR"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </ScanGate>
  );
}
