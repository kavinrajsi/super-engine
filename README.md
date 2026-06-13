# MadRank — SEO & AI-Search Audit

A clean, Semrush-style SEO auditor that also grades a site for **AI search** (ChatGPT, Google AI Overviews, Perplexity). Enter a URL → it reads the sitemap, crawls pages, and reports on-page SEO, social tags, AI-readiness, trackers, performance, and more — with one-click AI fixes.

**Live:** https://superengine.vercel.app

## Features

- **On-page SEO / SMO audit** — title, meta description, canonical, H1s, viewport, `lang`, robots (incl. `X-Robots-Tag` header), Open Graph + Twitter/X cards. Per-page score (0–100) + A–F grade with plain-language **What it means / Why it matters / How to fix**.
- **AI search readiness** across four lenses — **AEO** (answer engines), **GEO** (generative/citability), **AIO** (AI Overviews), **AGO** (agent/crawler access) — plus **validator-grade `llms.txt` / `llms-full.txt` / `ai.txt`** checking (line-numbered findings) and AI-crawler robots policy.
- **Sitemap discovery & crawl** — robots.txt hints + `/sitemap.xml`, nested `sitemapindex`, and a hybrid crawl (fast fetch with optional **headless** escalation for JS-rendered pages).
- **Tracker / heatmap detection** — Microsoft Clarity (with project ID), GA4, GTM, Hotjar, FullStory, **Meta Pixel / Facebook SDK / domain-verification**, and ~20 more.
- **AI-powered fixes** — rewrite titles/descriptions, generate OG/FAQ schema (Vercel AI Gateway).
- **Site speed & performance** — Lighthouse scores, Core Web Vitals, and optimization tips via Google PageSpeed Insights.
- **Save, share & history** — every scan is persisted to Postgres (Neon); each gets a shareable `/r/[token]` link that reopens the saved report without re-scanning, and `/history` lists recent scans.
- **Search Console insights** — connect Google Search Console (per-visitor OAuth) at `/search-console` to see top queries & pages, clicks/impressions/CTR/position with period-over-period deltas, a trend chart, and striking-distance (position 5–20) opportunities.
- **Exports** — CSV and JSON; shareable report data.
- **Accounts & plans** — Google sign-in (`/login`) with a **Free / Pro** model. Free: 3 scans/day, 10 pages/scan, core audit. Pro: 100 scans/day, 40 pages, deep scan, Performance, Search Console, AI fixes, and saved history. **Razorpay** subscriptions at `/pricing` (UPI/cards) upgrade users to Pro automatically.
- **Dashboard** — sidebar sections (AI Readiness · Overview · Pages · Issues · Performance · Tracking), orange theme, light/dark mode.

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
| `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` | Google sign-in (`/login`) **and** Search Console | One OAuth client (Web). Register **both** redirect URIs: `…/api/auth/callback` (login) and `…/api/gsc/callback` (Search Console). Login uses non-sensitive `openid email profile` scopes (no Google verification needed); GSC's `webmasters.readonly` is sensitive. Needs Neon. |
| `AUTH_REDIRECT_URI` / `GSC_REDIRECT_URI` | Auth / GSC (optional) | Override the login / GSC redirect URI; otherwise derived from the request origin. |
| `RAZORPAY_KEY_ID` + `RAZORPAY_KEY_SECRET` | Pro billing (`/pricing`) | Razorpay API keys (test or live). Without them, upgrade is disabled (Pro stays manual). |
| `RAZORPAY_WEBHOOK_SECRET` | Billing webhook | Secret for `…/api/billing/webhook`; the plan only flips on signature-verified events. |
| `RAZORPAY_PRO_PLAN_ID` (+ `_ANNUAL`) | Pro plan(s) | The Razorpay dashboard plan id(s) the subscription is created against. |

Add on Vercel with `vercel env add <NAME>`.

> **Razorpay setup:** create a **Pro plan** in the Razorpay dashboard (Subscriptions → Plans; set the INR amount — keep `PRO_PRICING` in `src/lib/auth/plan.js` matching it), copy its `plan_id` into `RAZORPAY_PRO_PLAN_ID`. Add API keys + a **webhook** → `…/api/billing/webhook` subscribed to the `subscription.*` events, with the secret in `RAZORPAY_WEBHOOK_SECRET`. Pro can still be granted manually for comps: `UPDATE users SET plan='pro' WHERE email=…`.

> **Search Console setup:** `webmasters.readonly` is a Google *sensitive* scope. Until the OAuth app passes Google's verification, only **test users** you add in the Google Cloud console can connect (they'll see an "unverified app" screen). Steps: Google Cloud → **APIs & Services** → enable **Google Search Console API** → **OAuth consent screen** (External; add yourself as a test user) → **Credentials → Create OAuth client ID → Web application** → Authorized redirect URIs: `http://localhost:3000/api/gsc/callback` and `https://superengine.vercel.app/api/gsc/callback` → copy the client ID + secret into env.

## Project structure

```
src/
  app/
    page.js              Home (URL input + History / Search Console / Algorithm updates links)
    layout.js            Root layout (next-themes + PostHog provider)
    globals.css          Tailwind v4 + theme tokens (orange accent)
    scan/                Dashboard: scan-dashboard, app-sidebar, *-panel.js, score-ring, og-preview, ai-fix
    r/[token]/           Saved/shared report (read from Neon, no re-scan)
    history/             Recent scans list
    search-console/      Google Search Console insights (per-visitor OAuth)
    google-updates/      Google algorithm-update timeline
    login/               Google sign-in page
    pricing/             Free vs Pro + Razorpay upgrade
    api/                 export, report, ai-fix, pagespeed, auth/*, gsc/*, billing/*
  lib/
    seo/                 analyze (orchestrator), sitemap, crawl, headless, extract, rules,
                         ai-rules, ai-site, trackers, explanations, gamify, safe-fetch
    ai/                  suggest-fixes (AI Gateway)
    db.js, db/scans.js   Neon client + saveScan / getScanByToken / recentScans
    auth/                Google login (google, session, plan) — Free/Pro gating
    billing/             Razorpay subscriptions (razorpay, store)
    gsc/                 Search Console OAuth (oauth, tokens, api)
  components/
    ui/                  shadcn/ui (Base UI) components
    user-menu.js         Header auth control (avatar + plan + sign out)
    posthog-provider.js  Client analytics provider (no-ops without a token)
db/schema.sql            DB DDL (users, sessions, scans, gsc_*, performance_runs)
scripts/migrate.mjs      One-time migration runner
```

The scan pipeline lives in `src/lib/seo/analyze.js` (`runScan`), which produces a single `result` object consumed by every dashboard panel and export. After a scan, `saveScan(result)` persists it as JSONB and returns a share token.

## Deploy

```bash
vercel deploy --prod
```

Auto-detected as Next.js. `puppeteer-core` is marked `serverExternalPackages`; headless rendering activates only when a browser endpoint env var is set.
