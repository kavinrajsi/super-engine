"use client";

// Issues: every issue across the site, de-duplicated by rule and grouped by
// category in an accordion. Read-only, prioritized view.

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { questsFromIssues } from "@/lib/seo/gamify";
import { explain } from "@/lib/seo/explanations";

const SEV_BADGE = { error: "destructive", warning: "secondary", info: "outline" };
const SEV_ORDER = { error: 0, warning: 1, info: 2 };

const CATEGORIES = [
  { key: "seo", label: "SEO" },
  { key: "smo", label: "Social (SMO)" },
  { key: "aeo", label: "Answer Engine (AEO)" },
  { key: "geo", label: "Generative (GEO)" },
  { key: "aio", label: "AI Overviews (AIO)" },
  { key: "ago", label: "Agent Access (AGO)" },
];

export default function IssuesPanel({ result }) {
  const allIssues = result.pages.flatMap((p) => [
    ...(p.audit?.issues || []),
    ...(p.aiAudit?.issues || []),
  ]);
  const grouped = questsFromIssues(allIssues);

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
                      {q.pagesAffected > 1 && (
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {q.pagesAffected} pages
                        </span>
                      )}
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
