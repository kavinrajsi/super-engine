<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Project: MadRank — SEO & AI-search audit

A per-URL SEO + AI-search auditor with a Semrush-style dashboard. **JavaScript, not TypeScript.** Next.js 16 (App Router, React 19, React Compiler, Turbopack) + Tailwind v4 + shadcn/ui. Deployed on Vercel (team scope `madarth`, project `meta-tag`, prod https://superengine.vercel.app).

## How it works

`src/lib/seo/analyze.js#runScan(url, {deepScan})` is the orchestrator. It runs **synchronously per request** (no background jobs yet, capped at `MAX_PAGES_SYNC = 40`) and returns one `result` object that every UI panel + export consumes unchanged:

```
fetchSitemap + fetchAiSiteContext → analyze each page (fetch → extract → score)
→ optional headless escalation for JS-rendered pages → aggregate
→ { rootUrl, sitemap, pages[{url, signals, audit, aiAudit, ...}], aiReadiness, analytics, headless, ... }
```

After the scan, `scan/page.js` calls `saveScan(result)` (best-effort) to persist it to Neon and get a share token.

Library modules (`src/lib/seo/`): `safe-fetch` (SSRF-guarded fetch — use for ALL outbound requests), `sitemap`, `crawl`, `headless` (puppeteer-core / Browserbase), `extract` (cheerio → signals), `rules` (classic SEO scoring), `ai-rules` (AEO/GEO/AIO/AGO), `ai-site` (llms.txt/ai.txt validation + AI-bot policy), `trackers`, `explanations` (plain-language per ruleKey), `gamify` (issue grouping). Persistence: `src/lib/db.js` (Neon client, null when `DATABASE_URL` unset) + `src/lib/db/scans.js` (`saveScan`/`getScanByToken`/`recentScans`). AI calls go through the Vercel AI Gateway (`src/lib/ai/suggest-fixes.js`, `api/ai-fix`).

UI (`src/app/scan/`): `scan-dashboard.js` (SidebarProvider + section state) + `app-sidebar.js` + one `*-panel.js` per section. Saved/shared reports at `src/app/r/[token]/`, scan history at `src/app/history/`. Product analytics via `src/components/posthog-provider.js` (mounted in `layout.js`).

**Auth + plans** (`src/lib/auth/` + `src/app/api/auth/*` + `src/app/login/`): Google sign-in (raw OAuth, mirrors the GSC pattern; scopes `openid email profile` — non-sensitive, no Google verification). `session.js` stores `users`/`sessions` in Neon, `app_session` httpOnly cookie, `currentUser()` server helper. `plan.js` is the single source of truth for **Free vs Pro** limits (`scansPerDay`, `maxPages`, `deepScan`, `premium`, `history`) — billing isn't wired, Pro is set manually (`UPDATE users SET plan='pro'`). Gating is server-side via `currentUser()` in pages/routes (no middleware): scanning requires login, Performance/Search Console/History/AI-fixes/deep-scan are Pro. The whole feature **no-ops when `GOOGLE_CLIENT_ID`/`SECRET` are unset** (scanning stays open). Same Google client as GSC — register **both** `…/api/auth/callback` and `…/api/gsc/callback` redirect URIs.

**Billing** (`src/lib/billing/` + `src/app/api/billing/*` + `src/app/pricing/`): **Razorpay** subscriptions (raw REST, no SDK; India-first). `/pricing` → `/api/billing/subscribe` creates a subscription → Razorpay Checkout → the **webhook is the only place `plan` is granted/revoked** (HMAC-SHA256 signature-verified on the raw body; `subscription.activated/charged` → `pro`, `cancelled/halted/completed` → `free`). `cancel` is at cycle end. No-ops without `RAZORPAY_*` env (Pro stays manual). Pro plan(s) live in the Razorpay dashboard (`RAZORPAY_PRO_PLAN_ID`); display prices in `plan.js#PRO_PRICING` must match.

**Analytics + Search Console** (combined dashboard at `src/app/seo/`): one **unified per-visitor Google OAuth** connection powers both. `GSC_SCOPE` in `oauth.js` requests `webmasters.readonly` **+ `analytics.readonly`** + `openid email`, stored in the same `gsc_tokens` row / `gsc_session` cookie. Adding the analytics scope means already-connected users must reconnect once (`prompt:"consent"` handles it). `/seo` is the live page; `/search-console` now 307-redirects to `/seo`; nav label is "SEO".
- **okara-style 5-tab dashboard** (`src/app/seo/seo-dashboard.js` + `*-tab.js`): **Traffic** (live GA4 + GSC via `GaDashboard`/`GscDashboard` + a combined funnel from `/api/seo/funnel` → `buildTrafficFunnel`), and **SEO / Links / Technical / GEO** (an on-demand single-page audit of the selected GSC property). The audit is one shared `runScan` per site, fetched lazily on first non-Traffic tab view via `/api/seo/audit` and shared through `ScanContext` (`scan-context.js` + `scan-gate.js`); the audit derives a URL with `siteUrlForScan` (`sc-domain:` → `https://…`; GA-only property → unsupported), reuses a ≤60-min saved scan (`latestScanForUrl`), and does **not** count against the daily cap. SEO/Technical/GEO tabs **reuse the scan panels** (`@/app/scan/{overview,issues,ai-readiness,performance}-panel`, `score-ring`, `og-preview`).
- **Net-new audit signals** feeding the Technical/SEO/Links tabs: `safeFetch` now returns `server`/`contentEncoding`/`cacheControl`/`cacheable`/`byteSize`/`timings`; `extractSignals` adds `headings.byLevel`, `renderBlocking`, `contentRatio`, `domNodes`(+`domNodesApprox`), `htmlIssues`, `readability` (`src/lib/seo/readability.js` — Flesch, returns null on non-prose), `relevance` (`src/lib/seo/relevance.js` — token overlap), and `linkUrls`; `runScan` probes the homepage's links (`links-probe.js` → `signals.linkSample`) and rolls up `result.contentSummary`. All pure, all null-guarded, no DB migration.
- **Search Console** (`src/lib/gsc/` + `src/app/api/gsc/*`): `oauth.js` (auth URL / code exchange / refresh / id_token email), `tokens.js` (Neon `gsc_tokens`; refresh token AES-256-GCM-encrypted with a key derived from `GOOGLE_CLIENT_SECRET`; `getValidAccessToken` auto-refreshes — **reused by GA**), `api.js` (Search Analytics REST + pure transforms: totals, deltas, trend, top queries/pages, striking-distance). `isGscConfigured()` (needs `GOOGLE_CLIENT_ID/SECRET`) gates both halves.
- **Google Analytics (GA4)** (`src/lib/ga/` + `src/app/api/ga/*`): `api.js` — Admin API `accountSummaries` (`listProperties`) + Data API `runReport` (`buildGaReport`: totals/deltas/trend + top pages/channels/countries, conservative metric set so runReport never 400s). Routes read the **same** `gsc_session` via `getValidAccessToken`. Reports persisted best-effort to `ga_reports` (`saveGaReport`). **Enable the Analytics Data API + Analytics Admin API** in Google Cloud (alongside the Search Console API).

**Site health snapshot — backlinks + live SERP** (`src/lib/seo/backlinks.js` + `serp.js` + `keywords.js` + `src/app/api/seo/{backlinks,serp}/*` + `src/app/scan/snapshot-cards.js`): the scan **Overview panel** leads with a consolidated snapshot — SEO score + Lighthouse performance (live PageSpeed) + **backlinks** + **live SERP rank**. Backlinks are **wired to DataForSEO** (`backlinks.js#fetchDataForSeo` — POST `/v3/backlinks/summary/live` + `/referring_domains/live`, Basic auth; direct `fetch` since the host is constant/trusted and `safeFetch` is GET-only); set `DATAFORSEO_LOGIN`/`DATAFORSEO_PASSWORD` to activate (else `{configured:false}` → "connect a provider" card). **SERP** is still provider-stubbed (same DataForSEO creds will drive it once `fetchDataForSeo` in `serp.js` is fleshed out). Because provider calls are **paid**, the snapshot only does a cheap `?check=1` capability probe on render and **button-gates** the real fetch (`Load backlinks` / `Load live rank`); routes reuse a ≤24h snapshot (`backlinks_snapshots`/`serp_snapshots`). SERP keywords come from `candidateKeywords` (on-page, no GSC). Note: GSC `position` is *self-reported* avg rank; this is *live* Google rank.

**Competitor discovery** (`src/lib/seo/competitors.js` + `src/lib/seo/dataforseo.js` + `src/app/api/seo/competitors/route.js` + `src/app/competitors/*`): the `/competitors` page auto-discovers competitors for a domain two ways and merges them — **DataForSEO Labs `competitors_domain`** (SERP-overlap ranked, `intersections` → common keywords) + an **AI-gateway LLM-ask** (`generateText` structured output; brand names/breadth). Either half is optional (`isCompetitorsConfigured()` = `DATAFORSEO_*` **or** `AI_GATEWAY_API_KEY`); no-ops to `{configured:false}`. The DataForSEO `dfsPost`/auth client was extracted from `backlinks.js` into the shared **`dataforseo.js`** (`backlinks.js` re-exports `domainOf`). Discovery is **paid** → button-gated (`?check=1` probe) + ≤24h `competitor_snapshots` reuse. The domain input prefills from `/api/gsc/sites`; selected competitors (max 3) deep-link into `/compare?url=target&url=…`. Pro-gated like `/compare`.

**Link intelligence** (`src/lib/seo/{extract,links-probe,analyze,rules,crawl}.js` + `src/app/seo/links-tab.js` + `src/app/scan/overview-panel.js`): beyond counts, the scan now computes **outbound link quality** (`signals.outboundQuality` {dofollow,nofollow,sponsored,ugc,emptyAnchor} + `externalSample` with rel/anchor), **site-wide broken-link + redirect health** (`result.linkHealth` — `links-probe` follows redirects manually recording `redirectChain`/`finalUrl`; aggregated across all analyzed pages, cap 40; a `links.broken`/`links.redirect_chain` rule in `rules.js` feeds the Issues panel, and the root page is **re-scored** after probing so it counts toward `siteScore`), and an **internal-link graph** on deep scans (`result.internalGraph` — `crawl.js` now returns `graph{depthByUrl,inboundCounts}`; `analyze.js#buildInternalGraph` derives orphans, click-depth, top-linked). Surfaced in the /seo **Links tab** (outbound-quality + redirect-aware broken table) and the scan **Overview** (internal-link-structure card; deep-scan only).

## Conventions

- **JavaScript** (`.js`/`.jsx`), no TS. Path alias `@/*` → `src/*` (jsconfig). Match the surrounding code style.
- Next.js 16: `searchParams`/`params` are **Promises — await them**. API = `route.js` Route Handlers. Server Components do data fetching; mutations via Server Actions / route handlers.
- All new SEO logic stays as **pure functions** in `src/lib/seo/` operating on the `result`/`signals` shape (testable, reused by UI + exports). Don't recompute in components.
- Outbound HTTP must use `safeFetch`/`assertSafeUrl` (SSRF protection — users submit arbitrary URLs).
- Theme/severity colors come from CSS tokens in `globals.css` (`--primary` is the orange accent; `--pass/--warning/--error/--info`). Avoid ad-hoc hex.

## Gotchas (these have bitten us)

- **shadcn here is Base UI (`@base-ui/react/*`), NOT Radix.** `Accordion` uses `openMultiple` (default `true`) + `defaultValue` array — **never** `type="multiple"`. Button/Badge use Base UI `render`/`useRender`.
- **Turbopack dev serves stale CSS** after external edits (e.g. `sed`). After changing tokens/CSS, `rm -rf .next` and restart, then verify computed styles.
- **Tailwind v4 Preflight** already resets margins/box-sizing — no manual `* {}` reset. Buttons get `cursor: pointer` from an `@layer base` rule (Preflight v4 dropped it).
- The **`DEP0205` deprecation** warning comes from `@tailwindcss/node` and is suppressed via `NODE_OPTIONS=--disable-warning=DEP0205` in the npm scripts — keep that.
- `puppeteer-core` is in `next.config.mjs` `serverExternalPackages`. Headless runs when `BROWSER_WS_ENDPOINT`, `CHROME_EXECUTABLE_PATH`, or `BROWSERBASE_API_KEY`+`BROWSERBASE_PROJECT_ID` is set (Browserbase creates a session → `puppeteer.connect`); otherwise the scan stays fetch-only and flags `needsHeadless`. Escalation cap `MAX_HEADLESS = 5`.
- **Keyless PageSpeed Insights 429s** (shared quota) — Performance needs `PAGESPEED_API_KEY`.
- AI features work locally with `AI_GATEWAY_API_KEY` and in prod via Vercel OIDC. Always fetch current gateway model IDs (`curl https://ai-gateway.vercel.sh/v1/models`) — don't hardcode from memory.
- **Persistence is best-effort**: all `src/lib/db/*` calls no-op (return null/`[]`) when `DATABASE_URL` is unset, so scans still work without a DB. Schema lives in `db/schema.sql`; apply it once with `node --env-file=.env.local scripts/migrate.mjs` (uses `DATABASE_URL_UNPOOLED`). Runtime only needs `DATABASE_URL`.
- **PostHog env vars are oddly lowercased**: `NEXT_PUBLIC_superengine_POSTHOG_PROJECT_TOKEN` / `_HOST` (the `superengine` segment is literal — Next inlines `NEXT_PUBLIC_*`). The provider no-ops cleanly without a token. Key events: `scan_run`, `share_created`, `ai_fix_used`, `performance_test_run`.
- **Vercel env gotcha**: the Neon Marketplace integration's `POSTGRES_*` vars were NOT auto-wired to the project — `DATABASE_URL` + `BROWSERBASE_*` + `NEXT_PUBLIC_superengine_POSTHOG_*` were added manually (production + development). Preview env is unset (CLI 54.9.1 ignores `--yes` on the all-branches path; upgrade to 54.12.1+).
- **`scripts/migrate.mjs` splits `db/schema.sql` on naive `;`** — never put a semicolon inside a SQL comment there or the splitter breaks the statement. Schema is idempotent (`CREATE TABLE IF NOT EXISTS`); re-running is safe.
- **Search Console is a Google *sensitive* scope** (`webmasters.readonly`): until the OAuth app passes Google verification, only console-added **test users** can connect (they see an "unverified app" screen). Feature no-ops without `GOOGLE_CLIENT_ID`/`_SECRET` + Neon. Register redirect URI `…/api/gsc/callback` (localhost + prod) in the Google console.

## Verify changes

`npm run build` (clean), then `npm run dev` and a real scan (`vercel.com` for rich data, `madarth.com` for a bot-blocking + www-redirect edge case). UI changes: drive a headless browser against the dev server and check the section + console errors before deploying.

## Not built yet

Durable background jobs for large sites, and **GBP Monitor** (Local SEO via Google Business Profile API — needs a Google OAuth client + the user's owned business + Google's gated Business Profile API approval). Backlinks are wired to **DataForSEO** (set `DATAFORSEO_LOGIN`/`PASSWORD`); the **live-SERP** half still needs its DataForSEO POST impl completed in `serp.js`. See `~/.claude/plans/` and project memory for the current plan.

*(Shipped: Neon persistence — save / share `/r/[token]` / `/history`; Browserbase headless in prod; PostHog analytics; combined **Analytics (GA4) + Search Console** at `/seo` — one unified per-visitor OAuth, needs `GOOGLE_CLIENT_ID/SECRET` + the Analytics Data/Admin + Search Console APIs enabled.)*
