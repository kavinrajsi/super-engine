# MadRank — SEO & AI-Search Audit

A clean, Semrush-style SEO auditor that also grades a site for **AI search** (ChatGPT, Google AI Overviews, Perplexity, Claude, Gemini). Audit any URL → it reads the sitemap, crawls pages, and reports on-page SEO, social tags, AI-readiness, trackers, links, and performance — with one-click AI fixes — and pairs it with live Google Analytics + Search Console data.

**Live:** https://superengine.vercel.app

## Features

- **One unified audit dashboard at `/seo`** — type any URL (no Google needed) and get a 7-tab audit: **Traffic** (live GA4 + Search Console), **SEO**, **Pages**, **Links**, **Technical**, **GEO** (AI readiness), **Tracking**. Optional deep multi-page scan. (The old standalone `/scan` page was folded into `/seo`.)
- **On-page SEO / SMO audit** — title, meta, canonical, H1s, viewport, `lang`, robots (incl. `X-Robots-Tag`), Open Graph + Twitter/X cards. Per-page score (0–100) + A–F grade with plain-language **What it means / Why it matters / How to fix**.
- **AI search readiness** across four lenses — **AEO** (answer engines), **GEO** (citability), **AIO** (AI Overviews), **AGO** (agent/crawler access) — plus validator-grade **`llms.txt` / `llms-full.txt` / `ai.txt`** checking and AI-crawler robots policy.
- **Sitemap discovery & crawl** — robots.txt hints + `/sitemap.xml`, nested `sitemapindex`, and a hybrid crawl (fast fetch with optional **headless** escalation for JS-rendered pages).
- **Link intelligence** — outbound link quality, site-wide broken-link + redirect health, and an internal-link graph on deep scans.
- **Tracker / heatmap detection** — Microsoft Clarity (with project ID), GA4, GTM, Hotjar, Meta Pixel, and ~20 more.
- **AI-powered fixes** — rewrite titles/descriptions, generate OG/FAQ schema (Vercel AI Gateway or your own key).
- **Site speed & performance** — Lighthouse scores, Core Web Vitals, and tips via Google PageSpeed Insights.
- **Backlinks, live SERP rank & competitor discovery** — via DataForSEO (button-gated, paid; ≤24h snapshot reuse).
- **Active site + dashboard** — pick a site once (the sidebar **site switcher**); it becomes the default everywhere. `/dashboard` is the home hub that reuses your latest audit to surface top fixes and route into each tool.
- **AI content studio** — **Brand Memory** (reusable Markdown profiles), **Articles** and **Post Ideas** (platform-native social), with a draft→approve loop. **Bring your own AI key** at `/ai-settings` (OpenAI / Anthropic / Google), encrypted at rest.
- **Save, share & history** — every audit is persisted to Postgres (Neon); each gets a shareable `/r/[token]` link that reopens the saved report without re-scanning; `/history` lists recent scans.
- **Analytics + Search Console** — connect Google once (per-visitor OAuth) to see GA4 traffic and Search Console queries/pages/CTR/position with deltas, trends, and striking-distance opportunities, all on `/seo`.
- **Accounts** — Google sign-in (`/login`); `/account` manages identity + Google connection. **Full access for everyone — no plan tiers, no billing.**
- **Monitors** — scheduled re-scans with an email alert when a score drops.

## Security

OWASP-hardened: SSRF-guarded outbound fetch (literal-host **and** DNS resolve-and-validate), rate limiting on expensive routes, security headers (CSP, HSTS, X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy) in `next.config.mjs`, AES-256-GCM encryption for stored OAuth refresh tokens + BYO AI keys, parameterized SQL, and user-scoped queries.

## Tech stack

Next.js 16 (App Router, React 19, React Compiler, Turbopack) · JavaScript · Tailwind CSS v4 · shadcn/ui (Base UI) · cheerio · puppeteer-core (+ Browserbase) · Vercel AI SDK (v6) + zod · Neon Postgres (`@neondatabase/serverless`) · PostHog · recharts · next-themes · deployed on **Vercel**.

## Getting started

```bash
npm install
npm run dev      # http://localhost:3000
```

Scripts: `npm run dev` · `npm run build` · `npm run start` · `npm run lint`.

To enable persistence, set `DATABASE_URL` (+ `DATABASE_URL_UNPOOLED`) and run the migrations:

```bash
node --env-file=.env.local scripts/migrate.mjs               # base schema (scans, users, sessions, gsc_*, …)
node --env-file=.env.local scripts/migrate-active-site.mjs   # brand_profiles.last_used_at + generated_content.status
node --env-file=.env.local scripts/migrate-rate-limits.mjs   # rate_limits table
```

## Environment variables

All optional — the app degrades gracefully (no DB → audits just aren't saved; no token → no analytics).

| Variable | Enables | Notes |
| --- | --- | --- |
| `AI_GATEWAY_API_KEY` | AI fixes + article/social generation (default model) | Local only; on Vercel it works via OIDC. |
| `AI_KEY_SECRET` | BYO AI-key encryption | Falls back to `GOOGLE_CLIENT_SECRET`. If it changes, users re-enter their key. |
| `PAGESPEED_API_KEY` | Performance / PageSpeed | Keyless hits Google's shared quota (429). **Must not** be HTTP-referrer-restricted for server use. |
| `PAGESPEED_REFERER` | PageSpeed with a referrer-restricted key | Sent as the `Referer` header; defaults to the app origin. |
| `DATABASE_URL` | Save / share / history (Neon) | Pooled connection string, read at runtime. |
| `DATABASE_URL_UNPOOLED` | DB migrations | Direct connection used by the `scripts/migrate*.mjs` runners. |
| `BROWSERBASE_API_KEY` + `BROWSERBASE_PROJECT_ID` | Headless rendering (prod) | Browserbase session over CDP. |
| `BROWSER_WS_ENDPOINT` / `CHROME_EXECUTABLE_PATH` | Headless rendering | Remote CDP endpoint / local Chrome path. |
| `NEXT_PUBLIC_superengine_POSTHOG_PROJECT_TOKEN` (+ `_HOST`) | Product analytics (PostHog) | Client-side; no-ops when unset. Host defaults to `https://us.i.posthog.com`. |
| `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` | Google sign-in **and** Analytics + Search Console | One Web OAuth client. Register **both** redirect URIs: `…/api/auth/callback` and `…/api/gsc/callback`. GSC/GA scopes (`webmasters.readonly` + `analytics.readonly`) are sensitive → only test users until verified. |
| `AUTH_REDIRECT_URI` / `GSC_REDIRECT_URI` | Override redirect URIs (optional) | Otherwise derived from the request origin. |
| `DATAFORSEO_LOGIN` + `DATAFORSEO_PASSWORD` | Backlinks, live SERP, competitors | Without them those cards show "connect a provider". |
| `ZEPTOMAIL_TOKEN` + `ZEPTOMAIL_FROM` | Monitor alerts + daily digest emails | Zoho ZeptoMail "Send Mail Token" + a verified sender. Optional: `ZEPTOMAIL_FROM_NAME`, `ZEPTOMAIL_API_URL` (region DC, e.g. `https://api.zeptomail.in/v1.1/email`). |
| `CRON_SECRET` | Monitor cron auth | Vercel Cron sends `Authorization: Bearer <CRON_SECRET>` to `…/api/cron/monitor`. |

Add on Vercel with `vercel env add <NAME>`.

> **Google setup:** enable the **Search Console API**, **Analytics Data API**, and **Analytics Admin API** in Google Cloud → OAuth consent screen (External; add test users) → Credentials → Web OAuth client → add both redirect URIs above.

## Project structure

```
src/
  app/
    page.js              Marketing landing ("instrument" design: command-bar audit form + AI Visibility Spectrum)
    layout.js            Root layout (theme + PostHog + active-site providers)
    seo/                 THE audit + Analytics/Search Console dashboard (7 tabs, URL entry)
    dashboard/           Active-site home hub (agent cards from the latest audit)
    account/             Identity + Google connect/disconnect + sign out
    scan/                Reusable dashboard panels (no route) — consumed by /seo and /r/[token]
    r/[token]/           Saved/shared report
    history/             Recent scans
    profiles/ articles/ post-ideas/ ai-settings/   AI content studio
    competitors/ compare/ monitors/                Competitor + comparison + scheduled monitors
    google-updates/ login/ privacy/ terms/
    search-console/      307 → /seo
    api/                 seo/{audit,funnel,backlinks,serp,competitors}, ai-fix, ai-settings,
                         articles, post-ideas, profiles/*, content/[id], pagespeed, export,
                         report, auth/*, gsc/*, ga/*, cron/monitor
  lib/
    seo/                 analyze (runScan orchestrator), sitemap, crawl, headless, extract, rules,
                         ai-rules, ai-site, trackers, explanations, gamify, safe-fetch, readability,
                         relevance, links-probe, keywords, backlinks, serp, dataforseo, competitors,
                         markdown-report, google-updates
    ai/                  suggest-fixes, generate-article, generate-social, models, user-model, crypto, errors
    auth/                Google login (google, session, plan — full access for all)
    gsc/ ga/             Search Console + Analytics OAuth & APIs (shared gsc_session)
    db.js, db/           Neon client + scans/profiles/content/ai-settings/monitors/records
    site/active.js       Active-site resolution
    rate-limit.js        Neon fixed-window rate limiter
    email.js             Zoho ZeptoMail email (monitor alerts + digest)
db/schema.sql            DB DDL (gitignored)
scripts/                 migrate*.mjs (base + feature migrations), verify-*.mjs
```

The audit pipeline lives in `src/lib/seo/analyze.js` (`runScan`), which produces a single `result` object consumed by every dashboard panel and export. After an audit, `saveScan(result, userId)` persists it as JSONB and returns a share token.

## Deploy

```bash
vercel deploy --prod
```

Auto-detected as Next.js. `puppeteer-core` is marked `serverExternalPackages`; headless rendering activates only when a browser endpoint env var is set.
