import Link from "next/link";
import ThemeToggle from "@/components/theme-toggle";
import { recentScans } from "@/lib/db/scans";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Scan history — Meta Tag" };
export const dynamic = "force-dynamic";

function grade(s) {
  if (s == null) return "—";
  if (s >= 90) return "A";
  if (s >= 75) return "B";
  if (s >= 60) return "C";
  if (s >= 40) return "D";
  return "F";
}

export default async function HistoryPage() {
  const scans = await recentScans(50);

  return (
    <div className="min-h-screen">
      <header className="flex h-14 items-center justify-between border-b px-6">
        <Link href="/" className="font-bold tracking-tight no-underline">
          🔎 Meta Tag
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
