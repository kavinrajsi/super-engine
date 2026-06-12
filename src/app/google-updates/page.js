// Reference: confirmed Google Search ranking updates (2024 → today), newest
// first, as a filterable timeline grouped by year. Static data from the
// official Search Status Dashboard.

import Link from "next/link";
import ThemeToggle from "@/components/theme-toggle";
import { GOOGLE_UPDATES, SOURCE_URL, DATA_AS_OF } from "@/lib/seo/google-updates";
import UpdatesTimeline from "./updates-timeline";

export const metadata = { title: "Google Algorithm Updates — Meta Tag" };

export default function GoogleUpdatesPage() {
  return (
    <div className="min-h-screen">
      <header className="flex h-14 items-center justify-between border-b px-6">
        <Link href="/" className="font-bold tracking-tight no-underline">
          🔎 Meta Tag
        </Link>
        <ThemeToggle />
      </header>

      <div className="mx-auto max-w-3xl space-y-6 p-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Google algorithm updates</h1>
          <p className="text-muted-foreground">
            Every confirmed Google Search ranking update (core &amp; spam) from 2024 to today,
            newest first — handy for lining up traffic shifts with a known update.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Source:{" "}
            <a href={SOURCE_URL} target="_blank" rel="noreferrer" className="hover:underline">
              Google Search Status Dashboard
            </a>{" "}
            · current as of {DATA_AS_OF}
          </p>
        </div>

        <UpdatesTimeline updates={GOOGLE_UPDATES} />
      </div>
    </div>
  );
}
