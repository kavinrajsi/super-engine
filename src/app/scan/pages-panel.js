"use client";

// Pages: a table-like accordion. A column header (Score · URL · Title · Desc ·
// Canonical · OG) sits over aligned rows; each row expands to the OG social
// preview + full meta + that page's issues + AI fixes.

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Check, X } from "lucide-react";
import AiFix from "./ai-fix";
import OgPreview from "./og-preview";

const GRADE_VARIANT = { A: "default", B: "default", C: "secondary", D: "secondary", F: "destructive" };
const SEV_BADGE = { error: "destructive", warning: "secondary", info: "outline" };

// Shared column template so the header and every row line up.
const COLS =
  "grid grid-cols-[56px_1fr] md:grid-cols-[56px_minmax(0,1.4fr)_minmax(0,1.4fr)_64px_84px_48px] items-center gap-3";

function Tick({ ok }) {
  return ok ? (
    <Check className="size-4 text-[var(--pass)]" />
  ) : (
    <X className="size-4 text-[var(--error)]" />
  );
}

function MetaRow({ label, value }) {
  return (
    <div className="grid grid-cols-[120px_1fr] gap-2 border-b py-1.5 last:border-0">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <span className="break-words text-xs">{value || <span className="text-muted-foreground">—</span>}</span>
    </div>
  );
}

export default function PagesPanel({ result }) {
  return (
    <div className="mx-auto max-w-5xl">
      {/* Column header (md+) — sticky below the dashboard top bar (h-14) */}
      <div
        className={`${COLS} sticky top-14 z-10 hidden border-b bg-background px-3 pr-9 pt-2 pb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground md:grid`}
      >
        <span>Score</span>
        <span>URL</span>
        <span>Title</span>
        <span>Desc</span>
        <span>Canonical</span>
        <span>OG</span>
      </div>

      <Accordion className="space-y-2">
        {result.pages.map((p, i) => {
          const s = p.signals || {};
          const a = p.audit;
          const issues = [
            ...(p.audit?.issues || []),
            ...(p.aiAudit?.issues || []),
          ].filter((x) => x.severity !== "pass");
          // Effective robots: meta tag → X-Robots-Tag header → default.
          const robotsValue = s.robots
            ? s.robots
            : s.robotsHeader
            ? `${s.robotsHeader} (X-Robots-Tag)`
            : "index, follow (default — no robots directive)";
          return (
            <AccordionItem
              key={`${p.url}#${i}`}
              value={`${p.url}#${i}`}
              className="rounded-lg border px-3"
            >
              <AccordionTrigger className="hover:no-underline">
                <div className={`${COLS} w-full pr-2 text-left`}>
                  {a ? (
                    <Badge variant={GRADE_VARIANT[a.grade] || "secondary"} className="justify-self-start">
                      {a.grade}·{a.score}
                    </Badge>
                  ) : (
                    <span />
                  )}
                  <span className="min-w-0 truncate text-sm font-medium">{p.url}</span>
                  <span className="hidden min-w-0 truncate text-sm text-muted-foreground md:block">
                    {s.title || "—"}
                  </span>
                  <span className="hidden md:block">
                    <Tick ok={!!s.metaDescription} />
                  </span>
                  <span className="hidden md:block">
                    <Tick ok={!!s.canonical} />
                  </span>
                  <span className="hidden md:block">
                    <Tick ok={!!s.og?.image} />
                  </span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="flex flex-wrap gap-2 pb-3">
                  {!p.inSitemap && <Badge variant="outline">missing from sitemap</Badge>}
                  {p.renderMode === "headless" && <Badge>headless-rendered</Badge>}
                  {p.needsHeadless && <Badge variant="outline">JS-rendered</Badge>}
                  {p.error && <Badge variant="destructive">{p.error}</Badge>}
                </div>

                <div className="grid gap-4 md:grid-cols-[20rem_1fr]">
                  <OgPreview og={s.og} title={s.title} description={s.metaDescription} url={p.url} />
                  <div className="rounded-md border p-3">
                    <MetaRow label="Title" value={s.title} />
                    <MetaRow label="Description" value={s.metaDescription} />
                    <MetaRow label="Canonical" value={s.canonical} />
                    <MetaRow label="OG image" value={s.og?.image} />
                    <MetaRow label="Twitter card" value={s.twitter?.card} />
                    <MetaRow label="Robots" value={robotsValue} />
                    <MetaRow label="H1s" value={s.h1s?.length ? String(s.h1s.length) : null} />
                    <MetaRow label="Render" value={p.renderMode} />
                  </div>
                </div>

                {issues.length > 0 && (
                  <div className="mt-3 space-y-2">
                    <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Issues ({issues.length})
                    </div>
                    {issues.map((iss, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-sm">
                        <Badge variant={SEV_BADGE[iss.severity] || "outline"} className="mt-0.5 shrink-0">
                          {iss.severity}
                        </Badge>
                        <div>
                          <span>{iss.message}</span>
                          {iss.recommendation && (
                            <span className="text-muted-foreground"> — {iss.recommendation}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {a && <AiFix page={p} />}
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
}
