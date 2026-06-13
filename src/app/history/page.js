import Link from "next/link";
import ThemeToggle from "@/components/theme-toggle";
import { recentScans } from "@/lib/db/scans";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { currentUser } from "@/lib/auth/session";
import { isAuthConfigured } from "@/lib/auth/google";
import { isPro } from "@/lib/auth/plan";

export const metadata = { title: "Scan history — MadRank" };
export const dynamic = "force-dynamic";

function Gate({ title, children }) {
  return (
    <div className="min-h-screen">
      <header className="flex h-14 items-center justify-between border-b px-6">
        <Link href="/" className="font-bold tracking-tight no-underline">
          📈 MadRank
        </Link>
        <ThemeToggle />
      </header>
      <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-4 p-6 text-center">
        <h1 className="text-2xl font-bold">{title}</h1>
        {children}
      </div>
    </div>
  );
}

function grade(s) {
  if (s == null) return "—";
  if (s >= 90) return "A";
  if (s >= 75) return "B";
  if (s >= 60) return "C";
  if (s >= 40) return "D";
  return "F";
}

export default async function HistoryPage() {
  const user = isAuthConfigured() ? await currentUser() : null;

  if (isAuthConfigured() && !user) {
    return (
      <Gate title="Sign in to view history">
        <p className="text-muted-foreground">Your saved scans are tied to your account.</p>
        <Link href="/login?next=/history" className={buttonVariants()}>
          Sign in
        </Link>
      </Gate>
    );
  }
  if (user && !isPro(user)) {
    return (
      <Gate title="History is a Pro feature">
        <p className="text-muted-foreground">
          Upgrade to Pro to keep and revisit your saved scan history.
        </p>
        <Link href="/pricing" className={buttonVariants()}>
          Upgrade to Pro
        </Link>
      </Gate>
    );
  }

  const scans = await recentScans(user?.id, 50);

  return (
    <div className="min-h-screen">
      <header className="flex h-14 items-center justify-between border-b px-6">
        <Link href="/" className="font-bold tracking-tight no-underline">
          📈 MadRank
        </Link>
        <ThemeToggle />
      </header>
      <div className="mx-auto max-w-3xl space-y-4 p-6">
        <h1 className="text-3xl font-bold tracking-tight">Recent scans</h1>
        {scans.length === 0 ? (
          <p className="text-muted-foreground">No scans yet. Run an audit to see it here.</p>
        ) : (
          <div className="space-y-2">
            {scans.map((s) => (
              <Link key={s.share_token} href={`/r/${s.share_token}`} className="block no-underline">
                <Card className="transition-colors hover:bg-muted/50">
                  <CardContent className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-foreground">{s.url}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(s.created_at).toLocaleString()} · {s.pages_count} pages
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <Badge variant="outline">
                        SEO {s.site_score ?? "—"} ({grade(s.site_score)})
                      </Badge>
                      <Badge variant="outline">AI {s.ai_overall ?? "—"}</Badge>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
