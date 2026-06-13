// Free vs Pro plan limits — single source of truth for feature gating.
// Billing isn't wired yet; a user's `plan` is 'free' by default and set to
// 'pro' manually (UPDATE users SET plan='pro' WHERE email=...).

import { sql } from "../db";

export const PLANS = {
  free: { label: "Free", scansPerDay: 3, maxPages: 10, deepScan: false, premium: false, history: false, monitors: 0 },
  pro: { label: "Pro", scansPerDay: 100, maxPages: 40, deepScan: true, premium: true, history: true, monitors: 10 },
};

// Display prices for the pricing page (INR). These must match the amounts on
// the Razorpay dashboard plans (RAZORPAY_PRO_PLAN_ID / _ANNUAL).
export const PRO_PRICING = {
  monthly: { amount: "₹999", per: "/mo" },
  annual: { amount: "₹9,999", per: "/yr", note: "2 months free" },
};

export function planOf(user) {
  return PLANS[user?.plan] || PLANS.free;
}

export function isPro(user) {
  return user?.plan === "pro";
}

// How many scans this user has run today (for the daily Free cap).
export async function scansUsedToday(userId) {
  if (!sql || !userId) return 0;
  try {
    const rows = await sql`
      SELECT count(*)::int AS n FROM scans
      WHERE user_id = ${userId} AND created_at::date = current_date`;
    return rows[0]?.n || 0;
  } catch {
    return 0;
  }
}
