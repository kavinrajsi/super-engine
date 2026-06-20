// Competitor discovery (Server Component). Pro-gated shell (mirrors /compare);
// the discovery itself runs client-side on demand via /api/seo/competitors.

import Link from "next/link";
import { redirect } from "next/navigation";
import ThemeToggle from "@/components/theme-toggle";
import { buttonVariants } from "@/components/ui/button";
import { currentUser } from "@/lib/auth/session";
import { isAuthConfigured } from "@/lib/auth/google";
import { isPro } from "@/lib/auth/plan";
import CompetitorsClient from "./competitors-client";

export const metadata = { title: "Find competitors — MadRank" };
export const dynamic = "force-dynamic";

function Shell({ children }) {
  return (
    <div className="min-h-screen">
      <header className="flex h-14 items-center justify-between border-b px-4 sm:px-6">
        <Link href="/" className="font-bold tracking-tight no-underline">
          📈 MadRank
        </Link>
        <ThemeToggle />
      </header>
      <div className="mx-auto max-w-3xl space-y-6 p-6">{children}</div>
    </div>
  );
}

export default async function CompetitorsPage() {
  // Pro gate (mirrors /compare).
  const user = isAuthConfigured() ? await currentUser() : null;
  if (isAuthConfigured() && !user) {
    redirect(`/login?next=${encodeURIComponent("/competitors")}`);
  }
  if (user && !isPro(user)) {
    return (
      <Shell>
        <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
          <h1 className="text-2xl font-bold">Competitor discovery is a Pro feature</h1>
          <p className="text-muted-foreground">
            Upgrade to Pro to auto-discover who competes with your site and benchmark against them.
          </p>
          <Link href="/pricing" className={buttonVariants()}>
            Upgrade to Pro
          </Link>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Find competitors</h1>
        <p className="text-muted-foreground">
          Discover who competes with your site (organic search overlap + AI), then send them straight
          to a head-to-head comparison.
        </p>
      </div>
      <CompetitorsClient />
    </Shell>
  );
}
