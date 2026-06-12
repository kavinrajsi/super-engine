"use client";

// Accessibility — WCAG color-contrast (AA + AAA) across the scanned pages.
// On-demand (one headless axe pass per page, capped) so it doesn't slow the
// main scan. Mirrors the Performance panel's run-on-click pattern.

import { useState } from "react";
import { usePostHog } from "posthog-js/react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Contrast } from "lucide-react";
import ScoreRing from "./score-ring";
import { aggregateContrast } from "@/lib/seo/contrast";

const MAX_CONTRAST_PAGES = 10;
const CONCURRENCY = 2;

// Run `worker` over `items` with a fixed client-side concurrency pool.
async function mapPool(items, concurrency, worker) {
  const results = new Array(items.length);
  let cursor = 0;
  const runners = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    for (;;) {
      const i = cursor++;
      if (i >= items.length) return;
      results[i] = await worker(items[i], i);
    }
  });
  await Promise.all(runners);
  return results;
}

function Swatch({ color }) {
  return (
    <span
      className="inline-block size-3.5 shrink-0 rounded-sm border align-middle"
      style={{ background: color || "transparent" }}
      title={color || "unknown"}
    />
  );
}

export default function AccessibilityPanel({ result }) {
  const ph = usePostHog();
  const [state, setState] = useState("idle"); // idle | loading | done | error
  const [error, setError] = useState(null);
  const [done, setDone] = useState(0);
  const [pages, setPages] = useState([]);

  const urls = result.pages
    .filter((p) => !p.error)
    .map((p) => p.url)
    .slice(0, MAX_CONTRAST_PAGES);
  const skipped = result.pages.filter((p) => !p.error).length - urls.length;

  async function run() {
    setState("loading");
    setError(null);
    setDone(0);
    setPages([]);
    let headlessError = null;

    const perPage = await mapPool(urls, CONCURRENCY, async (url) => {
      try {
        const res = await fetch(`/api/contrast?url=${encodeURIComponent(url)}`);
        const json = await res.json();
        setDone((n) => n + 1);
        if (json.error) {
          headlessError = headlessError || json.error;
          return { url, ran: false, error: json.error };
        }
        return { url, ran: true, ...json };
      } catch (e) {
        setDone((n) => n + 1);
        return { url, ran: false, error: e.message };
      }
    });

    const ran = perPage.filter((p) => p.ran);
    if (!ran.length) {
      setError(headlessError || "Contrast scan failed for every page.");
      setState("error");
      return;
    }

    setPages(perPage);
    setState("done");
    const summary = aggregateContrast(perPage);
    ph?.capture("accessibility_scan_run", {
      url: result.rootUrl,
      pages: ran.length,
      aaFails: summary.aaFails,
      aaaFails: summary.aaaFails,
    });
  }

  const summary = state === "done" ? aggregateContrast(pages) : null;
  const failedPages = pages.filter((p) => p.ran && p.elements?.length);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Accessibility — color contrast</CardTitle>
          <CardDescription>
            WCAG 2 AA (1.4.3) &amp; AAA (1.4.6) text contrast, checked with axe-core in a real
            browser{" "}
            {urls.length > 0 && (
              <>
                · {urls.length} page{urls.length > 1 ? "s" : ""}
                {skipped > 0 && ` (${skipped} more not checked)`}
              </>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {state === "idle" && (
            <Button onClick={run} disabled={urls.length === 0}>
              <Contrast /> Run contrast scan
            </Button>
          )}

          {state === "loading" && (
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">
                Checking pages… {done}/{urls.length}
              </div>
              <Progress value={urls.length ? (done / urls.length) * 100 : 0} />
            </div>
          )}

          {state === "error" && (
            <p className="rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-warning">
              {error}
            </p>
          )}

          {state === "done" && summary && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center gap-6">
                <ScoreRing score={summary.score} size={96} label="AA pass rate" />
                <div className="flex flex-wrap gap-2">
                  <Badge variant={summary.aaFails ? "destructive" : "secondary"}>
                    {summary.aaFails} AA failure{summary.aaFails === 1 ? "" : "s"}
                  </Badge>
                  <Badge variant="outline">{summary.aaaFails} AAA failures</Badge>
                  {summary.needsReview > 0 && (
                    <Badge variant="outline">{summary.needsReview} need review</Badge>
                  )}
                  <Badge variant="outline">{summary.pagesScanned} pages scanned</Badge>
                </div>
              </div>

              {failedPages.length === 0 ? (
                <p className="rounded-md border bg-card p-4 text-sm text-muted-foreground">
                  🎉 No AA or AAA contrast failures found on the scanned pages.
                </p>
              ) : (
                <Accordion
                  defaultValue={failedPages.map((p) => p.url)}
                  className="space-y-2"
                >
                  {failedPages.map((p) => (
                    <AccordionItem key={p.url} value={p.url} className="rounded-lg border px-3">
                      <AccordionTrigger className="hover:no-underline">
                        <span className="flex flex-1 items-center justify-between gap-2 pr-2">
                          <span className="min-w-0 truncate text-sm font-medium">{p.url}</span>
                          <span className="flex shrink-0 gap-1.5">
                            <Badge variant="destructive">{p.aaFail} AA</Badge>
                            <Badge variant="outline">{p.aaaFail} AAA</Badge>
                          </span>
                        </span>
                      </AccordionTrigger>
                      <AccordionContent className="space-y-2">
                        {p.elements.map((el, i) => (
                          <div key={i} className="rounded-md border p-3 text-xs">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge
                                variant={el.level === "AA" ? "destructive" : "secondary"}
                                className="shrink-0"
                              >
                                {el.level} fail
                              </Badge>
                              <span className="inline-flex items-center gap-1">
                                <Swatch color={el.fg} /> on <Swatch color={el.bg} />
                              </span>
                              <span className="font-medium">
                                {el.ratio != null ? el.ratio.toFixed(2) : "—"}:1
                              </span>
                              <span className="text-muted-foreground">
                                needs {el.required != null ? el.required : "—"}:1
                              </span>
                              {el.isLargeText && (
                                <Badge variant="outline" className="shrink-0">
                                  large text
                                </Badge>
                              )}
                              {el.fontSizePx != null && (
                                <span className="text-muted-foreground">
                                  {el.fontSizePx}px{el.bold ? " bold" : ""}
                                </span>
                              )}
                            </div>
                            <pre className="mt-2 overflow-x-auto rounded bg-muted/60 p-2 font-mono text-[11px] leading-relaxed">
                              {el.html}
                            </pre>
                            <div className="mt-1 truncate font-mono text-[11px] text-muted-foreground">
                              {el.selector}
                            </div>
                          </div>
                        ))}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
