"use client";

// Simple non-streaming chat UI: a message list + input. Posts the full message
// history to /api/chat and appends the reply.

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useActiveSite } from "@/components/active-site-provider";

const SUGGESTIONS = [
  "What should I fix first?",
  "How is my AI-search readiness?",
  "Summarize my site's SEO health.",
];

export default function AskClient() {
  const { activeSite } = useActiveSite();
  const [messages, setMessages] = useState([]); // {role, content}
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const listRef = useRef(null);

  async function send(text) {
    const content = (text ?? input).trim();
    if (!content || busy) return;
    setError(null);
    const next = [...messages, { role: "user", content }];
    setMessages(next);
    setInput("");
    setBusy(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Couldn't get an answer.");
      setMessages((m) => [...m, { role: "assistant", content: json.reply }]);
      requestAnimationFrame(() => listRef.current?.scrollTo(0, listRef.current.scrollHeight));
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      {!activeSite && (
        <p className="text-sm text-muted-foreground">
          Pick an active site in the sidebar for site-specific answers.
        </p>
      )}

      <div ref={listRef} className="max-h-[55vh] space-y-3 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <Button key={s} variant="outline" size="sm" onClick={() => send(s)} disabled={busy}>
                {s}
              </Button>
            ))}
          </div>
        ) : (
          messages.map((m, i) => (
            <Card key={i} className={m.role === "user" ? "border-primary/40" : ""}>
              <CardContent className="py-3">
                <div className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  {m.role === "user" ? "You" : "MadRank"}
                </div>
                <div className="whitespace-pre-wrap text-sm">{m.content}</div>
              </CardContent>
            </Card>
          ))
        )}
        {busy && <p className="px-1 text-sm text-muted-foreground">Thinking…</p>}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="flex items-center gap-2"
      >
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about your site…"
          className="flex-1"
        />
        <Button type="submit" disabled={busy || !input.trim()}>
          Send
        </Button>
      </form>
    </div>
  );
}
