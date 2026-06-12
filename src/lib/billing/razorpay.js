// Razorpay subscriptions — raw REST (no SDK), mirroring the auth/GSC pattern.
// Base https://api.razorpay.com/v1, HTTP Basic auth (key_id:key_secret).
// Plan changes are driven by signature-verified webhooks, never the client.

import { createHmac, timingSafeEqual } from "crypto";
import { sql } from "../db";

const BASE = "https://api.razorpay.com/v1";

export function isBillingConfigured() {
  return !!(
    process.env.RAZORPAY_KEY_ID &&
    process.env.RAZORPAY_KEY_SECRET &&
    (process.env.RAZORPAY_PRO_PLAN_ID || process.env.RAZORPAY_PRO_PLAN_ID_ANNUAL) &&
    sql
  );
}

export function publishableKeyId() {
  return process.env.RAZORPAY_KEY_ID || null;
}

export function proPlanId(cycle) {
  return cycle === "annual"
    ? process.env.RAZORPAY_PRO_PLAN_ID_ANNUAL || process.env.RAZORPAY_PRO_PLAN_ID
    : process.env.RAZORPAY_PRO_PLAN_ID || process.env.RAZORPAY_PRO_PLAN_ID_ANNUAL;
}

async function rzpFetch(path, init = {}) {
  const auth = Buffer.from(
    `${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`
  ).toString("base64");
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json", ...init.headers },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json.error?.description || `Razorpay error (${res.status})`);
  }
  return json;
}

// Create a subscription for `userId` on the given billing cycle.
export function createSubscription({ cycle = "monthly", userId }) {
  return rzpFetch("/subscriptions", {
    method: "POST",
    body: JSON.stringify({
      plan_id: proPlanId(cycle),
      total_count: cycle === "annual" ? 10 : 120,
      customer_notify: 1,
      notes: { user_id: String(userId) },
    }),
  });
}

// Cancel at the end of the current cycle so the user keeps Pro until it expires.
export function cancelSubscription(subId) {
  return rzpFetch(`/subscriptions/${subId}/cancel`, {
    method: "POST",
    body: JSON.stringify({ cancel_at_cycle_end: 1 }),
  });
}

// Verify the webhook signature (HMAC-SHA256 of the raw body, hex).
export function verifyWebhook(rawBody, signature) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret || !signature) return false;
  try {
    const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
    const a = Buffer.from(expected);
    const b = Buffer.from(signature);
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
