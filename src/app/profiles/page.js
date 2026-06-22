// Brand Memory (Server Component). Where the user describes their site(s) as
// Markdown — the shared context for AI articles + social posts. Login-only.

import Link from "next/link";
import { redirect } from "next/navigation";
import ThemeToggle from "@/components/theme-toggle";
import { currentUser } from "@/lib/auth/session";
import { isAuthConfigured } from "@/lib/auth/google";
import ProfilesClient from "./profiles-client";

export const metadata = { title: "Brand Memory — MadRank" };
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

export default async function ProfilesPage() {
  const user = isAuthConfigured() ? await currentUser() : null;
  if (isAuthConfigured() && !user) {
    redirect(`/login?next=${encodeURIComponent("/profiles")}`);
  }

  return (
    <Shell>
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Brand Memory</h1>
        <p className="text-muted-foreground">
          Describe your website in Markdown — voice, audience, products, positioning. We use this
          as the context for every AI-written article and social post.
        </p>
      </div>
      <ProfilesClient />
    </Shell>
  );
}
