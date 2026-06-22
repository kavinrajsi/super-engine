# Claude Code instructions

Project guidance for this app — a Next.js 16 SEO & AI-search auditor (JavaScript, Tailwind v4, shadcn/Base UI, Neon persistence, Browserbase headless, PostHog analytics, deployed on Vercel) — lives in **AGENTS.md**, imported below: architecture, the `runScan` pipeline (run from the unified **`/seo`** audit dashboard — there is no standalone `/scan` route), active-site context + `/dashboard`, the GA4 + Search Console integration, the AI content studio, save/share/history persistence, the OWASP security hardening (SSRF guard, rate limiting, security headers), conventions, and the gotchas that have bitten us (Base UI vs Radix, Turbopack stale CSS, best-effort DB, lowercased PostHog env keys, headless/AI/PageSpeed env keys). Note: there are **no plan tiers or billing** — everyone has full access.

@AGENTS.md
