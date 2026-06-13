"use client";

// Dashboard shell: sidebar + sticky header + the active section panel.

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePostHog } from "posthog-js/react";
import { Check, Share2 } from "lucide-react";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Button, buttonVariants } from "@/components/ui/button";
import AppSidebar from "./app-sidebar";
import OverviewPanel from "./overview-panel";
import PagesPanel from "./pages-panel";
import IssuesPanel from "./issues-panel";
import AiReadinessPanel from "./ai-readiness-panel";
import TrackingPanel from "./tracking-panel";
import PerformancePanel from "./performance-panel";

function ShareButton({ shareToken }) {
  const ph = usePostHog();
  const [copied, setCopied] = useState(false);
  if (!shareToken) return null;
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => {
        navigator.clipboard?.writeText(`${window.location.origin}/r/${shareToken}`);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
        ph?.capture("share_created", { token: shareToken });
      }}
    >
      {copied ? <Check /> : <Share2 />}
      {copied ? "Link copied" : "Share"}
    </Button>
  );
}

function ProUpsell({ feature }) {
  return (
    <div className="mx-auto max-w-md rounded-lg border bg-card p-6 text-center">
      <div className="text-2xl">🔒</div>
      <h3 className="mt-2 text-lg font-semibold">{feature} is a Pro feature</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Upgrade to Pro to unlock {feature}, deep scans, Search Console, and saved history.
      </p>
      <Link href="/pricing" className={buttonVariants({ className: "mt-4" })}>
        Upgrade to Pro
      </Link>
    </div>
  );
}

export default function ScanDashboard({ result, exportHref, reportHref, shareToken, pro = true }) {
  const [active, setActive] = useState("ai");
  const ph = usePostHog();

  const issueCount = result.pages.reduce(
    (n, p) => n + (p.audit ? p.audit.counts.error + p.audit.counts.warning : 0),
    0
  );

  useEffect(() => {
    ph?.capture("scan_run", {
      url: result.rootUrl,
      siteScore: result.siteScore,
      aiOverall: result.aiReadiness?.overall,
      pages: result.pages.length,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <SidebarProvider>
      <AppSidebar active={active} onSelect={setActive} issueCount={issueCount} pro={pro} />
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b bg-background/95 px-4 backdrop-blur">
          <SidebarTrigger />
          <Separator orientation="vertical" className="h-5" />
          <div className="min-w-0 flex-1 truncate text-sm font-medium" title={result.rootUrl}>
            {result.rootUrl}
          </div>
          <a
            href={exportHref}
            className={buttonVariants({ variant: "outline", size: "sm", className: "hidden sm:inline-flex" })}
          >
            CSV
          </a>
          <a
            href={reportHref}
            className={buttonVariants({ variant: "outline", size: "sm", className: "hidden sm:inline-flex" })}
          >
            JSON
          </a>
          <a
            href={`${reportHref}&format=md`}
            className={buttonVariants({ variant: "outline", size: "sm", className: "hidden sm:inline-flex" })}
          >
            MD
          </a>
          <a
            href={reportHref.replace("/api/report?", "/report?")}
            target="_blank"
            rel="noreferrer"
            className={buttonVariants({ variant: "outline", size: "sm", className: "hidden sm:inline-flex" })}
          >
            PDF
          </a>
          <ShareButton shareToken={shareToken} />
          <Link href="/" className={buttonVariants({ size: "sm" })}>
            New scan
          </Link>
        </header>

        <main className="flex-1 p-4 md:p-6">
          {result.redirected && (
            <p className="mb-4 text-xs text-muted-foreground">
              Scanned <span className="font-medium text-foreground">{result.rootUrl}</span> —
              redirected from{" "}
              <span className="font-mono">{new URL(result.requestedUrl).host}</span>.
            </p>
          )}
          {active === "overview" && <OverviewPanel result={result} onSelect={setActive} />}
          {active === "pages" && <PagesPanel result={result} pro={pro} />}
          {active === "issues" && <IssuesPanel result={result} />}
          {active === "ai" && <AiReadinessPanel readiness={result.aiReadiness} />}
          {active === "performance" &&
            (pro ? <PerformancePanel url={result.rootUrl} /> : <ProUpsell feature="Performance" />)}
          {active === "tracking" && <TrackingPanel analytics={result.analytics} />}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
