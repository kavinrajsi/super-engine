<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Project: Meta Tag — SEO & AI-search audit

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

**Search Console** (`src/lib/gsc/` + `src/app/api/gsc/*` + `src/app/search-console/`): per-visitor Google OAuth (raw REST, no `googleapis`). `oauth.js` (auth URL / code exchange / refresh / id_token email), `tokens.js` (Neon `gsc_tokens`; refresh token AES-256-GCM-encrypted with a key derived from `GOOGLE_CLIENT_SECRET`; `getValidAccessToken` auto-refreshes), `api.js` (Search Analytics REST + pure transforms: totals, deltas, trend, top queries/pages, striking-distance). Session id lives in an httpOnly `gsc_session` cookie; `isGscConfigured()` gates the whole feature.

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

Monitoring-over-time (scheduled re-scans), durable background jobs for large sites, PDF reports, and **GBP Monitor** (Local SEO via Google Business Profile API — needs a Google OAuth client + the user's owned business + Google's gated Business Profile API approval). See `~/.claude/plans/` and project memory for the current plan.

*(Shipped: Neon persistence — save / share `/r/[token]` / `/history`; Browserbase headless in prod; PostHog analytics; GSC Insights at `/search-console` — per-visitor OAuth, needs `GOOGLE_CLIENT_ID/SECRET`.)*
