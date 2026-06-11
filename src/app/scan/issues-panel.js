"use client";

// Issues: every issue across the site, grouped by category and de-duplicated by
// rule. Each rule lists the pages it affects, with the actual offending content
// on each page. Read-only, prioritized view.

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { groupIssuesWithPages } from "@/lib/seo/gamify";
import { explain } from "@/lib/seo/explanations";

const SEV_BADGE = { error: "destructive", warning: "secondary", info: "outline" };
const SEV_ORDER = { error: 0, warning: 1, info: 2 };

// How many affected pages to list per rule before collapsing to "+N more".
const MAX_PAGES_SHOWN = 25;

const CATEGORIES = [
  { key: "seo", label: "SEO" },
  { key: "smo", label: "Social (SMO)" },
  { key: "aeo", label: "Answer Engine (AEO)" },
  { key: "geo", label: "Generative (GEO)" },
  { key: "aio", label: "AI Overviews (AIO)" },
  { key: "ago", label: "Agent Access (AGO)" },
];

function prettyUrl(url) {
  try {
    const u = new URL(url);
    return u.pathname === "/" && !u.search ? u.host : u.host + u.pathname + u.search;
  } catch {
    return url;
  }
}

function AffectedPages({ occurrences }) {
  const shown = occurrences.slice(0, MAX_PAGES_SHOWN);
  const more = occurrences.length - shown.length;
  return (
    <div className="mt-3 rounded-md border bg-muted/30 p-3">
      <div className="mb-2 text-xs font-medium text-foreground">
        Affected page{occurrences.length === 1 ? "" : "s"} ({occurrences.length})
      </div>
      <ul className="space-y-1.5">
        {shown.map((o, i) => (
          <li key={i} className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-3">
            <a
              href={o.url}
              target="_blank"
              rel="noreferrer"
              title={o.url}
              className="shrink-0 truncate font-mono text-xs text-primary hover:underline sm:max-w-[16rem]"
            >
              {prettyUrl(o.url)}
            </a>
            {o.evidence && (
              <span
                title={o.evidence}
                className="min-w-0 truncate text-xs text-muted-foreground"
              >
                &ldquo;{o.evidence}&rdquo;
              </span>
            )}
          </li>
        ))}
      </ul>
      {more > 0 && (
        <div className="mt-1.5 text-xs text-muted-foreground">+{more} more</div>
      )}
    </div>
  );
}

export default function IssuesPanel({ result }) {
  const grouped = groupIssuesWithPages(result.pages);

  const byCategory = CATEGORIES.map((c) => ({
    ...c,
    items: grouped
      .filter((q) => q.category === c.key)
      .sort((a, b) => (SEV_ORDER[a.severity] ?? 9) - (SEV_ORDER[b.severity] ?? 9)),
  })).filter((c) => c.items.length > 0);

  if (byCategory.length === 0) {
    return (
      <div className="mx-auto max-w-5xl">
        <p className="rounded-lg border bg-card p-6 text-center text-sm text-muted-foreground">
          🎉 No issues found across the analyzed pages.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl">
      <Accordion defaultValue={byCategory.map((c) => c.key)} className="space-y-2">
        {byCategory.map((c) => (
          <AccordionItem key={c.key} value={c.key} className="rounded-lg border px-3">
            <AccordionTrigger className="hover:no-underline">
              <span className="flex flex-1 items-center justify-between pr-2">
                <span className="font-medium">{c.label}</span>
                <Badge variant="outline">{c.items.length}</Badge>
              </span>
            </AccordionTrigger>
            <AccordionContent className="space-y-2">
              {c.items.map((q) => {
                const exp = explain(q.ruleKey);
                return (
                  <div key={q.ruleKey} className="rounded-md border p-3">
                    <div className="flex items-start gap-3">
                      <Badge variant={SEV_BADGE[q.severity] || "outline"} className="mt-0.5 shrink-0">
                        {q.severity}
                      </Badge>
                      <div className="min-w-0 flex-1 text-sm font-medium">{q.title}</div>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {q.occurrences.length} page{q.occurrences.length === 1 ? "" : "s"}
                      </span>
                    </div>
                    <div className="mt-2 space-y-1 text-xs leading-relaxed">
                      {exp.what && (
                        <p>
                          <span className="font-medium text-foreground">What it means: </span>
                          <span className="text-muted-foreground">{exp.what}</span>
                        </p>
                      )}
                      {exp.why && (
                        <p>
                          <span className="font-medium text-foreground">Why it matters: </span>
                          <span className="text-muted-foreground">{exp.why}</span>
                        </p>
                      )}
                      {q.recommendation && (
                        <p>
                          <span className="font-medium text-foreground">How to fix: </span>
                          <span className="text-muted-foreground">{q.recommendation}</span>
                        </p>
                      )}
                    </div>
                    <AffectedPages occurrences={q.occurrences} />
                  </div>
                );
              })}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
