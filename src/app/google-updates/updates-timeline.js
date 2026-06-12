"use client";

// Client island for the Google updates page: Core/Spam filter + a vertical
// timeline grouped by year.

import { useState } from "react";
import { Badge } from "@/components/ui/badge";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// "2026-05-21" -> "21 May 2026" (no Date parsing, so no timezone surprises).
function fmt(iso) {
  const [y, m, d] = iso.split("-");
  return `${Number(d)} ${MONTHS[Number(m) - 1]} ${y}`;
}

const TYPE_LABEL = { core: "Core", spam: "Spam" };
const TYPE_VARIANT = { core: "secondary", spam: "destructive" };

export default function UpdatesTimeline({ updates }) {
  const [type, setType] = useState("all");

  const counts = {
    all: updates.length,
    core: updates.filter((u) => u.type === "core").length,
    spam: updates.filter((u) => u.type === "spam").length,
  };
  const filtered = type === "all" ? updates : updates.filter((u) => u.type === type);

  // Group into { year: [updates] }, years descending (updates already newest-first).
  const byYear = new Map();
  for (const u of filtered) {
    const year = u.start.slice(0, 4);
    if (!byYear.has(year)) byYear.set(year, []);
    byYear.get(year).push(u);
  }
  const years = [...byYear.keys()].sort((a, b) => b.localeCompare(a));

  const FILTERS = [
    { key: "all", label: "All" },
    { key: "core", label: "Core" },
    { key: "spam", label: "Spam" },
  ];

  return (
    <div className="space-y-6">
      <div className="inline-flex rounded-md border p-0.5 text-xs">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setType(f.key)}
            className={`rounded px-2.5 py-1 ${
              type === f.key ? "bg-primary text-primary-foreground" : "text-muted-foreground"
            }`}
          >
            {f.label} <span className="opacity-70">({counts[f.key]})</span>
          </button>
        ))}
      </div>

      {years.map((year) => (
        <section key={year}>
          <h2 className="mb-3 text-lg font-semibold">{year}</h2>
          <ol className="ml-1.5 space-y-4 border-l pl-6">
            {byYear.get(year).map((u) => (
              <li key={u.name} className="relative">
                <span
                  aria-hidden="true"
                  className={`absolute -left-[1.97rem] top-1.5 size-3 rounded-full ring-4 ring-background ${
                    u.type === "spam" ? "bg-destructive" : "bg-primary"
                  }`}
                />
                <div className="rounded-lg border p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{u.name}</span>
                    <Badge variant={TYPE_VARIANT[u.type] || "outline"}>
                      {TYPE_LABEL[u.type] || u.type}
                    </Badge>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {fmt(u.start)} – {fmt(u.end)} · {u.duration} · {u.status}
                  </div>
                  {u.summary && (
                    <p className="mt-2 text-sm text-muted-foreground">{u.summary}</p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}
