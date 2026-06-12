"use client";

// Opens Razorpay Checkout for the Pro subscription, then polls /api/auth/me
// until the webhook flips the plan to 'pro'. Pro is never granted client-side.

import { useState } from "react";
import { Button } from "@/components/ui/button";

const CHECKOUT_SRC = "https://checkout.razorpay.com/v1/checkout.js";

function loadCheckout() {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) return resolve();
    const s = document.createElement("script");
    s.src = CHECKOUT_SRC;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Could not load Razorpay Checkout."));
    document.body.appendChild(s);
  });
}

async function waitForPro(tries = 20) {
  for (let i = 0; i < tries; i++) {
    await new Promise((r) => setTimeout(r, 1500));
    try {
      const j = await fetch("/api/auth/me").then((r) => r.json());
      if (j.user?.plan === "pro") return true;
    } catch {
      /* keep polling */
    }
  }
  return false;
}

export default function UpgradeButton() {
  const [state, setState] = useState("idle"); // idle | opening | activating | error
  const [error, setError] = useState(null);

  async function upgrade() {
    setState("opening");
    setError(null);
    try {
      await loadCheckout();
      const res = await fetch("/api/billing/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cycle: "monthly" }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not start checkout.");

      const rzp = new window.Razorpay({
        key: json.keyId,
        subscription_id: json.subscriptionId,
        name: "Meta Tag",
        description: "Pro subscription",
        handler: async () => {
          setState("activating");
          const ok = await waitForPro();
          if (ok) window.location.reload();
          else {
            setState("error");
            setError("Payment received — activation is taking a moment. Refresh shortly.");
          }
        },
        modal: { ondismiss: () => setState("idle") },
        theme: { color: "#e8590c" },
      });
      rzp.on("payment.failed", () => {
        setState("error");
        setError("Payment failed. Please try again.");
      });
      rzp.open();
    } catch (e) {
      setState("error");
      setError(e.message);
    }
  }

  if (state === "activating") {
    return <p className="text-sm text-muted-foreground">Activating your Pro plan…</p>;
  }

  return (
    <div className="space-y-2">
      <Button className="w-full" onClick={upgrade} disabled={state === "opening"}>
        {state === "opening" ? "Opening checkout…" : "Upgrade to Pro"}
      </Button>
      {error && <p className="text-xs text-error">{error}</p>}
    </div>
  );
}
