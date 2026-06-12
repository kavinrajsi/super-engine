// Cancel the signed-in user's subscription (at cycle end — they keep Pro until
// it expires). The actual plan flip happens later via the cancelled webhook.

import { sql } from "@/lib/db";
import { currentUser } from "@/lib/auth/session";
import { isBillingConfigured, cancelSubscription } from "@/lib/billing/razorpay";

export async function POST() {
  if (!isBillingConfigured()) {
    return Response.json({ error: "Billing isn't configured." }, { status: 503 });
  }
  const user = await currentUser();
  if (!user) return Response.json({ error: "not_authenticated" }, { status: 401 });

  const rows = sql
    ? await sql`SELECT razorpay_subscription_id AS sub FROM users WHERE id = ${user.id}`
    : [];
  const subId = rows[0]?.sub;
  if (!subId) return Response.json({ error: "no_subscription" }, { status: 400 });

  try {
    await cancelSubscription(subId);
    if (sql) {
      await sql`UPDATE users SET subscription_status = 'cancelling' WHERE id = ${user.id}`;
    }
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 502 });
  }
}
