"use client";

// Dashboard shell: sidebar + sticky header + the active section panel.

import { useState } from "react";
import Link from "next/link";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { buttonVariants } from "@/components/ui/button";
import AppSidebar from "./app-sidebar";
import OverviewPanel from "./overview-panel";
import PagesPanel from "./pages-panel";
import IssuesPanel from "./issues-panel";
import AiReadinessPanel from "./ai-readiness-panel";
import TrackingPanel from "./tracking-panel";
import GeneratorsPanel from "./generators-panel";
import PerformancePanel from "./performance-panel";

export default function ScanDashboard({ result, exportHref, reportHref }) {
  const [active, setActive] = useState("ai");

  const issueCount = result.pages.reduce(
    (n, p) => n + (p.audit ? p.audit.counts.error + p.audit.counts.warning : 0),
    0
  );

  return (
    <SidebarProvider>
      <AppSidebar active={active} onSelect={setActive} issueCount={issueCount} />
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b bg-background/95 px-4 backdrop-blur">
          <SidebarTrigger />
          <Separator orientation="vertical" className="h-5" />
          <div className="min-w-0 flex-1 truncate text-sm font-medium" title={result.rootUrl}>
            {result.rootUrl}
          </div>
          <a href={exportHref} className={buttonVariants({ variant: "outline", size: "sm" })}>
            CSV
          </a>
          <a href={reportHref} className={buttonVariants({ variant: "outline", size: "sm" })}>
            JSON
          </a>
          <Link href="/" className={buttonVariants({ size: "sm" })}>
            New scan
          </Link>
        </header>

        <main className="flex-1 p-4 md:p-6">
          {active === "overview" && <OverviewPanel result={result} onSelect={setActive} />}
          {active === "pages" && <PagesPanel result={result} />}
          {active === "issues" && <IssuesPanel result={result} />}
          {active === "ai" && <AiReadinessPanel readiness={result.aiReadiness} />}
          {active === "performance" && <PerformancePanel url={result.rootUrl} />}
          {active === "tracking" && <TrackingPanel analytics={result.analytics} />}
          {active === "generators" && <GeneratorsPanel result={result} />}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
