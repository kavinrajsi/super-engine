"use client";

// Account card + actions. Identity (avatar/name/email/plan) is read-only; the
// interactive bits are sign-out and the Google connect/disconnect controls.

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";

export default function AccountClient({ user, gscConfigured, googleConnected, googleEmail }) {
  const [busy, setBusy] = useState(false);
  const initial = (user.name || user.email || "?").trim().charAt(0).toUpperCase();

  async function signOut() {
    setBusy(true);
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    window.location.href = "/";
  }

  async function disconnectGoogle() {
    setBusy(true);
    await fetch("/api/gsc/disconnect", { method: "POST" }).catch(() => {});
    window.location.reload();
  }

  return (
    <div className="space-y-6">
      {/* Identity */}
      <Card>
        <CardContent className="flex items-center gap-4 py-6">
          {user.picture ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.picture}
              alt=""
              className="size-14 rounded-full"
              referrerPolicy="no-referrer"
            />
          ) : (
            <span className="flex size-14 items-center justify-center rounded-full bg-primary text-xl font-semibold text-primary-foreground">
              {initial}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <div className="truncate text-lg font-semibold">{user.name || "Account"}</div>
            {user.email && (
              <div className="truncate text-sm text-muted-foreground">{user.email}</div>
            )}
          </div>
          <Badge variant={user.plan === "pro" ? "default" : "outline"} className="capitalize">
            {user.plan || "free"}
          </Badge>
        </CardContent>
      </Card>

      {/* Google connection */}
      {gscConfigured && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Google connection</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center justify-between gap-3">
            {googleConnected ? (
              <>
                <p className="text-sm text-muted-foreground">
                  Connected{googleEmail ? ` as ${googleEmail}` : ""} — powers Analytics &amp; Search
                  Console.
                </p>
                <Button variant="outline" size="sm" onClick={disconnectGoogle} disabled={busy}>
                  Disconnect
                </Button>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  Not connected. Connect Google for Analytics &amp; Search Console data.
                </p>
                <a href="/api/gsc/auth" className={buttonVariants({ variant: "outline", size: "sm" })}>
                  Connect Google
                </a>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Session */}
      <Card>
        <CardContent className="flex items-center justify-between gap-3 py-6">
          <p className="text-sm text-muted-foreground">Sign out of MadRank on this device.</p>
          <Button variant="outline" size="sm" onClick={signOut} disabled={busy}>
            Sign out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
