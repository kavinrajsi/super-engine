"use client";

// Daily ideas: a "Generate now" button + the saved idea sets (each with several
// idea cards). "Draft a post" deep-links into Post Ideas with the title prefilled.

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sparkles, Newspaper } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useActiveSite } from "@/components/active-site-provider";

const PLATFORM_LABEL = {
  instagram: "Instagram",
  x: "X",
  linkedin: "LinkedIn",
  facebook: "Facebook",
  tiktok: "TikTok",
  threads: "Threads",
  blog: "Blog",
};

function IdeaCard({ idea }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-sm font-semibold">{idea.title}</h3>
        <Link
          href={`/post-ideas?topic=${encodeURIComponent(idea.title)}`}
          className={buttonVariants({ variant: "outline", size: "xs", className: "shrink-0" })}
        >
          Draft a post
        </Link>
      </div>
      {idea.angle && <p className="mt-1 text-xs text-muted-foreground">{idea.angle}</p>}
      {idea.hook && <p className="mt-2 text-sm">{idea.hook}</p>}
      {idea.suggestedPlatforms?.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {idea.suggestedPlatforms.map((p) => (
            <Badge key={p} variant="secondary">
              {PLATFORM_LABEL[p] || p}
            </Badge>
          ))}
        </div>
      )}
      {idea.rationale && <p className="mt-2 text-xs text-muted-foreground">{idea.rationale}</p>}
    </div>
  );
}

export default function IdeasClient() {
  const { activeSite } = useActiveSite();
  const [saved, setSaved] = useState([]);
  const [state, setState] = useState("idle"); // idle | loading | error
  const [error, setError] = useState(null);

  async function load() {
    try {
      const res = await fetch("/api/ideas");
      const json = await res.json();
      setSaved(json.items || []);
    } catch {
      setSaved([]);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function generate() {
    setState("loading");
    setError(null);
    try {
      const res = await fetch("/api/ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Generation failed");
      setState("idle");
      load();
    } catch (e) {
      setError(e.message);
      setState("error");
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
          <div className="text-sm text-muted-foreground">
            {activeSite?.website_url ? (
              <>
                Ideas for <span className="font-medium text-foreground">{activeSite.website_url}</span>
              </>
            ) : (
              <>
                Add a site with a URL in{" "}
                <Link href="/profiles" className="underline">
                  Brand Memory
                </Link>{" "}
                to generate ideas.
              </>
            )}
          </div>
          <Button onClick={generate} disabled={state === "loading" || !activeSite?.website_url}>
            <Sparkles />
            {state === "loading" ? "Scanning…" : "Generate now"}
          </Button>
        </CardContent>
      </Card>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {saved.length === 0 && state !== "loading" && (
        <p className="text-sm text-muted-foreground">
          No ideas yet — they&rsquo;re generated each morning, or hit Generate now.
        </p>
      )}

      {saved.map((item) => (
        <div key={item.id} className="space-y-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Newspaper className="size-3.5" />
            {new Date(item.created_at).toLocaleString()}
            {item.topic ? ` · ${item.topic}` : ""}
            {item.data?.gscUsed ? " · GSC" : ""}
          </div>
          <div className="grid gap-3">
            {(item.data?.ideas || []).map((idea, i) => (
              <IdeaCard key={i} idea={idea} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
