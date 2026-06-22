"use client";

// Header auth control: shows the signed-in user (avatar + plan badge + sign out)
// or a "Sign in" link. Reads /api/auth/me on mount.

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";

export default function UserMenu() {
  const [user, setUser] = useState(undefined); // undefined = loading, null = signed out
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((j) => setUser(j.user || null))
      .catch(() => setUser(null));
  }, []);

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.reload();
  }

  if (user === undefined) return <div className="size-8" aria-hidden="true" />;

  if (!user) {
    return (
      <Link href="/login" className={buttonVariants({ variant: "outline", size: "sm" })}>
        Sign in
      </Link>
    );
  }

  const initial = (user.name || user.email || "?").trim().charAt(0).toUpperCase();

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full border p-0.5 pr-2 text-sm hover:bg-muted"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {user.picture ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.picture} alt="" className="size-7 rounded-full" referrerPolicy="no-referrer" />
        ) : (
          <span className="flex size-7 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
            {initial}
          </span>
        )}
        <Badge variant={user.plan === "pro" ? "default" : "outline"} className="capitalize">
          {user.plan || "free"}
        </Badge>
      </button>

      {open && (
        <div
          className="absolute right-0 z-50 mt-2 w-56 rounded-lg border bg-popover p-3 shadow-md"
          role="menu"
        >
          <div className="truncate text-sm font-medium">{user.name || "Account"}</div>
          {user.email && <div className="truncate text-xs text-muted-foreground">{user.email}</div>}
          <div className="mt-3">
            <Button variant="outline" size="sm" className="w-full" onClick={signOut}>
              Sign out
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
