// Post Ideas (Server Component). AI generates platform-native social post ideas
// from a brand memory + topic. Login-only.

import Link from "next/link";
import { redirect } from "next/navigation";
import AppShell from "@/components/app-shell";
import { currentUser } from "@/lib/auth/session";
import { isAuthConfigured } from "@/lib/auth/google";
import PostIdeasClient from "./post-ideas-client";

export const metadata = { title: "Post Ideas — MadRank" };
export const dynamic = "force-dynamic";

function Shell({ children }) {
  return (
    <AppShell>
      <div className="mx-auto max-w-3xl space-y-6 p-6">{children}</div>
    </AppShell>
  );
}

export default async function PostIdeasPage() {
  const user = isAuthConfigured() ? await currentUser() : null;
  if (isAuthConfigured() && !user) {
    redirect(`/login?next=${encodeURIComponent("/post-ideas")}`);
  }

  return (
    <Shell>
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Post Ideas</h1>
        <p className="text-muted-foreground">
          Generate platform-native social posts for Instagram, X, LinkedIn and more — all in your{" "}
          <Link href="/profiles" className="underline">
            brand voice
          </Link>
          .
        </p>
      </div>
      <PostIdeasClient />
    </Shell>
  );
}
