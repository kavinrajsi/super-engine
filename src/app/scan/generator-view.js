"use client";

// Shared generator output: preview + Copy + Download, and (for llms.txt) an
// optional "Enhance with AI" that polishes the file via the AI Gateway.

import { useState } from "react";
import { usePostHog } from "posthog-js/react";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Copy, Download, Sparkles, Undo2 } from "lucide-react";

export default function GeneratorView({ title, filename, mime, content, enhanceable, site }) {
  const ph = usePostHog();
  const [current, setCurrent] = useState(content);
  const [enhanced, setEnhanced] = useState(false);
  const [enhancing, setEnhancing] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard?.writeText(current);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }

  function download() {
    const blob = new Blob([current], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    ph?.capture("generator_downloaded", { filename, enhanced });
  }

  async function enhance() {
    setEnhancing(true);
    setError(null);
    try {
      const res = await fetch("/api/generate/llms-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, site }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Request failed");
      setCurrent(json.content);
      setEnhanced(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setEnhancing(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-mono text-sm">{filename}</CardTitle>
        <CardAction className="flex flex-wrap gap-2">
          {enhanceable &&
            (enhanced ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setCurrent(content);
                  setEnhanced(false);
                }}
              >
                <Undo2 /> Revert
              </Button>
            ) : (
              <Button variant="outline" size="sm" onClick={enhance} disabled={enhancing}>
                <Sparkles /> {enhancing ? "Enhancing…" : "Enhance with AI"}
              </Button>
            ))}
          <Button variant="outline" size="sm" onClick={copy}>
            <Copy /> {copied ? "Copied!" : "Copy"}
          </Button>
          <Button size="sm" onClick={download}>
            <Download /> Download
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        {error && (
          <p className="mb-2 rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-warning">
            {error}
          </p>
        )}
        <ScrollArea className="h-80 w-full rounded-md border bg-muted/40">
          <pre className="p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap break-words">
            {current}
          </pre>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
