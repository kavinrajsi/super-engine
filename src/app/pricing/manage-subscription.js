"use client";

// Shown to Pro users: renewal date + cancel (at cycle end).

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function ManageSubscription({ user }) {
  const [state, setState] = useState("idle"); // idle | cancelling | done | error
  const [error, setError] = useState(null);

  const renews = user.current_period_end
    ? new Date(user.current_period_end).toLocaleDateString()
    : null;
  const cancelling = user.subscription_status === "cancelling";

  async function cancel() {
    if (!confirm("Cancel Pro? You'll keep Pro until the end of the current period.")) return;
    setState("cancelling");
    setError(null);
    try {
      const res = await fetch("/api/billing/cancel", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not cancel.");
      setState("done");
    } catch (e) {
      setState("error");
      setError(e.message);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm">
        <Badge>Pro</Badge>
        {renews && <span className="text-muted-foreground">Renews {renews}</span>}
      </div>
      {state === "done" || cancelling ? (
        <p className="text-xs text-muted-foreground">
          Subscription will end at the current period. You keep Pro until then.
        </p>
      ) : (
        <Button variant="outline" size="sm" onClick={cancel} disabled={state === "cancelling"}>
          {state === "cancelling" ? "Cancelling…" : "Cancel subscription"}
        </Button>
      )}
      {error && <p className="text-xs text-error">{error}</p>}
    </div>
  );
}
