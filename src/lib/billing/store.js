// Subscription state on the user row (best-effort; no-ops without Neon).

import { sql } from "../db";

// Record the freshly-created subscription against the user (status 'created').
export async function setUserSubscription(userId, { subId, status }) {
  if (!sql || !userId) return;
  try {
    await sql`
      UPDATE users
      SET razorpay_subscription_id = ${subId}, subscription_status = ${status}
      WHERE id = ${userId}`;
  } catch {
    /* best-effort */
  }
}

// Apply a verified webhook event: flip plan + status (+ period end) for the
// matching user, located by subscription id or the notes.user_id fallback.
export async function applySubscriptionEvent({ subId, userId, status, plan, periodEnd }) {
  if (!sql) return;
  try {
    await sql`
      UPDATE users SET
        plan = ${plan},
        subscription_status = ${status},
        razorpay_subscription_id = COALESCE(${subId}, razorpay_subscription_id),
        current_period_end = ${periodEnd ? new Date(periodEnd * 1000).toISOString() : null}
      WHERE razorpay_subscription_id = ${subId}
         OR (${userId}::uuid IS NOT NULL AND id = ${userId}::uuid)`;
  } catch {
    /* best-effort */
  }
}
