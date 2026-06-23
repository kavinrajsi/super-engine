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
  aeo: {
    title: "AEO — Answer Engine Optimization",
    sections: [
      {
        heading: "What it measures",
        body: "How well your content is structured to become the direct answer in AI assistants like ChatGPT and Perplexity.",
      },
      {
        heading: "Checks",
        body: "FAQ/Q&A structured data (JSON-LD) · Question-style H2/H3 headings",
      },
      {
        heading: "Penalty scale",
        body: "Missing FAQ schema −22 pts · No question headings −10 pts",
      },
    ],
  },
  geo: {
    title: "GEO — Generative Engine Optimization",
    sections: [
      {
        heading: "What it measures",
        body: "How citable and trustworthy your content is for AI engines that generate long-form answers.",
      },
      {
        heading: "Checks",
        body: "Author attribution · Published/modified dates · Content depth ≥ 300 words · Lists or tables present",
      },
      {
        heading: "Penalty scale",
        body: "Missing author −22 pts · Each missing signal −10 pts",
      },
    ],
  },
  aio: {
    title: "AIO — AI Overviews Optimization",
    sections: [
      {
        heading: "What it measures",
        body: "How machine-readable your page is for Google's AI Overviews feature.",
      },
      {
        heading: "Checks",
        body: "JSON-LD structured data · Meta description · Semantic <main>/<article> landmark · dateModified freshness signal",
      },
      {
        heading: "Penalty scale",
        body: "Missing structured data −22 pts · Each missing signal −10 pts",
      },
    ],
  },
  ago: {
    title: "AGO — Agent & Bot Access",
    sections: [
      {
        heading: "What it measures",
        body: "How accessible your site is to AI crawlers — covering crawlability, bot policy, and AI guidance files.",
      },
      {
        heading: "Checks",
        body: "JS-rendered content (page-level) · /llms.txt and /llms-full.txt present and valid · AI bots not blocked in robots.txt",
      },
      {
        heading: "Penalty scale",
        body: "JS-rendered or blocked bots −22 pts · Missing llms.txt −10 pts · Malformed file −22 pts",
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
