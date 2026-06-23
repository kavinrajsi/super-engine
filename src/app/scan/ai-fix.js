"use client";

// Per-page "AI fixes" button. Posts the page's signals + issues to /api/ai-fix
// and renders model-generated, copy-paste-ready suggestions.

import { useState } from "react";
import { usePostHog } from "posthog-js/react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { buildHeadBlock } from "@/lib/seo/head-from-fixes";

export default function AiFix({ page }) {
  const ph = usePostHog();
  const [state, setState] = useState("idle"); // idle | loading | done | error
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(-1);

  if (!page.audit) return null;

  async function run() {
    setState("loading");
    setError(null);
    try {
      const issues = [
        ...(page.audit?.issues || []),
        ...(page.aiAudit?.issues || []),
      ].filter((i) => i.severity !== "pass");
      const res = await fetch("/api/ai-fix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: page.url, signals: page.signals, issues }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Request failed");
      setData(json);
      setState("done");
      ph?.capture("ai_fix_used", {
        url: page.url,
        suggestions: json.suggestions?.length ?? 0,
      });
    } catch (e) {
      setError(e.message);
      setState("error");
    }
  }

  function copy(text, i) {
    navigator.clipboard?.writeText(text);
    setCopied(i);
    setTimeout(() => setCopied(-1), 1200);
  }

  function headBlock() {
    return buildHeadBlock(data?.suggestions || [], page.signals || {});
  }

  function downloadHead() {
    const blob = new Blob([headBlock()], { type: "text/html" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    let host = "page";
    try {
      host = new URL(page.url).hostname;
    } catch {
      /* keep default */
    }
    a.download = `${host}-head.html`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div className="mt-3">
      {state !== "done" && (
        <Button variant="outline" size="sm" onClick={run} disabled={state === "loading"}>
          <Sparkles />
          {state === "loading" ? "Generating…" : "AI fixes"}
        </Button>
      )}

      {state === "error" && (
        <p className="mt-2 rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-warning">
          {error}
        </p>
      )}

      {state === "done" && data && (
        <div className="mt-2 space-y-3">
          {data.summary && (
            <p className="rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-sm">
              {data.summary}
            </p>
          )}
          <ul className="space-y-2">
            {(data.suggestions || []).map((s, i) => (
              <li key={i} className="rounded-md border bg-background p-3">
                <div className="flex items-center justify-between gap-2">
                  <Badge variant="secondary">{s.label}</Badge>
                  <Button variant="ghost" size="xs" onClick={() => copy(s.suggested, i)}>
                    {copied === i ? "Copied!" : "Copy"}
                  </Button>
                </div>
                <pre className="mt-2 whitespace-pre-wrap break-words rounded bg-muted/60 p-2 font-mono text-xs">
                  {s.suggested}
                </pre>
                <p className="mt-1 text-xs text-muted-foreground">{s.rationale}</p>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="xs" onClick={() => copy(headBlock(), -2)}>
              {copied === -2 ? "Copied!" : "Copy corrected <head>"}
            </Button>
            <Button variant="outline" size="xs" onClick={downloadHead}>
              Download .html
            </Button>
            <Button variant="ghost" size="xs" onClick={run}>
              ↻ Regenerate
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
