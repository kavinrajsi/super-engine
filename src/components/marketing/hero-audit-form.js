"use client";

// The converting element: a plain GET form to /scan (works without JS) plus an
// equal-weight "Start free" button. Reused in the hero and the final CTA band.
// Fires a PostHog cta_clicked event tagged with where it was clicked.

import Link from "next/link";
import { usePostHog } from "posthog-js/react";
import { Input } from "@/components/ui/input";
import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

export default function HeroAuditForm({ location = "hero" }) {
  const ph = usePostHog();

  return (
    <div className="w-full max-w-xl">
      <form
        action="/scan"
        method="get"
        onSubmit={() => ph?.capture("cta_clicked", { cta: "run_audit", location })}
        className="flex flex-col gap-3"
      >
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            type="text"
            inputMode="url"
            name="url"
            placeholder="yourdomain.com"
            required
            autoComplete="url"
            aria-label="Website URL"
            className="h-12 flex-1 font-mono text-base"
          />
          <Button type="submit" size="lg" className="h-12 px-6 text-base">
            Run free audit
          </Button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/login"
            onClick={() => ph?.capture("cta_clicked", { cta: "start_free", location })}
            className={buttonVariants({ variant: "outline", size: "lg", className: "h-11 px-5 text-foreground" })}
          >
            Start free with Google
          </Link>
          <Label className="flex cursor-pointer items-center gap-2 text-sm font-normal text-muted-foreground">
            <Checkbox name="deep" value="1" />
            Deep scan
          </Label>
        </div>
      </form>

      <p className="mt-3 font-mono text-xs text-muted-foreground">
        No card · 3 free scans a day · results in seconds
      </p>
    </div>
  );
}
