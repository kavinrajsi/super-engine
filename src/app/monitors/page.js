// Scheduled monitors (Pro). Add sites to re-scan on a cadence; the cron route
// re-scans due monitors, saves history, and emails on regressions. Score
// history lives in the scans table and is listed under /history.

import Link from "next/link";
import { redirect } from "next/navigation";
import AppShell from "@/components/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { currentUser } from "@/lib/auth/session";
import { isAuthConfigured } from "@/lib/auth/google";
import { isPro, planOf } from "@/lib/auth/plan";
import { listMonitors } from "@/lib/db/monitors";
import { createMonitor, removeMonitor, toggleMonitor } from "./actions";

export const metadata = { title: "Monitors — MadRank" };
export const dynamic = "force-dynamic";

function Shell({ children }) {
  return (
    <AppShell>
      <div className="mx-auto max-w-3xl space-y-6 p-6">{children}</div>
    </AppShell>
  );
}

export default async function MonitorsPage() {
  // Pro gate (mirrors /search-console, /compare).
  const user = isAuthConfigured() ? await currentUser() : null;
  if (isAuthConfigured() && !user) {
    redirect(`/login?next=${encodeURIComponent("/monitors")}`);
  }
  if (isAuthConfigured() && user && !isPro(user)) {
    return (
      <Shell>
        <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
          <h1 className="text-2xl font-bold">Monitoring is a Pro feature</h1>
          <p className="text-muted-foreground">
            Upgrade to Pro to re-scan your sites on a schedule and get alerted when scores drop.
          </p>
          <Link href="/pricing" className={buttonVariants()}>
            Upgrade to Pro
          </Link>
        </div>
      </Shell>
    );
  }

  const monitors = user ? await listMonitors(user.id) : [];
  const cap = planOf(user).monitors;
  const atCap = monitors.length >= cap;

  return (
    <Shell>
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Monitors</h1>
        <p className="text-muted-foreground">
          Re-scan saved sites on a schedule and get an email if the SEO score drops. History and
          trends appear under <Link href="/history" className="text-primary-link hover:underline">your scans</Link>.
        </p>
      </div>

      <Card>
        <CardContent>
          <form action={createMonitor} className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Input
              type="text"
              inputMode="url"
              name="url"
              placeholder="example.com"
              aria-label="Site URL"
              required
              disabled={atCap}
              className="h-10 flex-1"
            />
            <select
              name="cadence"
              aria-label="Cadence"
              disabled={atCap}
              className="h-10 rounded-md border bg-background px-2 text-sm"
            >
              <option value="daily">Daily</option>
              <option value="weekly" selected>Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input type="checkbox" name="deep" value="on" disabled={atCap} /> Deep
            </label>
            <Button type="submit" disabled={atCap}>
              Add monitor
            </Button>
          </form>
          <p className="mt-2 text-xs text-muted-foreground">
            {monitors.length}/{cap} monitors used{atCap ? " — limit reached" : ""}.
          </p>
        </CardContent>
      </Card>

      {monitors.length === 0 ? (
        <p className="text-muted-foreground">No monitors yet. Add a site above to start tracking it.</p>
      ) : (
        <div className="space-y-2">
          {monitors.map((m) => (
            <Card key={m.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium">{m.url}</span>
                    <Badge variant="outline" className="capitalize">{m.cadence}</Badge>
                    {m.deep && <Badge variant="outline">deep</Badge>}
                    {!m.enabled && <Badge variant="secondary">paused</Badge>}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {m.last_run_at
                      ? `Last: SEO ${m.last_score ?? "—"} · AI ${m.last_ai_overall ?? "—"} · ${new Date(m.last_run_at).toLocaleString()}`
                      : "Not run yet"}
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  <form action={toggleMonitor}>
                    <input type="hidden" name="id" value={m.id} />
                    <input type="hidden" name="enabled" value={String(m.enabled)} />
                    <Button type="submit" variant="outline" size="sm">
                      {m.enabled ? "Pause" : "Resume"}
                    </Button>
                  </form>
                  <form action={removeMonitor}>
                    <input type="hidden" name="id" value={m.id} />
                    <Button type="submit" variant="outline" size="sm">Remove</Button>
                  </form>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </Shell>
  );
}
