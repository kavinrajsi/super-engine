"use client";

import { Info } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const CONTENT = {
  seo: {
    title: "SEO score",
    sections: [
      {
        heading: "How it's calculated",
        body: "Starts at 100. Each critical issue deducts 15 points, each warning 6 points, each notice 1 point.",
      },
      {
        heading: "Site score",
        body: "The site score is the average of all individual page scores.",
      },
      {
        heading: "Grades",
        body: "A ≥ 90 · B ≥ 75 · C ≥ 60 · D ≥ 40 · F < 40",
      },
      {
        heading: "Colour bands",
        body: "Green ≥ 75 · Orange ≥ 50 · Red < 50",
      },
    ],
  },
  ai: {
    title: "AI Readiness score",
    sections: [
      {
        heading: "How it's calculated",
        body: "Average of four lens scores — AEO (Answer Engines), GEO (Generative), AIO (AI Overviews), AGO (Bot access) — each scored 0–100 independently.",
      },
      {
        heading: "Penalty scale",
        body: "Error −40 pts · Warning −22 pts · Notice −10 pts",
      },
      {
        heading: "Grades",
        body: "A ≥ 90 · B ≥ 75 · C ≥ 60 · D ≥ 40 · F < 40",
      },
    ],
  },
  performance: {
    title: "PageSpeed score",
    sections: [
      {
        heading: "Source",
        body: "Google Lighthouse score from PageSpeed Insights, measured on a real device profile.",
      },
      {
        heading: "Core Web Vitals",
        body: "LCP (Largest Contentful Paint) · INP (Interaction to Next Paint) · CLS (Cumulative Layout Shift)",
      },
      {
        heading: "Colour bands",
        body: "Green ≥ 90 · Orange ≥ 50 · Red < 50",
      },
    ],
  },
};

export default function ScoreInfoButton({ type }) {
  const info = CONTENT[type];
  if (!info) return null;

  return (
    <Popover>
      <PopoverTrigger
        className={cn(
          buttonVariants({ variant: "ghost", size: "icon-xs" }),
          "shrink-0 text-muted-foreground"
        )}
        aria-label={`How the ${info.title} is calculated`}
      >
        <Info className="size-3" />
      </PopoverTrigger>
      <PopoverContent>
        <p className="mb-2 text-sm font-semibold">{info.title}</p>
        <div className="space-y-2">
          {info.sections.map((s) => (
            <div key={s.heading}>
              <p className="text-xs font-medium">{s.heading}</p>
              <p className="text-xs text-muted-foreground">{s.body}</p>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
