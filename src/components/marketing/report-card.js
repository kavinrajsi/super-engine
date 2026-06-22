"use client";

// Signature hero element: a live-feeling audit "report card" for a sample site.
// SEO score ring + the four AI-search lens meters (AEO/GEO/AIO/AGO) + AI-crawler
// access chips. Animates once on mount; honors prefers-reduced-motion.

import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import ScoreRing from "@/app/scan/score-ring";

const LENSES = [
  { code: "AEO", name: "Answer engines", score: 72, color: "var(--chart-1)" },
  { code: "GEO", name: "Generative engines", score: 65, color: "var(--chart-2)" },
  { code: "AIO", name: "AI Overviews", score: 80, color: "var(--chart-3)" },
  { code: "AGO", name: "Agent access", score: 91, color: "var(--chart-5)" },
];

const BOTS = ["GPTBot", "ClaudeBot", "PerplexityBot", "Google-Extended"];
const SEO = 87;

// easeOutCubic progress 0→1 over `duration`, or instant when reduced-motion.
function useIntroProgress(duration = 1100) {
  const [t, setT] = useState(0);
  useEffect(() => {
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setT(1);
      return;
    }
    let raf;
    let start;
    const tick = (now) => {
      start ??= now;
      const p = Math.min(1, (now - start) / duration);
      setT(1 - Math.pow(1 - p, 3));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [duration]);
  return t;
}

export default function ReportCard() {
  const t = useIntroProgress();

  return (
    <div className="w-full max-w-md overflow-hidden rounded-xl border bg-card shadow-sm">
      {/* inspector header bar — reads like a crawler readout */}
      <div className="scanline flex items-center justify-between gap-3 border-b bg-muted/40 px-4 py-2.5">
        <span className="truncate font-mono text-xs text-muted-foreground">
          /audit example.com
        </span>
        <span className="flex shrink-0 items-center gap-2">
          <span className="rounded border border-pass/30 bg-pass/10 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-pass">
            200
          </span>
          <span className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            <span className="blink size-1.5 rounded-full bg-pass" aria-hidden="true" />
            live
          </span>
        </span>
      </div>

      <div className="flex items-center gap-5 p-5 sm:p-6">
        <ScoreRing score={SEO * t} size={104} grade="A" />
        <div className="min-w-0">
          <div className="text-sm font-semibold">SEO health</div>
          <p className="mt-1 text-xs text-muted-foreground">
            Title, meta, schema, headings, canonical and links — graded across the site.
          </p>
        </div>
      </div>

      {/* the four AI-search lenses */}
      <div className="space-y-3 border-t px-5 py-5 sm:px-6">
        <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          AI-search readiness
        </div>
        {LENSES.map((l) => {
          const v = Math.round(l.score * t);
          return (
            <div key={l.code} className="flex items-center gap-3">
              <span className="w-9 shrink-0 font-mono text-xs font-semibold" style={{ color: l.color }}>
                {l.code}
              </span>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${l.score * t}%`, backgroundColor: l.color }}
                />
              </div>
              <span className="w-7 shrink-0 text-right font-mono text-xs tabular-nums text-foreground">
                {v}
              </span>
            </div>
          );
        })}
      </div>

      {/* AI crawler access */}
      <div className="flex flex-wrap items-center gap-1.5 border-t px-5 py-4 sm:px-6">
        <span className="mr-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          bots
        </span>
        {BOTS.map((b) => (
          <span
            key={b}
            className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[10px]"
            style={{
              color: "var(--pass)",
              borderColor: "color-mix(in srgb, var(--pass) 30%, transparent)",
              backgroundColor: "color-mix(in srgb, var(--pass) 10%, transparent)",
            }}
          >
            <Check className="size-2.5" /> {b}
          </span>
        ))}
      </div>
    </div>
  );
}
