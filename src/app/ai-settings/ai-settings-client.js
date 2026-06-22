"use client";

// Bring-your-own AI model + key. Pick a provider, pick/enter a model, paste the
// provider's API key. The key is sent once and stored encrypted; afterwards only
// "key saved" is shown.

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const selectClass =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

export default function AiSettingsClient() {
  const [providers, setProviders] = useState({});
  const [defaultModel, setDefaultModel] = useState("");
  const [provider, setProvider] = useState("");
  const [model, setModel] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [hasKey, setHasKey] = useState(false);
  const [status, setStatus] = useState("loading"); // loading | idle | saving | saved | error
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch("/api/ai-settings")
      .then((r) => r.json())
      .then((j) => {
        setProviders(j.providers || {});
        setDefaultModel(j.defaultModel || "");
        if (j.settings?.provider) setProvider(j.settings.provider);
        if (j.settings?.model) setModel(j.settings.model);
        setHasKey(!!j.settings?.hasKey);
        setStatus("idle");
      })
      .catch(() => setStatus("idle"));
  }, []);

  const current = providers[provider];

  function pickProvider(p) {
    setProvider(p);
    // default to the provider's first suggested model when switching
    const first = providers[p]?.models?.[0] || "";
    setModel(first);
  }

  async function save() {
    if (!provider) {
      setError("Choose a provider.");
      setStatus("error");
      return;
    }
    if (!model.trim()) {
      setError("Choose or enter a model.");
      setStatus("error");
      return;
    }
    if (!hasKey && !apiKey.trim()) {
      setError("Enter your API key for this provider.");
      setStatus("error");
      return;
    }
    setStatus("saving");
    setError(null);
    try {
      const res = await fetch("/api/ai-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, model: model.trim(), apiKey: apiKey.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Save failed");
      setHasKey(!!json.settings?.hasKey);
      setApiKey("");
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 2000);
    } catch (e) {
      setError(e.message);
      setStatus("error");
    }
  }

  async function removeKey() {
    if (!confirm("Remove your stored API key? Generation will fall back to the default model.")) {
      return;
    }
    try {
      await fetch("/api/ai-settings", { method: "DELETE" });
      setHasKey(false);
    } catch {
      /* best-effort */
    }
  }

  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        <div className="space-y-1.5">
          <Label htmlFor="provider">Provider</Label>
          <select
            id="provider"
            value={provider}
            onChange={(e) => pickProvider(e.target.value)}
            className={selectClass}
          >
            <option value="">Default (built-in gateway)</option>
            {Object.entries(providers).map(([key, p]) => (
              <option key={key} value={key}>
                {p.label}
              </option>
            ))}
          </select>
          {!provider && (
            <p className="text-xs text-muted-foreground">
              Using the built-in default model
              {defaultModel ? ` (${defaultModel})` : ""}. Pick a provider to use your own key.
            </p>
          )}
        </div>

        {provider && (
          <>
            <div className="space-y-1.5">
              <Label htmlFor="model">Model</Label>
              <select
                id="model"
                value={current?.models?.includes(model) ? model : "__custom"}
                onChange={(e) => setModel(e.target.value === "__custom" ? "" : e.target.value)}
                className={selectClass}
              >
                {(current?.models || []).map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
                <option value="__custom">Custom model id…</option>
              </select>
              {!current?.models?.includes(model) && (
                <Input
                  placeholder="exact model id, e.g. gpt-4o-2024-11-20"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                />
              )}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="apikey">API key</Label>
                {hasKey && (
                  <Badge variant="secondary">Key saved ••••</Badge>
                )}
              </div>
              <Input
                id="apikey"
                type="password"
                autoComplete="off"
                placeholder={hasKey ? "Enter a new key to replace" : current?.keyPlaceholder || "API key"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
              {current?.keyHelp && (
                <p className="text-xs text-muted-foreground">
                  Get a key at {current.keyHelp}. Stored encrypted; never shown again.
                </p>
              )}
            </div>
          </>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex gap-2">
          <Button onClick={save} disabled={status === "saving" || status === "loading"}>
            {status === "saving" ? "Saving…" : status === "saved" ? "✓ Saved" : "Save settings"}
          </Button>
          {hasKey && (
            <Button variant="ghost" onClick={removeKey}>
              Remove key
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
