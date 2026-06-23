"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import AppShell from "@/components/app-shell";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import ScoreRing from "@/app/scan/score-ring";

const SEV_BADGE = { error: "destructive", warning: "secondary", info: "outline" };

const LENS_META = {
  aeo: {
    name: "AEO",
    title: "Answer Engine Optimization",
    description:
      "How well your content is structured to become the direct answer in AI assistants like ChatGPT and Perplexity.",
  },
  geo: {
    name: "GEO",
    title: "Generative Engine Optimization",
    description:
      "How citable and trustworthy your content is for AI engines that generate long-form answers.",
  },
  aio: {
    name: "AIO",
    title: "AI Overviews Optimization",
    description:
      "How machine-readable your page is for Google's AI Overviews feature.",
  },
  ago: {
    name: "AGO",
    title: "Agent & Bot Access",
    description:
      "How accessible your site is to AI crawlers — covering crawlability, bot policy, and AI guidance files.",
  },
};

function grade(s) {
  if (s == null) return "—";
  if (s >= 90) return "A";
  if (s >= 75) return "B";
  if (s >= 60) return "C";
  if (s >= 40) return "D";
  return "F";
}

function shortPath(u) {
  try {
    const x = new URL(u);
    return x.pathname === "/" ? x.host : x.pathname + x.search;
  } catch {
    return u;
  }
}

// Group per-page issues for one lens by ruleKey across all pages.
function groupIssues(pages, lensKey) {
  const groups = {};
  for (const page of pages) {
    const issues = page.aiAudit?.layers?.[lensKey]?.issues || [];
    for (const issue of issues) {
      if (!groups[issue.ruleKey]) {
        groups[issue.ruleKey] = {
          ruleKey: issue.ruleKey,
          severity: issue.severity,
          message: issue.message,
          recommendation: issue.recommendation,
          pages: [],
        };
      }
      groups[issue.ruleKey].pages.push(page.url);
    }
  }
  const SEV_ORDER = { error: 0, warning: 1, info: 2 };
  return Object.values(groups).sort(
    (a, b) =>
      (SEV_ORDER[a.severity] ?? 3) - (SEV_ORDER[b.severity] ?? 3) ||
      b.pages.length - a.pages.length
  );
}

export default function AiLensDetail({ lensKey }) {
  const sp = useSearchParams();
  const url = sp?.get("url") || "";
  const meta = LENS_META[lensKey];

  const [state, setState] = useState("idle");
  const [scan, setScan] = useState(null);
  const [fetchError, setFetchError] = useState(null);

  useEffect(() => {
    if (!url) return;
    setState("loading");
    fetch(`/api/seo/audit?url=${encodeURIComponent(url)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setScan(data);
        setState("done");
      })
      .catch((e) => {
        setFetchError(e.message);
        setState("error");
      });
  }, [url]);

  const backHref = url ? `/seo?url=${encodeURIComponent(url)}` : "/seo";
  const lensScore = scan?.aiReadiness?.layers?.[lensKey] ?? null;
  const pages = scan?.pages || [];
  const issueGroups = scan ? groupIssues(pages, lensKey) : [];
  const siteIssues = lensKey === "ago" ? scan?.aiReadiness?.siteIssues || [] : [];

  // Aggregate issue counts across all pages for this lens
  const counts = { error: 0, warning: 0, info: 0 };
  for (const g of issueGroups) counts[g.severity] = (counts[g.severity] || 0) + g.pages.length;
  // Include site-level issues for AGO
  for (const i of siteIssues) counts[i.severity] = (counts[i.severity] || 0) + 1;

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-4 md:p-6">

        {/* Breadcrumb */}
        <Link href={backHref} className={buttonVariants({ variant: "ghost", size: "sm" })}>
          <ArrowLeft className="size-4" /> SEO insights
        </Link>

        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
          {lensScore != null && (
            <ScoreRing score={lensScore} grade={grade(lensScore)} size={100} />
          )}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              AI Readiness · {meta.name}
            </p>
            <h1 className="text-2xl font-bold tracking-tight">{meta.title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{meta.description}</p>
          </div>
        </div>

        {/* No URL */}
        {!url && (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              Run a scan from{" "}
              <Link href="/seo" className="underline underline-offset-2">
                SEO insights
              </Link>{" "}
              first, then return to this page.
            </CardContent>
          </Card>
        )}

        {/* Loading skeleton */}
        {state === "loading" && (
          <div className="space-y-2 py-4" aria-hidden="true">
            {[80, 60, 72, 50].map((w, i) => (
              <div
                key={i}
                className="h-2 rounded-full bg-muted"
                style={{
                  width: `${w}%`,
                  animation: `madrank-blink 1.8s steps(2,start) ${i * 0.2}s infinite`,
                }}
              />
            ))}
          </div>
        )}

        {/* Error */}
        {state === "error" && (
          <p className="rounded-md border border-error/40 bg-error/10 px-3 py-2 text-sm text-error">
            {fetchError}
          </p>
        )}

        {state === "done" && scan && (
          <>
            {/* Issue count summary */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Errors", key: "error" },
                { label: "Warnings", key: "warning" },
                { label: "Notices", key: "info" },
              ].map(({ label, key }) => (
                <Card key={key}>
                  <CardContent className="py-4 text-center">
                    <div className="text-2xl font-bold tabular-nums">{counts[key] || 0}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">{label}</div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* AGO: site-level checks (llms.txt / bot access) */}
            {lensKey === "ago" && (
              <AgoSiteSection site={scan.aiReadiness?.site} siteIssues={siteIssues} />
            )}

            {/* Issue groups */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {issueGroups.length > 0
                    ? "Issues across all pages"
                    : "No page-level issues found"}
                </CardTitle>
              </CardHeader>
              {issueGroups.length > 0 && (
                <CardContent className="space-y-3">
                  {issueGroups.map((g) => (
                    <div key={g.ruleKey} className="rounded-lg border p-3">
                      <div className="flex items-start gap-3">
                        <Badge
                          variant={SEV_BADGE[g.severity] || "outline"}
                          className="mt-0.5 shrink-0"
                        >
                          {g.severity}
                        </Badge>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium">{g.message}</p>
                          {g.recommendation && (
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {g.recommendation}
                            </p>
                          )}
                          <div className="mt-2 flex flex-wrap gap-1">
                            {g.pages.slice(0, 8).map((u) => (
                              <span
                                key={u}
                                className="inline-block rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground"
                                title={u}
                              >
                                {shortPath(u)}
                              </span>
                            ))}
                            {g.pages.length > 8 && (
                              <span className="inline-block rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                                +{g.pages.length - 8} more
                              </span>
                            )}
                          </div>
                        </div>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {g.pages.length}p
                        </span>
                      </div>
                    </div>
                  ))}
                </CardContent>
              )}
            </Card>

            {/* Per-page score table */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Per-page scores ({pages.length} page{pages.length === 1 ? "" : "s"})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  {pages.map((page) => {
                    const layerData = page.aiAudit?.layers?.[lensKey];
                    const s = layerData?.score ?? null;
                    const pageIssues = layerData?.issues || [];
                    const ec = pageIssues.filter((i) => i.severity === "error").length;
                    const wc = pageIssues.filter((i) => i.severity === "warning").length;
                    const ic = pageIssues.filter((i) => i.severity === "info").length;
                    return (
                      <div
                        key={page.url}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm"
                      >
                        <span
                          className="w-8 shrink-0 text-center font-bold tabular-nums"
                          style={{
                            color:
                              s == null
                                ? "var(--muted-foreground)"
                                : s >= 75
                                ? "var(--pass)"
                                : s >= 50
                                ? "var(--warning)"
                                : "var(--error)",
                          }}
                        >
                          {s ?? "—"}
                        </span>
                        <span
                          className="min-w-0 flex-1 truncate text-muted-foreground"
                          title={page.url}
                        >
                          {shortPath(page.url)}
                        </span>
                        <div className="flex shrink-0 items-center gap-1 text-xs">
                          {ec > 0 && <Badge variant="destructive">{ec} err</Badge>}
                          {wc > 0 && <Badge variant="secondary">{wc} warn</Badge>}
                          {ic > 0 && <Badge variant="outline">{ic} info</Badge>}
                          {pageIssues.length === 0 && (
                            <span className="text-muted-foreground">✓</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AppShell>
  );
}

// AGO-only: site-level llms.txt / bot access status
function AgoSiteSection({ site, siteIssues }) {
  if (!site) return null;
  const blocked = site.botsBlocked || [];
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Site-level AI access</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {[
          { label: "/llms.txt", info: site.llms },
          { label: "/llms-full.txt", info: site.llmsFull },
          { label: "/ai.txt", info: site.aiTxt },
        ].map(({ label, info }) => (
          <div
            key={label}
            className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
          >
            <span className="font-mono">{label}</span>
            {!info?.present ? (
              <Badge variant="outline">✗ missing</Badge>
            ) : info.valid && !info.findings?.length ? (
              <Badge>✓ valid</Badge>
            ) : info.valid ? (
              <Badge variant="secondary">✓ valid · {info.findings.length} note(s)</Badge>
            ) : (
              <Badge variant="destructive">⚠ invalid</Badge>
            )}
          </div>
        ))}
        <div className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
          <span className="font-medium">AI crawler access</span>
          {blocked.length === 0 ? (
            <Badge>✓ allowed</Badge>
          ) : (
            <Badge variant="destructive">✗ {blocked.length} blocked</Badge>
          )}
        </div>
        {blocked.length > 0 && (
          <p className="text-xs text-muted-foreground">Blocked: {blocked.join(", ")}</p>
        )}
        {siteIssues?.length > 0 && (
          <div className="space-y-2 pt-1">
            {siteIssues.map((issue) => (
              <div key={issue.ruleKey} className="rounded-lg border p-3">
                <div className="flex items-start gap-3">
                  <Badge variant={SEV_BADGE[issue.severity] || "outline"} className="mt-0.5 shrink-0">
                    {issue.severity}
                  </Badge>
                  <div>
                    <p className="text-sm font-medium">{issue.message}</p>
                    {issue.recommendation && (
                      <p className="mt-0.5 text-xs text-muted-foreground">{issue.recommendation}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
