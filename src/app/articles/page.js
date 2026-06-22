// Articles (Server Component). AI writes a full article from a brand memory +
// topic. Login-only.

import Link from "next/link";
import { redirect } from "next/navigation";
import ThemeToggle from "@/components/theme-toggle";
import { buttonVariants } from "@/components/ui/button";
import { currentUser } from "@/lib/auth/session";
import { isAuthConfigured } from "@/lib/auth/google";
import ArticlesClient from "./articles-client";

export const metadata = { title: "Articles — MadRank" };
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

export default async function ArticlesPage() {
  const user = isAuthConfigured() ? await currentUser() : null;
  if (isAuthConfigured() && !user) {
    redirect(`/login?next=${encodeURIComponent("/articles")}`);
  }

  return (
    <Shell>
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Articles</h1>
        <p className="text-muted-foreground">
          Pick a{" "}
          <Link href="/profiles" className="underline">
            brand memory
          </Link>{" "}
          and a topic — AI writes a publish-ready, SEO-optimized article in your brand voice.
        </p>
      </div>
      <ArticlesClient />
    </Shell>
  );
}
