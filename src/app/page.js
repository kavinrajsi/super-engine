// Go-to-market landing page. Standalone marketing layout (no app sidebar) built
// to convert: live "report card" hero, the four-lens AI-search pitch, real
// feature grid, pricing teaser, and a repeated audit CTA.

import Link from "next/link";
import {
  ListChecks,
  Wrench,
  GitCompareArrows,
  BarChart3,
  Radar,
  Sparkles,
  FileCheck,
  Link2,
  ArrowRight,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { PLANS, PRO_PRICING } from "@/lib/auth/plan";
import SiteFooter from "@/components/site-footer";
import MarketingNav from "@/components/marketing/marketing-nav";
import HeroAuditForm from "@/components/marketing/hero-audit-form";
import ReportCard from "@/components/marketing/report-card";
import LensCard from "@/components/marketing/lens-card";

export const metadata = {
  title: "MadRank — rank on Google and get cited by AI",
  description:
    "Audit any site's on-page SEO and its readiness for AI answer engines — AEO, GEO, AIO, AGO — in one scan. Plain-language fixes, competitor benchmarks, live Search Console + GA4. Start free.",
  openGraph: {
    title: "MadRank — rank on Google and get cited by AI",
    description:
      "One scan grades your on-page SEO and how well ChatGPT, Perplexity, Claude, Gemini and Google AI Overviews can find and cite you — then hands you the fixes.",
    type: "website",
    siteName: "MadRank",
  },
};

const LENSES = [
  {
    code: "AEO",
    title: "Answer Engine Optimization",
    blurb:
      "Be the direct answer in ChatGPT and Perplexity: FAQ schema, question-shaped headings and concise, extractable answers.",
    engines: ["ChatGPT", "Perplexity"],
    color: "var(--chart-1)",
  },
  {
    code: "GEO",
    title: "Generative Engine Optimization",
    blurb:
      "Be citable by Claude and Gemini: clear authorship, dates, real depth, and lists and tables a model can lift.",
    engines: ["Claude", "Gemini"],
    color: "var(--chart-2)",
  },
  {
    code: "AIO",
    title: "AI Overviews Optimization",
    blurb:
      "Be machine-readable for Google AI Overviews: schema.org, clean meta, semantic landmarks and freshness signals.",
    engines: ["Google AI Overviews"],
    color: "var(--chart-3)",
  },
  {
    code: "AGO",
    title: "Agent & bot access",
    blurb:
      "Be reachable: llms.txt and ai.txt validation plus a robots.txt audit of every major AI crawler.",
    engines: ["GPTBot", "ClaudeBot", "Google-Extended"],
    color: "var(--chart-5)",
  },
];

const BOTS = [
  "GPTBot",
  "OAI-SearchBot",
  "ClaudeBot",
  "PerplexityBot",
  "Google-Extended",
  "Applebot-Extended",
  "CCBot",
  "Bytespider",
];

const FEATURES = [
  {
    icon: ListChecks,
    title: "Full SEO audit",
    blurb:
      "Title, meta, Open Graph, Twitter cards, canonical, headings and schema — graded per page with plain-language fixes.",
  },
  {
    icon: Wrench,
    title: "Issues & AI fixes",
    blurb:
      "Every error and warning across your site in one ranked board, each with a recommendation. Generate AI-written fixes on Pro.",
  },
  {
    icon: GitCompareArrows,
    title: "Competitors & compare",
    blurb:
      "Auto-discover who you compete with in organic and AI search, then benchmark SEO and AI-readiness head to head.",
  },
  {
    icon: BarChart3,
    title: "Analytics + Search Console",
    blurb:
      "Connect Google once to see GA4 traffic and Search Console queries, pages and ranking opportunities together.",
  },
  {
    icon: Radar,
    title: "Scheduled monitors",
    blurb:
      "Re-scan saved sites on a schedule and get an email the moment your score drops.",
  },
  {
    icon: Sparkles,
    title: "AI content studio",
    blurb:
      "Brand Memory, full SEO/GEO articles and platform-native social posts — with your own model and API key if you want.",
  },
  {
    icon: FileCheck,
    title: "llms.txt & ai.txt",
    blurb:
      "Validate your llms.txt, llms-full.txt and ai.txt line by line against the spec — the new robots.txt for AI.",
  },
  {
    icon: Link2,
    title: "Link intelligence",
    blurb:
      "Broken links, redirect chains, outbound link quality and an internal-link graph on deep scans.",
  },
];

const STEPS = [
  {
    n: "01",
    title: "Enter a URL",
    blurb: "Paste any domain. No setup, no tag to install, no waiting.",
  },
  {
    n: "02",
    title: "We crawl your sitemap & pages",
    blurb: "We read your sitemap (and crawl deeper on Pro), rendering JS-heavy pages when needed.",
  },
  {
    n: "03",
    title: "Get scores, issues & fixes",
    blurb: "SEO and AI-search scores per page, a ranked issue list, and exactly what to change.",
  },
];

const FREE_POINTS = [
  `${PLANS.free.scansPerDay} scans a day`,
  `${PLANS.free.maxPages} pages per scan`,
  "On-page SEO + AI-search audit",
  "Plain-language fixes & issues",
];
const PRO_POINTS = [
  `${PLANS.pro.scansPerDay} scans a day`,
  `${PLANS.pro.maxPages} pages per scan + deep scan`,
  "Performance (PageSpeed) & AI fixes",
  "Search Console + GA4 dashboard",
  "Competitors, monitors & saved history",
];

export default function Home() {
  return (
    <div className="min-h-screen">
      <MarketingNav />

      <main id="top">
        {/* Hero */}
        <section className="border-b" aria-label="Audit your site">
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-24">
            <div id="audit">
              <span className="font-mono text-xs font-semibold uppercase tracking-widest text-primary-link">
                SEO + AI-search audit
              </span>
              <h1 className="mt-4 text-balance text-4xl font-bold tracking-tight sm:text-5xl">
                Rank on Google — and get cited by AI.
              </h1>
              <p className="mt-4 max-w-xl text-pretty text-lg text-muted-foreground">
                MadRank grades your on-page SEO and your readiness for AI answer engines —
                ChatGPT, Perplexity, Claude, Gemini and Google AI Overviews — in a single scan,
                then hands you the fixes.
              </p>
              <div className="mt-8">
                <HeroAuditForm location="hero" />
              </div>
            </div>

            <div className="flex justify-center lg:justify-end">
              <ReportCard />
            </div>
          </div>
        </section>

        {/* Credibility strip — real AI crawlers we check */}
        <section className="border-b bg-muted/30" aria-label="AI crawlers checked">
          <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
            <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
              Checks the AI crawlers that matter
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {BOTS.map((b) => (
                <span
                  key={b}
                  className="rounded-full border bg-background px-3 py-1 font-mono text-xs text-foreground"
                >
                  {b}
                </span>
              ))}
            </div>
            <p className="mt-4 max-w-2xl text-sm text-muted-foreground">
              We read your robots.txt, llms.txt and ai.txt to show exactly which AI systems can
              reach — and cite — your content.
            </p>
          </div>
        </section>

        {/* The differentiator: four AI-search lenses */}
        <section id="ai-search" className="border-b" aria-label="AI-search readiness">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
            <div className="max-w-2xl">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Built for the four ways AI finds you
              </h2>
              <p className="mt-3 text-lg text-muted-foreground">
                Most tools grade you for Google&rsquo;s ten blue links. MadRank scores four more
                lenses that decide whether AI engines surface and cite you.
              </p>
            </div>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {LENSES.map((l) => (
                <LensCard key={l.code} {...l} />
              ))}
            </div>
          </div>
        </section>

        {/* Feature grid */}
        <section id="features" className="border-b" aria-label="Features">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
            <div className="max-w-2xl">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Everything you need to win search — old and new
              </h2>
              <p className="mt-3 text-lg text-muted-foreground">
                One scan, then a full workbench: fixes, competitors, live analytics, monitoring
                and an AI content studio.
              </p>
            </div>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {FEATURES.map((f) => (
                <div key={f.title} className="rounded-xl border bg-card p-5">
                  <f.icon className="size-5 text-primary" />
                  <h3 className="mt-3 text-sm font-semibold">{f.title}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">{f.blurb}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="border-b" aria-label="How it works">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              From URL to fixes in one scan
            </h2>
            <div className="mt-10 grid gap-8 sm:grid-cols-3">
              {STEPS.map((s) => (
                <div key={s.n}>
                  <div className="font-mono text-sm font-semibold text-primary-link">{s.n}</div>
                  <h3 className="mt-2 text-lg font-semibold">{s.title}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">{s.blurb}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing teaser */}
        <section id="pricing" className="border-b" aria-label="Pricing">
          <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:py-20">
            <div className="text-center">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Start free. Upgrade when you need more.
              </h2>
              <p className="mt-3 text-lg text-muted-foreground">
                No card to start. {PLANS.free.scansPerDay} full audits a day on the house.
              </p>
            </div>

            <div className="mt-10 grid gap-4 md:grid-cols-2">
              {/* Free */}
              <div className="flex flex-col rounded-xl border bg-card p-6">
                <div className="text-sm font-semibold text-muted-foreground">Free</div>
                <div className="mt-2 font-mono text-4xl font-bold">₹0</div>
                <ul className="mt-5 flex-1 space-y-2">
                  {FREE_POINTS.map((p) => (
                    <li key={p} className="flex items-start gap-2 text-sm">
                      <span className="mt-0.5" style={{ color: "var(--pass)" }}>✓</span>
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/login"
                  className={buttonVariants({ variant: "outline", className: "mt-6" })}
                >
                  Start free
                </Link>
              </div>

              {/* Pro */}
              <div className="relative flex flex-col rounded-xl border-2 border-primary bg-card p-6">
                <span className="absolute -top-3 left-6 rounded-full bg-primary px-3 py-0.5 text-xs font-semibold text-primary-foreground">
                  Popular
                </span>
                <div className="text-sm font-semibold text-muted-foreground">Pro</div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="font-mono text-4xl font-bold">{PRO_PRICING.monthly.amount}</span>
                  <span className="text-sm text-muted-foreground">{PRO_PRICING.monthly.per}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  or {PRO_PRICING.annual.amount}
                  {PRO_PRICING.annual.per} — {PRO_PRICING.annual.note}
                </p>
                <ul className="mt-5 flex-1 space-y-2">
                  {PRO_POINTS.map((p) => (
                    <li key={p} className="flex items-start gap-2 text-sm">
                      <span className="mt-0.5" style={{ color: "var(--pass)" }}>✓</span>
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
                <Link href="/pricing" className={buttonVariants({ className: "mt-6" })}>
                  Go Pro
                </Link>
              </div>
            </div>

            <div className="mt-6 text-center">
              <Link
                href="/pricing"
                className="inline-flex items-center gap-1 text-sm font-medium text-primary-link hover:underline"
              >
                See the full plan comparison <ArrowRight className="size-4" />
              </Link>
            </div>
          </div>
        </section>

        {/* Final CTA band */}
        <section aria-label="Run a free audit">
          <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-4 py-16 text-center sm:px-6 lg:py-24">
            <h2 className="max-w-2xl text-balance text-3xl font-bold tracking-tight sm:text-4xl">
              Find out what Google — and AI — see on your site.
            </h2>
            <div className="flex w-full justify-center">
              <HeroAuditForm location="footer_cta" />
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
