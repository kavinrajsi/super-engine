// Print-optimized audit report (Server Component). Re-runs the scan from
// ?url=&deep= (like /api/report) and renders a flat, single-page document
// suitable for "Save as PDF" via the browser. Sidebar/tabs-free so the whole
// audit prints cleanly. White-label / server-side PDF is a later step.

import Link from "next/link";
import { assertSafeUrl } from "@/lib/seo/safe-fetch";
import { runScan } from "@/lib/seo/analyze";
import { questsFromIssues } from "@/lib/seo/gamify";
import { EXPLANATIONS } from "@/lib/seo/explanations";
import PrintButton from "./print-button";

export const metadata = { title: "Audit report — MadRank" };
export const dynamic = "force-dynamic";

const LENSES = [
  ["aeo", "AEO — Answer Engine"],
  ["geo", "GEO — Generative Engine"],
  ["aio", "AIO — AI Overviews"],
  ["ago", "AGO — Agent Access"],
];

function grade(s) {
  if (s == null) return "—";
  if (s >= 90) return "A";
  if (s >= 75) return "B";
  if (s >= 60) return "C";
  if (s >= 40) return "D";
  return "F";
}

function Msg({ children }) {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-4 p-6 text-center">
      <p className="text-muted-foreground">{children}</p>
      <Link href="/" className="text-primary-link hover:underline">
        ← Back home
      </Link>
    </div>
  );
}

function ScoreBox({ label, score }) {
  return (
    <div className="rounded-lg border p-4 text-center">
      <div className="text-3xl font-bold tabular-nums">{score ?? "—"}</div>
      <div className="text-sm text-muted-foreground">
        {label} · grade {grade(score)}
      </div>
    </div>
  );
}

export default async function ReportPage({ searchParams }) {
  const sp = await searchParams;
  const rawUrl = typeof sp?.url === "string" ? sp.url : "";
  const deep = sp?.deep === "1" || sp?.deep === "on";

  if (!rawUrl) return <Msg>No URL provided.</Msg>;
  let safe;
  try {
    safe = assertSafeUrl(rawUrl);
  } catch (err) {
    return <Msg>{err.message}</Msg>;
  }

  let result;
  try {
    result = await runScan(safe.toString(), { deepScan: deep });
  } catch (err) {
    return <Msg>Scan failed: {err.message}</Msg>;
  }

  const pages = result.pages || [];
  const ai = result.aiReadiness;
  const layers = ai?.layers || {};
  const blocked = ai?.site?.botsBlocked || [];
  const allIssues = pages.flatMap((p) => [
    ...(p.audit?.issues || []),
    ...(p.aiAudit?.issues || []),
  ]);
  const grouped = questsFromIssues(allIssues).slice(0, 20);
  const trackers = result.analytics?.tools || [];

  return (
    <div className="mx-auto max-w-3xl space-y-8 p-6 print:p-0">
      {/* Header */}
      <header className="flex items-start justify-between gap-4 border-b pb-4">
        <div>
          <div className="font-bold tracking-tight">📈 MadRank</div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">SEO &amp; AI-Search Audit</h1>
          <p className="mt-1 break-all text-sm text-muted-foreground">{result.rootUrl}</p>
          {result.redirected && result.requestedUrl && (
            <p className="text-xs text-muted-foreground">
              redirected from {(() => { try { return new URL(result.requestedUrl).host; } catch { return result.requestedUrl; } })()}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            {pages.length} page(s) analyzed · {new Date().toLocaleString()}
          </p>
        </div>
        <PrintButton />
      </header>

      {/* Scores */}
      <section className="break-inside-avoid space-y-3">
        <h2 className="text-lg font-semibold">Scores</h2>
        <div className="grid grid-cols-2 gap-3">
          <ScoreBox label="SEO health" score={result.siteScore} />
          <ScoreBox label="AI readiness" score={ai?.overall} />
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {LENSES.map(([key, label]) => (
            <div key={key} className="rounded-md border p-2 text-center text-sm">
              <div className="font-semibold tabular-nums">{layers[key] ?? "—"}</div>
              <div className="text-xs text-muted-foreground">{label.split(" — ")[0]}</div>
            </div>
          ))}
        </div>
        {blocked.length > 0 && (
          <p className="text-sm text-[var(--warning)]">⚠ AI crawlers blocked: {blocked.join(", ")}</p>
        )}
      </section>

      {/* Top issues */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Top issues</h2>
        {grouped.length === 0 ? (
          <p className="text-sm text-muted-foreground">No issues found — clean audit. 🎉</p>
        ) : (
          <ol className="space-y-3">
            {grouped.map((g) => {
              const ex = EXPLANATIONS[g.ruleKey] || {};
              return (
                <li key={g.ruleKey} className="break-inside-avoid rounded-md border p-3">
                  <div className="font-medium">{g.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {g.severity} · affects {g.pagesAffected} page(s) · {g.category}
                  </div>
                  {ex.what && <p className="mt-1 text-sm">{ex.what}</p>}
                  {ex.why && <p className="text-sm text-muted-foreground">{ex.why}</p>}
                  {g.recommendation && <p className="mt-1 text-sm"><strong>Fix:</strong> {g.recommendation}</p>}
                </li>
              );
            })}
          </ol>
        )}
      </section>

      {/* Pages */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Pages</h2>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="py-1 pr-2 font-medium">URL</th>
              <th className="py-1 px-2 font-medium">Status</th>
              <th className="py-1 px-2 font-medium">SEO</th>
              <th className="py-1 px-2 font-medium">Errors</th>
              <th className="py-1 pl-2 font-medium">Warnings</th>
            </tr>
          </thead>
          <tbody>
            {pages.map((p, i) => {
              const c = p.audit?.counts || {};
              return (
                <tr key={`${p.url}#${i}`} className="border-b align-top">
                  <td className="py-1 pr-2 break-all font-mono text-xs">{p.url}</td>
                  <td className="py-1 px-2 tabular-nums">{p.httpStatus ?? "—"}</td>
                  <td className="py-1 px-2 tabular-nums">{p.audit?.score ?? "—"} ({grade(p.audit?.score)})</td>
                  <td className="py-1 px-2 tabular-nums">{c.error ?? 0}</td>
                  <td className="py-1 pl-2 tabular-nums">{c.warning ?? 0}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      {/* Trackers */}
      <section className="break-inside-avoid space-y-2">
        <h2 className="text-lg font-semibold">Trackers detected</h2>
        {trackers.length === 0 ? (
          <p className="text-sm text-muted-foreground">None detected.</p>
        ) : (
          <ul className="flex flex-wrap gap-2 text-sm">
            {trackers.map((t) => (
              <li key={t.key || t.name} className="rounded-md border px-2 py-0.5">
                {t.name || t.key}
                {t.heatmap ? " 🔥" : ""}
              </li>
            ))}
          </ul>
        )}
      </section>

      <footer className="border-t pt-4 text-center text-xs text-muted-foreground">
        Generated by MadRank — SEO &amp; AI-search audit
      </footer>
    </div>
  );
}
