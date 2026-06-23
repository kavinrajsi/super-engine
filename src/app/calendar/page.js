// Content calendar (Server Component). A month grid of scheduled articles/posts.
// Schedule items from Articles / Post Ideas; this is the at-a-glance view.

import Link from "next/link";
import { redirect } from "next/navigation";
import AppShell from "@/components/app-shell";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { currentUser } from "@/lib/auth/session";
import { isAuthConfigured } from "@/lib/auth/google";
import { scheduledContent } from "@/lib/db/content";

export const metadata = { title: "Calendar — MadRank" };
export const dynamic = "force-dynamic";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const KIND_LABEL = { article: "Article", social: "Post", idea: "Idea" };

function parseMonth(s) {
  const m = /^(\d{4})-(\d{2})$/.exec(s || "");
  const now = new Date();
  let y = now.getUTCFullYear();
  let mo = now.getUTCMonth();
  if (m) {
    y = Number(m[1]);
    mo = Number(m[2]) - 1;
  }
  return { y, mo };
}

function ymParam(y, mo) {
  return `${y}-${String(mo + 1).padStart(2, "0")}`;
}

export default async function CalendarPage({ searchParams }) {
  const sp = await searchParams;
  const user = isAuthConfigured() ? await currentUser() : null;
  if (isAuthConfigured() && !user) {
    redirect(`/login?next=${encodeURIComponent("/calendar")}`);
  }

  const { y, mo } = parseMonth(typeof sp?.month === "string" ? sp.month : "");
  const monthStart = new Date(Date.UTC(y, mo, 1));
  const nextMonth = new Date(Date.UTC(y, mo + 1, 1));
  const items = await scheduledContent(
    user?.id ?? null,
    monthStart.toISOString(),
    nextMonth.toISOString()
  );

  // Bucket items by day-of-month.
  const byDay = new Map();
  for (const it of items) {
    const d = new Date(it.scheduled_for).getUTCDate();
    if (!byDay.has(d)) byDay.set(d, []);
    byDay.get(d).push(it);
  }

  // Build the leading blanks + day cells.
  const firstDow = monthStart.getUTCDay();
  const daysInMonth = new Date(Date.UTC(y, mo + 1, 0)).getUTCDate();
  const cells = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const prev = mo === 0 ? ymParam(y - 1, 11) : ymParam(y, mo - 1);
  const next = mo === 11 ? ymParam(y + 1, 0) : ymParam(y, mo + 1);

  return (
    <AppShell title="Calendar">
      <div className="mx-auto max-w-5xl space-y-4 p-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">
            {MONTHS[mo]} {y}
          </h1>
          <div className="flex gap-2">
            <Link href={`/calendar?month=${prev}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
              ← Prev
            </Link>
            <Link href="/calendar" className={buttonVariants({ variant: "outline", size: "sm" })}>
              Today
            </Link>
            <Link href={`/calendar?month=${next}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
              Next →
            </Link>
          </div>
        </div>

        {items.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Nothing scheduled this month. Schedule articles or posts from{" "}
            <Link href="/articles" className="underline">Articles</Link> or{" "}
            <Link href="/post-ideas" className="underline">Post Ideas</Link>.
          </p>
        )}

        <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg border bg-border text-sm">
          {DOW.map((d) => (
            <div key={d} className="bg-muted/50 px-2 py-1.5 text-center text-xs font-medium text-muted-foreground">
              {d}
            </div>
          ))}
          {cells.map((d, i) => (
            <div key={i} className="min-h-24 bg-card p-1.5 align-top">
              {d && (
                <>
                  <div className="text-xs text-muted-foreground">{d}</div>
                  <div className="mt-1 space-y-1">
                    {(byDay.get(d) || []).map((it) => (
                      <div
                        key={it.id}
                        className="truncate rounded border bg-background px-1.5 py-1 text-xs"
                        title={it.title || it.topic}
                      >
                        <Badge variant="outline" className="mr-1 align-middle text-[10px]">
                          {KIND_LABEL[it.kind] || it.kind}
                        </Badge>
                        {it.title || it.topic}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
