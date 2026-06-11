<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Project: Meta Tag — SEO & AI-search audit

A per-URL SEO + AI-search auditor with a Semrush-style dashboard. **JavaScript, not TypeScript.** Next.js 16 (App Router, React 19, React Compiler, Turbopack) + Tailwind v4 + shadcn/ui. Deployed on Vercel (team scope `madarth`, project `meta-tag`, prod https://superengine.vercel.app).

## How it works

`src/lib/seo/analyze.js#runScan(url, {deepScan})` is the orchestrator. It runs **synchronously per request** (no DB/jobs yet, capped at `MAX_PAGES_SYNC = 40`) and returns one `result` object that every UI panel + export consumes unchanged:

```
fetchSitemap + fetchAiSiteContext → analyze each page (fetch → extract → score)
→ optional headless escalation for JS-rendered pages → aggregate
→ { rootUrl, sitemap, pages[{url, signals, audit, aiAudit, ...}], aiReadiness, analytics, headless, ... }
```

Library modules (`src/lib/seo/`): `safe-fetch` (SSRF-guarded fetch — use for ALL outbound requests), `sitemap`, `crawl`, `headless` (puppeteer-core), `extract` (cheerio → signals), `rules` (classic SEO scoring), `ai-rules` (AEO/GEO/AIO/AGO), `ai-site` (llms.txt/ai.txt validation + AI-bot policy), `trackers`, `generate` (sitemap/llms/robots/ai.txt), `explanations` (plain-language per ruleKey), `gamify` (issue grouping). AI calls go through the Vercel AI Gateway (`src/lib/ai/suggest-fixes.js`, `api/generate/llms-ai`, `api/ai-fix`).

UI (`src/app/scan/`): `scan-dashboard.js` (SidebarProvider + section state) + `app-sidebar.js` + one `*-panel.js` per section. Standalone generators in `src/app/tools/`.

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
- `puppeteer-core` is in `next.config.mjs` `serverExternalPackages`. Headless only runs when `BROWSER_WS_ENDPOINT` or `CHROME_EXECUTABLE_PATH` is set; otherwise the scan stays fetch-only and flags `needsHeadless`.
- **Keyless PageSpeed Insights 429s** (shared quota) — Performance needs `PAGESPEED_API_KEY`.
- AI features work locally with `AI_GATEWAY_API_KEY` and in prod via Vercel OIDC. Always fetch current gateway model IDs (`curl https://ai-gateway.vercel.sh/v1/models`) — don't hardcode from memory.

## Verify changes

`npm run build` (clean), then `npm run dev` and a real scan (`vercel.com` for rich data, `madarth.com` for a bot-blocking + www-redirect edge case). UI changes: drive a headless browser against the dev server and check the section + console errors before deploying.

## Not built yet

Neon persistence (scan history, shareable links, monitoring-over-time), durable background jobs for large sites, and **GBP Monitor + GSC Insights** (both need a Google OAuth client + the user's owned property; GBP additionally needs Google's gated Business Profile API approval). See `~/.claude/plans/` and project memory for the current plan.
