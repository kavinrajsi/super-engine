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
    <div className="w-full max-w-md rounded-xl border bg-card p-5 shadow-sm sm:p-6">
      {/* card header — reads like a tool readout */}
      <div className="flex items-center justify-between gap-3 border-b pb-4">
        <div className="flex items-center gap-2">
          <span
            className="size-2 animate-pulse rounded-full"
            style={{ backgroundColor: "var(--pass)" }}
            aria-hidden="true"
          />
          <span className="font-mono text-xs text-muted-foreground">audit · example.com</span>
        </div>
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          live
        </span>
      </div>

      <div className="flex items-center gap-5 pt-5">
        <ScoreRing score={SEO * t} size={104} grade="A" />
        <div className="min-w-0">
          <div className="text-sm font-semibold">SEO health</div>
          <p className="mt-1 text-xs text-muted-foreground">
            Title, meta, schema, headings, canonical and links — graded across the site.
          </p>
        </div>
      </div>

      {/* the four AI-search lenses */}
      <div className="mt-5 space-y-3 border-t pt-5">
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
      <div className="mt-5 flex flex-wrap items-center gap-1.5 border-t pt-4">
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
