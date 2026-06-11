"use client";

// Site speed & performance (PageSpeed Insights), run on demand so it doesn't
// slow the main scan.

import { useState } from "react";
import { usePostHog } from "posthog-js/react";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Gauge } from "lucide-react";
import ScoreRing from "./score-ring";

const RATING_COLOR = {
  good: "var(--pass)",
  "needs-work": "var(--warning)",
  poor: "var(--error)",
  none: "var(--muted-foreground)",
};
const SCORES = [
  ["performance", "Performance"],
  ["seo", "SEO"],
  ["accessibility", "Accessibility"],
  ["bestPractices", "Best Practices"],
];

export default function PerformancePanel({ url }) {
  const ph = usePostHog();
  const [strategy, setStrategy] = useState("mobile");
  const [state, setState] = useState("idle"); // idle | loading | done | error
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  async function run(strat) {
    setStrategy(strat);
    setState("loading");
    setError(null);
    try {
      const res = await fetch(
        `/api/pagespeed?url=${encodeURIComponent(url)}&strategy=${strat}`
      );
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      if (!res.ok) throw new Error("Request failed");
      setData(json);
      setState("done");
      ph?.capture("performance_test_run", {
        url,
        strategy: strat,
        performance: json.scores?.performance ?? null,
      });
    } catch (e) {
      setError(e.message);
      setState("error");
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Site speed &amp; performance</CardTitle>
          <CardDescription>
            Google PageSpeed Insights — Lighthouse + Core Web Vitals
          </CardDescription>
          {state !== "idle" && (
            <CardAction>
              <div className="inline-flex rounded-md border p-0.5 text-xs">
                {["mobile", "desktop"].map((s) => (
                  <button
                    key={s}
                    onClick={() => run(s)}
                    disabled={state === "loading"}
                    className={`rounded px-2.5 py-1 capitalize ${
                      strategy === s ? "bg-primary text-primary-foreground" : ""
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </CardAction>
          )}
        </CardHeader>
        <CardContent>
          {state === "idle" && (
            <Button onClick={() => run("mobile")}>
              <Gauge /> Run performance test
            </Button>
          )}
          {state === "loading" && (
            <p className="text-sm text-muted-foreground">Running PageSpeed test… (10–30s)</p>
          )}
          {state === "error" && (
            <p className="rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-warning">
              {error}
            </p>
          )}
          {state === "done" && data && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {SCORES.map(([k, label]) => (
                  <div key={k} className="flex flex-col items-center gap-1">
                    <ScoreRing score={data.scores[k]} size={88} />
                    <span className="text-xs text-muted-foreground">{label}</span>
                  </div>
                ))}
              </div>

              <div>
                <div className="mb-2 text-sm font-medium">
                  Core Web Vitals{" "}
                  <span className="font-normal text-muted-foreground">
                    {data.fieldData ? "(real-user field data)" : "(no field data for this URL)"}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                  {data.cwv.map((m) => (
                    <div key={m.key} className="rounded-lg border p-3 text-center">
                      <div className="text-lg font-bold" style={{ color: RATING_COLOR[m.rating] }}>
                        {m.value}
                      </div>
                      <div className="text-xs text-muted-foreground">{m.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              {data.opportunities.length > 0 && (
                <div>
                  <div className="mb-2 text-sm font-medium">Optimization tips</div>
                  <div className="space-y-2">
                    {data.opportunities.map((o, i) => (
                      <div key={i} className="flex items-start gap-3 rounded-md border p-3">
                        <Badge variant="secondary" className="mt-0.5 shrink-0">
                          ~{(o.savingsMs / 1000).toFixed(1)}s
                        </Badge>
                        <div>
                          <div className="text-sm font-medium">{o.title}</div>
                          <div className="text-xs text-muted-foreground">{o.description}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
