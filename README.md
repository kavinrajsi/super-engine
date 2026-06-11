# Meta Tag — SEO & AI-Search Audit

A clean, Semrush-style SEO auditor that also grades a site for **AI search** (ChatGPT, Google AI Overviews, Perplexity). Enter a URL → it reads the sitemap, crawls pages, and reports on-page SEO, social tags, AI-readiness, trackers, performance, and more — with one-click AI fixes and publish-ready file generators.

**Live:** https://superengine.vercel.app

## Features

- **On-page SEO / SMO audit** — title, meta description, canonical, H1s, viewport, `lang`, robots (incl. `X-Robots-Tag` header), Open Graph + Twitter/X cards. Per-page score (0–100) + A–F grade with plain-language **What it means / Why it matters / How to fix**.
- **AI search readiness** across four lenses — **AEO** (answer engines), **GEO** (generative/citability), **AIO** (AI Overviews), **AGO** (agent/crawler access) — plus **validator-grade `llms.txt` / `llms-full.txt` / `ai.txt`** checking (line-numbered findings) and AI-crawler robots policy.
- **Sitemap discovery & crawl** — robots.txt hints + `/sitemap.xml`, nested `sitemapindex`, and a hybrid crawl (fast fetch with optional **headless** escalation for JS-rendered pages).
- **Tracker / heatmap detection** — Microsoft Clarity (with project ID), GA4, GTM, Hotjar, FullStory, **Meta Pixel / Facebook SDK / domain-verification**, and ~20 more.
- **AI-powered fixes** — rewrite titles/descriptions, generate OG/FAQ schema (Vercel AI Gateway).
- **Generators** — `sitemap.xml`, `llms.txt` (with optional AI enhance), `robots.txt`, `ai.txt` — in the dashboard and as standalone tools at `/tools`.
- **Site speed & performance** — Lighthouse scores, Core Web Vitals, and optimization tips via Google PageSpeed Insights.
- **Save, share & history** — every scan is persisted to Postgres (Neon); each gets a shareable `/r/[token]` link that reopens the saved report without re-scanning, and `/history` lists recent scans.
- **Exports** — CSV and JSON; shareable report data.
- **Dashboard** — sidebar sections (AI Readiness · Overview · Pages · Issues · Performance · Tracking · Generators), orange theme, light/dark mode.

## Tech stack

Next.js 16 (App Router, React 19, React Compiler, Turbopack) · JavaScript · Tailwind CSS v4 · shadcn/ui (Base UI) · cheerio · puppeteer-core (+ Browserbase) · Vercel AI SDK (v6) + zod · Neon Postgres (`@neondatabase/serverless`) · PostHog · recharts · next-themes · deployed on **Vercel**.

## Getting started

```bash
npm install
npm run dev      # http://localhost:3000
```

Scripts: `npm run dev` · `npm run build` · `npm run start` · `npm run lint`.

To enable persistence, set `DATABASE_URL` (and `DATABASE_URL_UNPOOLED`) and run the one-time migration:

```bash
node --env-file=.env.local scripts/migrate.mjs   # creates the scans table
```

## Environment variables

All are optional — the app degrades gracefully without them (no DB → scans just aren't saved; no token → no analytics).

| Variable | Enables | Notes |
| --- | --- | --- |
| `AI_GATEWAY_API_KEY` | AI fixes + llms.txt "Enhance with AI" | Local only; on Vercel this works automatically via OIDC. |
| `PAGESPEED_API_KEY` | Performance section | Keyless PSI hits Google's shared daily quota (429); a free key is required in practice. |
| `DATABASE_URL` | Save / share / history (Neon Postgres) | Pooled connection string; the serverless driver reads it at runtime. |
| `DATABASE_URL_UNPOOLED` | DB migration | Direct connection used by `scripts/migrate.mjs` (not needed at runtime). |
| `BROWSERBASE_API_KEY` + `BROWSERBASE_PROJECT_ID` | Headless rendering (prod) | Spins up a Browserbase session and connects over CDP. |
| `BROWSER_WS_ENDPOINT` | Headless rendering (prod) | Alternative: any remote browser CDP endpoint (Browserless / Cloudflare). |
| `CHROME_EXECUTABLE_PATH` | Headless rendering (local dev) | Path to a local Chrome/Chromium binary. |
| `NEXT_PUBLIC_superengine_POSTHOG_PROJECT_TOKEN` | Product analytics (PostHog) | Client-side; pageviews + key events. No-ops when unset. |
| `NEXT_PUBLIC_superengine_POSTHOG_HOST` | PostHog ingestion host | Defaults to `https://us.i.posthog.com`. |

Add on Vercel with `vercel env add <NAME>`.

## Project structure

```
src/
  app/
    page.js              Home (URL input + History / Free tools links)
    layout.js            Root layout (next-themes + PostHog provider)
    globals.css          Tailwind v4 + theme tokens (orange accent)
    scan/                Dashboard: scan-dashboard, app-sidebar, *-panel.js, score-ring, og-preview, ai-fix
    r/[token]/           Saved/shared report (read from Neon, no re-scan)
    history/             Recent scans list
    tools/               Standalone generators (/tools, /tools/sitemap|llms|robots|ai-txt)
    api/                 export, report, ai-fix, pagespeed, generate/llms-ai
  lib/
    seo/                 analyze (orchestrator), sitemap, crawl, headless, extract, rules,
                         ai-rules, ai-site, trackers, generate, explanations, gamify, safe-fetch
    ai/                  suggest-fixes (AI Gateway)
    db.js, db/scans.js   Neon client + saveScan / getScanByToken / recentScans
  components/
    ui/                  shadcn/ui (Base UI) components
    posthog-provider.js  Client analytics provider (no-ops without a token)
db/schema.sql            scans table DDL
scripts/migrate.mjs      One-time migration runner
```

The scan pipeline lives in `src/lib/seo/analyze.js` (`runScan`), which produces a single `result` object consumed by every dashboard panel and export. After a scan, `saveScan(result)` persists it as JSONB and returns a share token.

## Deploy

```bash
vercel deploy --prod
```

Auto-detected as Next.js. `puppeteer-core` is marked `serverExternalPackages`; headless rendering activates only when a browser endpoint env var is set.
