"use client";

// The converting element, styled as a command bar: a plain GET form to /scan
// (works without JS) with a mono prompt marker, plus a "Start free" path and a
// deep-scan toggle. Reused in the hero and the final CTA band. Prefills the URL
// from the active site when one is set. Fires a PostHog cta_clicked event.

import Link from "next/link";
import { usePostHog } from "posthog-js/react";
import { Input } from "@/components/ui/input";
import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useActiveSite } from "@/components/active-site-provider";

export default function HeroAuditForm({ location = "hero" }) {
  const ph = usePostHog();
  const { activeSite } = useActiveSite();

  return (
    <div className="w-full max-w-xl">
      <form
        action="/scan"
        method="get"
        onSubmit={() => ph?.capture("cta_clicked", { cta: "run_audit", location })}
        className="flex flex-col gap-3"
      >
        {/* Command bar */}
        <div className="flex items-center gap-2 rounded-xl border bg-card p-1.5 pl-3 shadow-sm transition-colors focus-within:border-primary focus-within:ring-3 focus-within:ring-ring/30">
          <span aria-hidden="true" className="font-mono text-sm font-semibold text-primary">
            ▸
          </span>
          <Input
            key={activeSite?.website_url || "empty"}
            type="text"
            inputMode="url"
            name="url"
            placeholder="yourdomain.com"
            defaultValue={activeSite?.website_url || ""}
            required
            autoComplete="url"
            aria-label="Website URL"
            className="h-10 flex-1 border-0 bg-transparent px-1 font-mono text-base shadow-none focus-visible:border-0 focus-visible:ring-0"
          />
          <Button type="submit" size="lg" className="h-10 shrink-0 px-5">
            Run audit
          </Button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/login"
            onClick={() => ph?.capture("cta_clicked", { cta: "start_free", location })}
            className={buttonVariants({ variant: "outline", size: "sm", className: "text-foreground" })}
          >
            Start free with Google
          </Link>
          <Label className="flex cursor-pointer items-center gap-2 font-mono text-xs font-normal text-muted-foreground">
            <Checkbox name="deep" value="1" />
            deep scan
          </Label>
        </div>

        <p className="font-mono text-xs text-muted-foreground">
          <span className="text-pass">●</span> no card · 3 free scans / day · results in seconds
        </p>
      </form>
    </div>
  );
}
