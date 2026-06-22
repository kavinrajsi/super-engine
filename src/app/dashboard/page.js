// Agent dashboard (Server Component). The okara-style home: it leads with the
// active site, reuses that site's most recent audit (no re-scan), and routes
// the user into each "agent" (SEO / GEO / Content / Analytics) with site-aware
// context. No new analysis — it only reads an existing scan `result`.

import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ScanSearch,
  BarChart3,
  Users,
  Sparkles,
  Lightbulb,
  LineChart,
  ArrowRight,
  Plus,
} from "lucide-react";
import AppShell from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { currentUser } from "@/lib/auth/session";
import { isAuthConfigured } from "@/lib/auth/google";
import { getActiveSite, scanUrlCandidates } from "@/lib/site/active";
import { latestScanForUrl } from "@/lib/db/scans";
import { listContent } from "@/lib/db/content";
import { groupIssuesWithPages } from "@/lib/seo/gamify";
import ScoreRing from "@/app/scan/score-ring";

export const metadata = { title: "Dashboard — MadRank" };
export const dynamic = "force-dynamic";

function Shell({ children }) {
  return (
    <AppShell title="Dashboard">
      <div className="mx-auto max-w-5xl space-y-6 p-6">{children}</div>
    </AppShell>
  );
}

export default async function DashboardPage() {
  const user = isAuthConfigured() ? await currentUser() : null;
  if (isAuthConfigured() && !user) {
    redirect(`/login?next=${encodeURIComponent("/dashboard")}`);
  }

  const { activeSite } = await getActiveSite();

  // No site yet — onboarding empty state.
  if (!activeSite) {
    return (
      <Shell>
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <h1 className="text-2xl font-bold">Add your site to get started</h1>
            <p className="max-w-md text-muted-foreground">
              Your active site powers the whole workbench — audits, AI articles and social posts all
              default to it. Add it once in Brand Memory, then run your first scan.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link href="/profiles" className={buttonVariants()}>
                <Plus /> Add your site
              </Link>
              <Link href="/" className={buttonVariants({ variant: "outline" })}>
                <ScanSearch /> Run a scan
              </Link>
            </div>
          </CardContent>
        </Card>
      </Shell>
    );
  }

  const siteUrl = activeSite.website_url || "";
  const candidates = scanUrlCandidates(siteUrl);
  const [result, draftCount] = await Promise.all([
    candidates.length ? latestScanForUrl(candidates, user?.id ?? null, 60 * 24) : null,
    listContent(user?.id ?? null, { kind: "article", limit: 50 }).then(
      (items) => items.filter((i) => (i.status || "draft") === "draft").length
    ),
  ]);

  const siteScore = result?.siteScore ?? null;
  const aiOverall = result?.aiReadiness?.overall ?? null;
  const topIssues = result ? groupIssuesWithPages(result.pages).slice(0, 5) : [];
  const scanHref = `/seo?url=${encodeURIComponent(siteUrl || activeSite.name)}`;

  const agents = [
    {
      key: "seo",
      label: "SEO",
      icon: BarChart3,
      blurb: "On-page audit, issues and fixes for your pages.",
      stat: siteScore != null ? `${siteScore}/100 SEO score` : "Not scanned yet",
      href: "/seo",
    },
    {
      key: "geo",
      label: "AI readiness (GEO)",
      icon: Sparkles,
      blurb: "How well ChatGPT, Claude, Gemini & AI Overviews can cite you.",
      stat: aiOverall != null ? `${aiOverall}/100 AI score` : "Not scanned yet",
      href: "/seo",
    },
    {
      key: "competitors",
      label: "Competitors",
      icon: Users,
      blurb: "Discover who you compete with and benchmark head-to-head.",
      stat: "Discover & compare",
      href: "/competitors",
    },
    {
      key: "articles",
      label: "Articles",
      icon: Sparkles,
      blurb: "Publish-ready SEO/GEO articles in your brand voice.",
      stat: draftCount > 0 ? `${draftCount} draft${draftCount === 1 ? "" : "s"}` : "Write an article",
      href: "/articles",
    },
    {
      key: "social",
      label: "Post Ideas",
      icon: Lightbulb,
      blurb: "Platform-native social posts for every channel.",
      stat: "Generate posts",
      href: "/post-ideas",
    },
    {
      key: "analytics",
      label: "Analytics",
      icon: LineChart,
      blurb: "GA4 traffic and Search Console queries in one view.",
      stat: "Connect Google",
      href: "/seo",
    },
  ];

  return (
    <Shell>
      {/* Site header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Active site
          </p>
          <h1 className="truncate text-2xl font-bold">{siteUrl || activeSite.name}</h1>
        </div>
        <div className="flex items-center gap-4">
          {siteScore != null && <ScoreRing score={siteScore} size={72} label="SEO" />}
          {aiOverall != null && <ScoreRing score={aiOverall} size={72} label="AI" />}
          <Link href={scanHref} className={buttonVariants()}>
            <ScanSearch /> {result ? "Re-scan" : "Run scan"}
          </Link>
        </div>
      </div>

      {/* No recent scan — nudge to run one */}
      {!result && (
        <Card>
          <CardContent className="flex flex-wrap items-center justify-between gap-3 py-5">
            <p className="text-sm text-muted-foreground">
              No recent audit for this site. Run a scan to unlock recommendations across every agent.
            </p>
            <Link href={scanHref} className={buttonVariants({ variant: "outline", size: "sm" })}>
              <ScanSearch /> Scan now
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Top fixes from the latest scan */}
      {topIssues.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top fixes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {topIssues.map((issue) => (
              <Link
                key={issue.ruleKey}
                href={scanHref}
                className="flex items-start justify-between gap-3 rounded-lg border p-3 no-underline hover:bg-accent"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{issue.title}</p>
                  {issue.recommendation && (
                    <p className="truncate text-xs text-muted-foreground">{issue.recommendation}</p>
                  )}
                </div>
                <Badge variant={issue.severity === "error" ? "destructive" : "secondary"}>
                  {issue.occurrences.length} page{issue.occurrences.length === 1 ? "" : "s"}
                </Badge>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Agent grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {agents.map((a) => (
          <Link
            key={a.key}
            href={a.href}
            className="group rounded-xl border bg-card p-5 no-underline transition-colors hover:border-primary"
          >
            <div className="flex items-center justify-between">
              <a.icon className="size-5 text-primary" />
              <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </div>
            <h3 className="mt-3 text-sm font-semibold text-foreground">{a.label}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{a.blurb}</p>
            <p className="mt-3 text-xs font-medium text-primary-link">{a.stat}</p>
          </Link>
        ))}
      </div>
    </Shell>
  );
}
