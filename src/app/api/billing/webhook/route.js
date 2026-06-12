// Razorpay webhook — the ONLY place a user's plan is granted/revoked. Verifies
// the signature against the raw body, then maps the subscription lifecycle to
// the plan flag. Always returns 200 so Razorpay stops retrying.

import { verifyWebhook } from "@/lib/billing/razorpay";
import { applySubscriptionEvent } from "@/lib/billing/store";

// active subscription => Pro; ended/paused => Free.
const TO_PRO = new Set(["subscription.activated", "subscription.charged", "subscription.resumed"]);
const TO_FREE = new Set(["subscription.cancelled", "subscription.completed", "subscription.halted"]);

export async function POST(request) {
  const raw = await request.text();
  const signature = request.headers.get("x-razorpay-signature");
  if (!verifyWebhook(raw, signature)) {
    return Response.json({ error: "bad_signature" }, { status: 401 });
  }

  let event;
  try {
    event = JSON.parse(raw);
  } catch {
    return Response.json({ ok: true });
  }

  const sub = event?.payload?.subscription?.entity;
  const type = event?.event;
  if (sub && (TO_PRO.has(type) || TO_FREE.has(type))) {
    await applySubscriptionEvent({
      subId: sub.id,
      userId: sub.notes?.user_id || null,
      status: sub.status || type.replace("subscription.", ""),
      plan: TO_PRO.has(type) ? "pro" : "free",
      periodEnd: sub.current_end || null,
    });
  }

  return Response.json({ ok: true });
}
