"use client";

// Article generator: choose a brand memory + topic, generate, view/copy/download,
// and browse previously saved articles.

import { useEffect, useState } from "react";
import { usePostHog } from "posthog-js/react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useActiveSite } from "@/components/active-site-provider";

function ArticleView({ article, markdown }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard?.writeText(markdown || "");
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }

  function download() {
    const blob = new Blob([markdown || ""], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${article.slug || "article"}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{article.title}</CardTitle>
        {article.metaDescription && (
          <p className="text-sm text-muted-foreground">{article.metaDescription}</p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={copy}>
            {copied ? "Copied!" : "Copy Markdown"}
          </Button>
          <Button size="sm" variant="ghost" onClick={download}>
            Download .md
          </Button>
        </div>
        <div className="space-y-4">
          {(article.sections || []).map((s, i) => (
            <section key={i}>
              <h2 className="text-lg font-semibold">{s.heading}</h2>
              <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{s.content}</p>
            </section>
          ))}
        </div>
        {article.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-2">
            {article.tags.map((t) => (
              <Badge key={t} variant="secondary">
                {t}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function ArticlesClient() {
  const ph = usePostHog();
  const { activeSite } = useActiveSite();
  const [profiles, setProfiles] = useState([]);
  const [profileId, setProfileId] = useState("");
  const [topic, setTopic] = useState("");
  const [keywords, setKeywords] = useState("");
  const [tone, setTone] = useState("");
  const [state, setState] = useState("idle"); // idle | loading | done | error
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null); // { article, markdown }
  const [saved, setSaved] = useState([]);
  const [openId, setOpenId] = useState(null);
  const [aiModel, setAiModel] = useState(null);

  async function loadSaved() {
    try {
      const res = await fetch("/api/articles");
      const json = await res.json();
      setSaved(json.items || []);
    } catch {
      setSaved([]);
    }
  }

  async function setStatus(id, status) {
    try {
      const res = await fetch(`/api/content/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setSaved((prev) => prev.map((it) => (it.id === id ? { ...it, status } : it)));
      }
    } catch {
      /* best-effort */
    }
  }

  useEffect(() => {
    fetch("/api/profiles")
      .then((r) => r.json())
      .then((j) => {
        const list = j.profiles || [];
        setProfiles(list);
        // Default to the active site when set, else the first profile.
        const preferred = list.find((p) => p.id === activeSite?.id) || list[0];
        if (preferred) setProfileId(preferred.id);
      })
      .catch(() => {});
    fetch("/api/ai-settings")
      .then((r) => r.json())
      .then((j) => setAiModel(j.settings?.model || j.defaultModel || null))
      .catch(() => {});
    loadSaved();
  }, []);

  async function generate() {
    if (!topic.trim()) {
      setError("Enter a topic.");
      setState("error");
      return;
    }
    setState("loading");
    setError(null);
    try {
      const res = await fetch("/api/articles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId: profileId || null, topic, keywords, tone }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Generation failed");
      setResult({ article: json.article, markdown: json.markdown });
      setState("done");
      ph?.capture("article_generated", { topic, hasProfile: !!profileId });
      loadSaved();
    } catch (e) {
      setError(e.message);
      setState("error");
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="space-y-1.5">
            <Label htmlFor="profile">Brand memory</Label>
            <select
              id="profile"
              value={profileId}
              onChange={(e) => setProfileId(e.target.value)}
              className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
            >
              <option value="">No profile (neutral voice)</option>
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            {profiles.length === 0 && (
              <p className="text-xs text-muted-foreground">
                No brand memory yet —{" "}
                <a href="/profiles" className="underline">
                  create one
                </a>{" "}
                for on-brand articles.
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="topic">Topic</Label>
            <Input
              id="topic"
              placeholder="e.g. How to choose running shoes for flat feet"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="keywords">Target keywords (optional)</Label>
              <Input
                id="keywords"
                placeholder="comma, separated"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tone">Tone (optional)</Label>
              <Input
                id="tone"
                placeholder="e.g. friendly, expert"
                value={tone}
                onChange={(e) => setTone(e.target.value)}
              />
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex items-center gap-3">
            <Button onClick={generate} disabled={state === "loading"}>
              <Sparkles />
              {state === "loading" ? "Writing…" : "Generate article"}
            </Button>
            {aiModel && (
              <span className="text-xs text-muted-foreground">
                Model: {aiModel} ·{" "}
                <a href="/ai-settings" className="underline">
                  change
                </a>
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {state === "done" && result?.article && (
        <ArticleView article={result.article} markdown={result.markdown} />
      )}

      {saved.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Saved articles</h2>
          {saved.map((item) => (
            <Card key={item.id}>
              <CardContent className="py-4">
                <div className="flex items-center justify-between gap-4">
                  <button
                    type="button"
                    onClick={() => setOpenId(openId === item.id ? null : item.id)}
                    className="min-w-0 flex-1 text-left font-medium"
                  >
                    <span className="block truncate">{item.title || item.topic}</span>
                  </button>
                  <div className="flex shrink-0 items-center gap-2">
                    {(item.status || "draft") === "approved" ? (
                      <Badge variant="secondary">Approved</Badge>
                    ) : (
                      <>
                        <Badge variant="outline">Draft</Badge>
                        <Button size="xs" variant="outline" onClick={() => setStatus(item.id, "approved")}>
                          Approve
                        </Button>
                      </>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {new Date(item.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                {openId === item.id && item.data && (
                  <div className="mt-4">
                    <ArticleView article={item.data} markdown={item.markdown} />
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
