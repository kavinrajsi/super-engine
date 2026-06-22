"use client";

// Signature element: the AI Visibility Spectrum. The four AI-search lenses
// (AEO/GEO/AIO/AGO) rendered as one cohesive instrument — segmented level
// meters, per-lens colour, and a crawler-state chip — instead of four flat
// cards. Fills on scroll-into-view; honors prefers-reduced-motion.

import { useEffect, useRef, useState } from "react";

const LENSES = [
  {
    code: "AEO",
    name: "Answer Engine Optimization",
    blurb: "Be the direct answer: FAQ schema, question-shaped headings, concise extractable answers.",
    engines: ["ChatGPT", "Perplexity"],
    score: 72,
    color: "var(--chart-1)",
    status: "safe",
  },
  {
    code: "GEO",
    name: "Generative Engine Optimization",
    blurb: "Be citable: clear authorship, dates, real depth, and lists and tables a model can lift.",
    engines: ["Claude", "Gemini"],
    score: 64,
    color: "var(--chart-2)",
    status: "warn",
  },
  {
    code: "AIO",
    name: "AI Overviews Optimization",
    blurb: "Be machine-readable: schema.org, clean meta, semantic landmarks and freshness signals.",
    engines: ["Google AI Overviews"],
    score: 80,
    color: "var(--chart-3)",
    status: "safe",
  },
  {
    code: "AGO",
    name: "Agent & bot access",
    blurb: "Be reachable: llms.txt and ai.txt validation plus a robots.txt audit of every AI crawler.",
    engines: ["GPTBot", "ClaudeBot", "Google-Extended"],
    score: 91,
    color: "var(--chart-5)",
    status: "safe",
  },
];

const STATUS = {
  safe: { label: "indexable", cls: "border-pass/30 bg-pass/10 text-pass" },
  warn: { label: "partial", cls: "border-warning/30 bg-warning/10 text-warning" },
  block: { label: "blocked", cls: "border-error/30 bg-error/10 text-error" },
};

const SEGMENTS = 32;

// easeOutCubic 0→1 once the panel scrolls into view (instant w/ reduced motion).
function useScrollFill(duration = 1200) {
  const ref = useRef(null);
  const [t, setT] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      setT(1);
      return;
    }
    let raf;
    let start;
    let started = false;
    const tick = (now) => {
      start ??= now;
      const p = Math.min(1, (now - start) / duration);
      setT(1 - Math.pow(1 - p, 3));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting && !started) {
            started = true;
            raf = requestAnimationFrame(tick);
            io.disconnect();
          }
        }
      },
      { threshold: 0.25 }
    );
    io.observe(el);
    return () => {
      io.disconnect();
      if (raf) cancelAnimationFrame(raf);
    };
  }, [duration]);
  return [ref, t];
}

function Channel({ lens, t }) {
  const filled = (lens.score * t) / 100;
  const status = STATUS[lens.status];
  return (
    <div
      className="rounded-lg border border-l-[3px] bg-card p-4 transition-colors"
      style={{ borderLeftColor: lens.color }}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-sm font-bold" style={{ color: lens.color }}>
            {lens.code}
          </span>
          <span className="text-sm font-semibold">{lens.name}</span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="font-mono text-sm font-semibold tabular-nums">
            {Math.round(lens.score * t)}
          </span>
          <span
            className={`rounded border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide ${status.cls}`}
          >
            {status.label}
          </span>
        </div>
      </div>

      {/* segmented level meter */}
      <div className="mt-3 flex items-center gap-[2px]" aria-hidden="true">
        {Array.from({ length: SEGMENTS }).map((_, i) => {
          const on = (i + 1) / SEGMENTS <= filled;
          return (
            <span
              key={i}
              className="h-4 flex-1 rounded-[1px]"
              style={{ backgroundColor: on ? lens.color : "var(--muted)" }}
            />
          );
        })}
      </div>

      <p className="mt-3 text-xs text-muted-foreground">{lens.blurb}</p>
      <div className="mt-2 flex flex-wrap gap-1">
        {lens.engines.map((e) => (
          <span
            key={e}
            className="rounded-full border px-2 py-0.5 font-mono text-[10px] text-muted-foreground"
          >
            {e}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function AiSpectrum() {
  const [ref, t] = useScrollFill();
  return (
    <div ref={ref} className="overflow-hidden rounded-xl border bg-background shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b bg-muted/40 px-4 py-2.5">
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          AI visibility spectrum
        </span>
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          4 lenses · live model coverage
        </span>
      </div>
      <div className="grid gap-3 p-4 sm:p-5">
        {LENSES.map((l) => (
          <Channel key={l.code} lens={l} t={t} />
        ))}
      </div>
    </div>
  );
}
