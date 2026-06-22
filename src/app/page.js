// Go-to-market landing page. Standalone marketing layout (no app sidebar),
// styled as a crawler's-eye "instrument": mono structural labels, hairline
// panels, a live audit readout hero, and the AI Visibility Spectrum signature.

import {
  ListChecks,
  Wrench,
  GitCompareArrows,
  BarChart3,
  Radar,
  Sparkles,
  FileCheck,
  Link2,
} from "lucide-react";
import SiteFooter from "@/components/site-footer";
import MarketingNav from "@/components/marketing/marketing-nav";
import HeroAuditForm from "@/components/marketing/hero-audit-form";
import ReportCard from "@/components/marketing/report-card";
import AiSpectrum from "@/components/marketing/ai-spectrum";

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

// Crawler access log — encodes a real thing: which AI bots your robots.txt lets
// reach (and cite) your content.
const CRAWLERS = [
  { name: "GPTBot", allow: true },
  { name: "OAI-SearchBot", allow: true },
  { name: "ClaudeBot", allow: true },
  { name: "PerplexityBot", allow: true },
  { name: "Google-Extended", allow: true },
  { name: "Applebot-Extended", allow: true },
  { name: "CCBot", allow: false },
  { name: "Bytespider", allow: false },
];

const FEATURES = [
  {
    tag: "audit",
    icon: ListChecks,
    title: "Full SEO audit",
    blurb:
      "Title, meta, Open Graph, Twitter cards, canonical, headings and schema — graded per page with plain-language fixes.",
  },
  {
    tag: "fix",
    icon: Wrench,
    title: "Issues & AI fixes",
    blurb:
      "Every error and warning across your site in one ranked board, each with a recommendation and an AI-written fix.",
  },
  {
    tag: "intel",
    icon: GitCompareArrows,
    title: "Competitors & compare",
    blurb:
      "Auto-discover who you compete with in organic and AI search, then benchmark SEO and AI-readiness head to head.",
  },
  {
    tag: "data",
    icon: BarChart3,
    title: "Analytics + Search Console",
    blurb:
      "Connect Google once to see GA4 traffic and Search Console queries, pages and ranking opportunities together.",
  },
  {
    tag: "watch",
    icon: Radar,
    title: "Scheduled monitors",
    blurb: "Re-scan saved sites on a schedule and get an email the moment your score drops.",
  },
  {
    tag: "content",
    icon: Sparkles,
    title: "AI content studio",
    blurb:
      "Brand Memory, full SEO/GEO articles and platform-native social posts — with your own model and API key if you want.",
  },
  {
    tag: "access",
    icon: FileCheck,
    title: "llms.txt & ai.txt",
    blurb:
      "Validate your llms.txt, llms-full.txt and ai.txt line by line against the spec — the new robots.txt for AI.",
  },
  {
    tag: "links",
    icon: Link2,
    title: "Link intelligence",
    blurb:
      "Broken links, redirect chains, outbound link quality and an internal-link graph on deep scans.",
  },
];

const PIPELINE = [
  {
    step: "01",
    verb: "fetch",
    blurb: "We read your sitemap and pages, rendering JS-heavy pages in a real browser when needed.",
  },
  {
    step: "02",
    verb: "parse",
    blurb: "Every signal extracted and scored — classic on-page SEO plus the four AI-search lenses.",
  },
  {
    step: "03",
    verb: "report",
    blurb: "Scores per page, a ranked issue list, and exactly what to change to climb.",
  },
];

function Eyebrow({ children }) {
  return (
    <p className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-muted-foreground">
      <span aria-hidden="true" className="size-1.5 bg-primary" />
      {children}
    </p>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen">
      <MarketingNav />

      <main id="top">
        {/* Hero — a live audit readout */}
        <section className="border-b" aria-label="Audit your site">
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-24">
            <div id="audit">
              <Eyebrow>SEO + AI-search audit</Eyebrow>
              <h1 className="mt-5 font-display text-4xl font-bold leading-[1.05] tracking-tight text-balance sm:text-5xl lg:text-6xl">
                Rank on Google.
                <br />
                Get cited by AI.
                <span className="blink ml-1 font-normal text-primary" aria-hidden="true">
                  _
                </span>
              </h1>
              <p className="mt-5 max-w-xl text-pretty text-lg text-muted-foreground">
                MadRank grades your on-page SEO and your readiness for AI answer engines — ChatGPT,
                Perplexity, Claude, Gemini and Google AI Overviews — in a single scan, then hands you
                the fixes.
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

        {/* The signature: AI Visibility Spectrum */}
        <section id="ai-search" className="border-b" aria-label="AI-search readiness">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
            <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
              <div className="lg:sticky lg:top-24">
                <Eyebrow>the four lenses</Eyebrow>
                <h2 className="mt-5 font-display text-3xl font-bold tracking-tight sm:text-4xl">
                  Built for the four ways AI finds you
                </h2>
                <p className="mt-4 text-lg text-muted-foreground">
                  Most tools grade you for Google&rsquo;s ten blue links. MadRank scores four more
                  lenses that decide whether AI engines surface and cite you — and shows you exactly
                  where you stand on each.
                </p>
              </div>
              <AiSpectrum />
            </div>
          </div>
        </section>

        {/* Crawler access log */}
        <section className="border-b bg-muted/30" aria-label="AI crawlers checked">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
            <Eyebrow>crawler access</Eyebrow>
            <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_1.2fr] lg:items-center">
              <p className="max-w-md text-lg text-muted-foreground">
                We read your robots.txt, llms.txt and ai.txt to show exactly which AI systems can
                reach — and cite — your content.
              </p>
              <div className="overflow-hidden rounded-xl border bg-card">
                <div className="flex items-center justify-between border-b bg-muted/40 px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  <span>GET /robots.txt</span>
                  <span className="text-pass">200</span>
                </div>
                <ul className="divide-y font-mono text-sm">
                  {CRAWLERS.map((c) => (
                    <li key={c.name} className="flex items-center justify-between px-4 py-2">
                      <span className="text-foreground">{c.name}</span>
                      <span className={c.allow ? "text-pass" : "text-error"}>
                        {c.allow ? "allow" : "deny"}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Feature grid */}
        <section id="features" className="border-b" aria-label="Features">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
            <Eyebrow>the workbench</Eyebrow>
            <h2 className="mt-5 max-w-2xl font-display text-3xl font-bold tracking-tight sm:text-4xl">
              Everything you need to win search — old and new
            </h2>
            <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
              One scan, then a full workbench: fixes, competitors, live analytics, monitoring and an
              AI content studio.
            </p>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {FEATURES.map((f) => (
                <div
                  key={f.title}
                  className="rounded-xl border bg-card p-5 transition-colors hover:border-primary"
                >
                  <div className="flex items-center justify-between">
                    <f.icon className="size-5 text-primary" />
                    <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                      {f.tag}
                    </span>
                  </div>
                  <h3 className="mt-4 text-sm font-semibold">{f.title}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">{f.blurb}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pipeline — a real ordered sequence */}
        <section id="how" className="border-b" aria-label="How it works">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
            <Eyebrow>request → parse → report</Eyebrow>
            <h2 className="mt-5 font-display text-3xl font-bold tracking-tight sm:text-4xl">
              From URL to fixes in one scan
            </h2>
            <div className="mt-10 grid gap-px overflow-hidden rounded-xl border bg-border sm:grid-cols-3">
              {PIPELINE.map((s) => (
                <div key={s.step} className="bg-card p-6">
                  <div className="flex items-baseline gap-2 font-mono text-sm">
                    <span className="text-muted-foreground">{s.step}</span>
                    <span className="font-semibold text-primary-link">{s.verb}</span>
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground">{s.blurb}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA band */}
        <section aria-label="Run a free audit">
          <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-4 py-20 text-center sm:px-6 lg:py-28">
            <Eyebrow>start free</Eyebrow>
            <h2 className="max-w-2xl font-display text-3xl font-bold tracking-tight text-balance sm:text-4xl">
              See what Google — and AI — see on your site.
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
