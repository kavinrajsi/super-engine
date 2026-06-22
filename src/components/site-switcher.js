"use client";

// Active-site switcher for the app sidebar header. Lists the user's brand
// profiles (their site); choosing one marks it active (last_used_at) so it
// becomes the default across the dashboard, content tools, and scan entry.

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Globe } from "lucide-react";
import { useActiveSite } from "@/components/active-site-provider";

function siteLabel(p) {
  return p.website_url || p.name || "Untitled site";
}

export default function SiteSwitcher() {
  const router = useRouter();
  const { activeSite, profiles } = useActiveSite();
  const [busy, setBusy] = useState(false);

  // No sites yet — point the user at Brand Memory to create one.
  if (!profiles?.length) {
    return (
      <Link
        href="/profiles"
        className="flex items-center gap-2 rounded-md border border-dashed px-2.5 py-1.5 text-xs text-muted-foreground no-underline hover:bg-sidebar-accent"
      >
        <Globe className="size-3.5" />
        <span>Add your site</span>
      </Link>
    );
  }

  async function onChange(e) {
    const id = e.target.value;
    if (!id || id === String(activeSite?.id)) return;
    setBusy(true);
    try {
      await fetch(`/api/profiles/${id}/activate`, { method: "POST" });
      router.refresh();
    } catch {
      /* best-effort — selection just won't persist */
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-1 px-1">
      <label className="flex items-center gap-1.5 px-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        <Globe className="size-3" />
        Active site
      </label>
      <select
        aria-label="Active site"
        value={activeSite?.id ?? ""}
        onChange={onChange}
        disabled={busy}
        className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-60 dark:bg-input/30"
      >
        {profiles.map((p) => (
          <option key={p.id} value={p.id}>
            {siteLabel(p)}
          </option>
        ))}
      </select>
      <Link
        href="/profiles"
        className="block px-1 text-[11px] text-muted-foreground no-underline hover:text-foreground hover:underline"
      >
        Manage sites →
      </Link>
    </div>
  );
}
