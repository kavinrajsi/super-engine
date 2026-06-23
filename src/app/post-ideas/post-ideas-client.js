"use client";

// Social post-idea generator: choose a brand memory + topic + platforms,
// generate platform-native posts, copy each, and browse saved sets.

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { usePostHog } from "posthog-js/react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { useActiveSite } from "@/components/active-site-provider";

const PLATFORMS = [
  { key: "instagram", label: "Instagram" },
  { key: "x", label: "X (Twitter)" },
  { key: "linkedin", label: "LinkedIn" },
  { key: "facebook", label: "Facebook" },
  { key: "tiktok", label: "TikTok" },
  { key: "threads", label: "Threads" },
];

const PLATFORM_LABEL = Object.fromEntries(PLATFORMS.map((p) => [p.key, p.label]));

function postToText(post) {
  const tags = (post.hashtags || []).map((h) => `#${h}`).join(" ");
  return [post.hook, "", post.caption, "", post.cta, tags].filter(Boolean).join("\n");
}

function PostCard({ post }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard?.writeText(postToText(post));
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }
  return (
    <Card>
      <CardContent className="space-y-2 py-4">
        <div className="flex items-center justify-between gap-2">
          <Badge variant="secondary">{PLATFORM_LABEL[post.platform] || post.platform}</Badge>
          <Button variant="ghost" size="xs" onClick={copy}>
            {copied ? "Copied!" : "Copy"}
          </Button>
        </div>
        <p className="font-medium">{post.hook}</p>
        <p className="whitespace-pre-wrap text-sm text-muted-foreground">{post.caption}</p>
        {post.cta && <p className="text-sm font-medium">{post.cta}</p>}
        {post.hashtags?.length > 0 && (
          <p className="text-xs text-primary">{post.hashtags.map((h) => `#${h}`).join(" ")}</p>
        )}
      </CardContent>
    </Card>
  );
}

export default function PostIdeasClient() {
  const ph = usePostHog();
  const { activeSite } = useActiveSite();
  const searchParams = useSearchParams();
  const [profiles, setProfiles] = useState([]);
  const [profileId, setProfileId] = useState("");
  const [topic, setTopic] = useState(searchParams.get("topic") || "");
  const [selected, setSelected] = useState(["instagram", "x"]);
  const [state, setState] = useState("idle"); // idle | loading | done | error
  const [error, setError] = useState(null);
  const [posts, setPosts] = useState([]);
  const [saved, setSaved] = useState([]);
  const [openId, setOpenId] = useState(null);
  const [aiModel, setAiModel] = useState(null);

  async function loadSaved() {
    try {
      const res = await fetch("/api/post-ideas");
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

  async function setSchedule(id, dateStr) {
    const scheduled_for = dateStr ? new Date(`${dateStr}T09:00:00`).toISOString() : null;
    try {
      const res = await fetch(`/api/content/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduled_for }),
      });
      if (res.ok) {
        setSaved((prev) => prev.map((it) => (it.id === id ? { ...it, scheduled_for } : it)));
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

  function toggle(key) {
    setSelected((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  }

  async function generate() {
    if (!topic.trim()) {
      setError("Enter a topic.");
      setState("error");
      return;
    }
    if (!selected.length) {
      setError("Select at least one platform.");
      setState("error");
      return;
    }
    setState("loading");
    setError(null);
    try {
      const res = await fetch("/api/post-ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId: profileId || null, topic, platforms: selected }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Generation failed");
      setPosts(json.result?.posts || []);
      setState("done");
      ph?.capture("post_ideas_generated", { topic, platforms: selected.join(",") });
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
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="topic">Topic / theme</Label>
            <Input
              id="topic"
              placeholder="e.g. Launching our summer collection"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Platforms</Label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {PLATFORMS.map((p) => (
                <label key={p.key} className="flex cursor-pointer items-center gap-2 text-sm">
                  <Checkbox
                    checked={selected.includes(p.key)}
                    onCheckedChange={() => toggle(p.key)}
                  />
                  {p.label}
                </label>
              ))}
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex items-center gap-3">
            <Button onClick={generate} disabled={state === "loading"}>
              <Sparkles />
              {state === "loading" ? "Generating…" : "Generate post ideas"}
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

      {state === "done" && posts.length > 0 && (
        <div className="space-y-3">
          {posts.map((post, i) => (
            <PostCard key={i} post={post} />
          ))}
        </div>
      )}

      {saved.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Saved post sets</h2>
          {saved.map((item) => (
            <Card key={item.id}>
              <CardContent className="py-4">
                <div className="flex items-center justify-between gap-4">
                  <button
                    type="button"
                    onClick={() => setOpenId(openId === item.id ? null : item.id)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <span className="block truncate font-medium">{item.topic}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {(item.platforms || "")
                        .split(",")
                        .filter(Boolean)
                        .map((k) => PLATFORM_LABEL[k] || k)
                        .join(", ")}
                    </span>
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
                    <input
                      type="date"
                      aria-label="Schedule date"
                      value={item.scheduled_for ? item.scheduled_for.slice(0, 10) : ""}
                      onChange={(e) => setSchedule(item.id, e.target.value)}
                      className="h-7 rounded-md border border-input bg-transparent px-2 text-xs outline-none focus-visible:border-ring"
                      title="Schedule on the calendar"
                    />
                    <span className="text-xs text-muted-foreground">
                      {new Date(item.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                {openId === item.id && item.data?.posts && (
                  <div className="mt-4 space-y-3">
                    {item.data.posts.map((post, i) => (
                      <PostCard key={i} post={post} />
                    ))}
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
