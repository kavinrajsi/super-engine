// Competitor / AI benchmarking (Server Component). Scans the primary site +
// up to 3 competitors with a small page cap and renders a side-by-side
// scorecard (SEO + AI-readiness lenses). Pro-gated, mirroring /search-console.

import Link from "next/link";
import { redirect } from "next/navigation";
import AppShell from "@/components/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button, buttonVariants } from "@/components/ui/button";
import { assertSafeUrl } from "@/lib/seo/safe-fetch";
import { runScan } from "@/lib/seo/analyze";
import { currentUser } from "@/lib/auth/session";
import { isAuthConfigured } from "@/lib/auth/google";
import { isPro } from "@/lib/auth/plan";

export const metadata = { title: "Compare sites — MadRank" };
export const dynamic = "force-dynamic";

const MAX_SITES = 4; // primary + 3 competitors
const COMPARE_MAX_PAGES = 5; // keep N-site latency bounded

const LENSES = [
  ["aeo", "AEO"],
  ["geo", "GEO"],
  ["aio", "AIO"],
  ["ago", "AGO"],
];

function grade(s) {
  if (s == null) return "—";
  if (s >= 90) return "A";
  if (s >= 75) return "B";
  if (s >= 60) return "C";
  if (s >= 40) return "D";
  return "F";
}

function Shell({ children }) {
  return (
    <AppShell>
      <div className="mx-auto max-w-5xl space-y-6 p-6">{children}</div>
    </AppShell>
  );
}

function CompareForm() {
  return (
    <Card>
      <CardContent>
        <form action="/compare" method="get" className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Enter your site and up to 3 competitors. We&rsquo;ll scan each (homepage + a
            few pages) and line up SEO &amp; AI-readiness scores.
          </p>
          {["Your site", "Competitor 1", "Competitor 2", "Competitor 3"].map((label, i) => (
            <Input
              key={i}
              type="text"
              inputMode="url"
              name="url"
              placeholder={i === 0 ? "yoursite.com" : `${label} (optional)`}
              aria-label={label}
              required={i === 0}
              className="h-10"
            />
          ))}
          <Button type="submit" className="w-full">
            Compare
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

async function scanOne(rawUrl) {
  let safe;
  try {
    safe = assertSafeUrl(rawUrl);
  } catch {
    return { input: rawUrl, error: "Invalid URL" };
  }
  try {
    const result = await runScan(safe.toString(), { maxPages: COMPARE_MAX_PAGES });
    const pages = result.pages || [];
    return {
      input: rawUrl,
      host: (() => { try { return new URL(result.rootUrl).host; } catch { return result.rootUrl; } })(),
      siteScore: result.siteScore,
      ai: result.aiReadiness,
      errors: pages.reduce((n, p) => n + (p.audit?.counts.error || 0), 0),
      warnings: pages.reduce((n, p) => n + (p.audit?.counts.warning || 0), 0),
      pages: pages.length,
    };
  } catch (err) {
    return { input: rawUrl, error: err.message };
  }
}

export default async function ComparePage({ searchParams }) {
  const sp = await searchParams;

  // Pro gate (mirrors /search-console).
  const user = isAuthConfigured() ? await currentUser() : null;
  if (isAuthConfigured() && !user) {
    redirect(`/login?next=${encodeURIComponent("/compare")}`);
  }
  if (user && !isPro(user)) {
    return (
      <Shell>
        <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
          <h1 className="text-2xl font-bold">Competitor benchmarking is a Pro feature</h1>
          <p className="text-muted-foreground">
            Comparing your site against competitors on SEO and AI-search readiness is available on
            the Pro plan.
          </p>
        </div>
      </Shell>
    );
  }

  const urls = [...new Set((Array.isArray(sp?.url) ? sp.url : sp?.url ? [sp.url] : [])
    .map((u) => (typeof u === "string" ? u.trim() : ""))
    .filter(Boolean))].slice(0, MAX_SITES);

  if (urls.length < 2) {
    return (
      <Shell>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Compare sites</h1>
          <p className="text-muted-foreground">Benchmark SEO &amp; AI-search readiness side by side.</p>
        </div>
        <CompareForm />
      </Shell>
    );
  }

  const sites = await Promise.all(urls.map(scanOne));
  const ok = sites.filter((s) => !s.error);

  const rows = [
    { label: "SEO health", get: (s) => `${s.siteScore ?? "—"} (${grade(s.siteScore)})` },
    { label: "AI readiness", get: (s) => `${s.ai?.overall ?? "—"} (${grade(s.ai?.overall)})` },
    ...LENSES.map(([key, label]) => ({
      label,
      get: (s) => s.ai?.layers?.[key] ?? "—",
    })),
    { label: "Errors", get: (s) => s.errors ?? "—" },
    { label: "Warnings", get: (s) => s.warnings ?? "—" },
    { label: "Pages scanned", get: (s) => s.pages ?? "—" },
  ];

  return (
    <Shell>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Comparison</h1>
          <p className="text-muted-foreground">
            {ok.length} site(s) · homepage + up to {COMPARE_MAX_PAGES} pages each
          </p>
        </div>
        <Link href="/compare" className={buttonVariants({ variant: "outline", size: "sm" })}>
          New comparison
        </Link>
      </div>

      <Card>
        <CardContent className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="py-2 pr-3 font-medium">Metric</th>
                {sites.map((s, i) => (
                  <th key={i} className="py-2 px-3 font-medium">
                    {s.error ? s.input : s.host}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.label} className="border-b">
                  <td className="py-2 pr-3 text-muted-foreground">{row.label}</td>
                  {sites.map((s, i) => (
                    <td key={i} className="py-2 px-3 tabular-nums">
                      {s.error ? "—" : row.get(s)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {sites.some((s) => s.error) && (
        <p className="text-xs text-muted-foreground">
          Couldn&rsquo;t scan: {sites.filter((s) => s.error).map((s) => `${s.input} (${s.error})`).join(", ")}
        </p>
      )}
    </Shell>
  );
}
