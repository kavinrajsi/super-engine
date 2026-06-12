// Create a Razorpay subscription for the signed-in user and return the
// subscription id + publishable key for Checkout.

import { currentUser } from "@/lib/auth/session";
import {
  isBillingConfigured,
  createSubscription,
  publishableKeyId,
} from "@/lib/billing/razorpay";
import { setUserSubscription } from "@/lib/billing/store";

export async function POST(request) {
  if (!isBillingConfigured()) {
    return Response.json({ error: "Billing isn't configured." }, { status: 503 });
  }
  const user = await currentUser();
  if (!user) return Response.json({ error: "not_authenticated" }, { status: 401 });

  let cycle = "monthly";
  try {
    const body = await request.json();
    if (body?.cycle === "annual") cycle = "annual";
  } catch {
    /* default monthly */
  }

  try {
    const sub = await createSubscription({ cycle, userId: user.id });
    await setUserSubscription(user.id, { subId: sub.id, status: sub.status || "created" });
    return Response.json({ subscriptionId: sub.id, keyId: publishableKeyId() });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 502 });
  }
}
