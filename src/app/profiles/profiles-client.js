"use client";

// Brand Memory manager: list / create / edit / delete Markdown profiles.

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const TEMPLATE = `# About this website

**What we do:**

**Audience:**

**Brand voice / tone:**

**Core topics & keywords:**

**Products / services:**

**Things to avoid:**
`;

const EMPTY = { id: null, name: "", websiteUrl: "", markdown: "" };

export default function ProfilesClient() {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState(false);
  const [status, setStatus] = useState("idle"); // idle | saving | error
  const [error, setError] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/profiles");
      const json = await res.json();
      setProfiles(json.profiles || []);
    } catch {
      setProfiles([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function startNew() {
    setForm({ ...EMPTY, markdown: TEMPLATE });
    setEditing(true);
    setError(null);
  }

  function startEdit(p) {
    setForm({
      id: p.id,
      name: p.name || "",
      websiteUrl: p.website_url || "",
      markdown: p.markdown || "",
    });
    setEditing(true);
    setError(null);
  }

  function cancel() {
    setEditing(false);
    setForm(EMPTY);
    setError(null);
    setStatus("idle");
  }

  async function save() {
    if (!form.name.trim()) {
      setError("A profile name is required.");
      setStatus("error");
      return;
    }
    setStatus("saving");
    setError(null);
    try {
      const url = form.id ? `/api/profiles/${form.id}` : "/api/profiles";
      const res = await fetch(url, {
        method: form.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          websiteUrl: form.websiteUrl.trim(),
          markdown: form.markdown,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Save failed");
      setStatus("idle");
      cancel();
      load();
    } catch (e) {
      setError(e.message);
      setStatus("error");
    }
  }

  async function remove(p) {
    if (!confirm(`Delete profile "${p.name}"?`)) return;
    try {
      await fetch(`/api/profiles/${p.id}`, { method: "DELETE" });
      load();
    } catch {
      /* best-effort */
    }
  }

  if (editing) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{form.id ? "Edit profile" : "New profile"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Profile name</Label>
            <Input
              id="name"
              placeholder="e.g. Acme Blog"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="website">Website URL (optional)</Label>
            <Input
              id="website"
              placeholder="https://example.com"
              value={form.websiteUrl}
              onChange={(e) => setForm({ ...form, websiteUrl: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="markdown">Memory (Markdown)</Label>
            <Textarea
              id="markdown"
              className="min-h-80 font-mono text-xs"
              placeholder={TEMPLATE}
              value={form.markdown}
              onChange={(e) => setForm({ ...form, markdown: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              The more specific this is, the more on-brand your generated content will be.
            </p>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex gap-2">
            <Button onClick={save} disabled={status === "saving"}>
              {status === "saving" ? "Saving…" : "Save profile"}
            </Button>
            <Button variant="ghost" onClick={cancel}>
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Button onClick={startNew}>+ New profile</Button>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : profiles.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No profiles yet. Create one to power AI articles and post ideas.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {profiles.map((p) => (
            <Card key={p.id}>
              <CardContent className="flex items-start justify-between gap-4 py-4">
                <div className="min-w-0">
                  <p className="font-medium">{p.name}</p>
                  {p.website_url && (
                    <p className="truncate text-sm text-muted-foreground">{p.website_url}</p>
                  )}
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                    {(p.markdown || "").replace(/[#*`>-]/g, "").slice(0, 160) || "Empty memory"}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button variant="outline" size="sm" onClick={() => startEdit(p)}>
                    Edit
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => remove(p)}>
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
