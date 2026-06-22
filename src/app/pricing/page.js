// Pricing — Free vs Pro. Logged-in free users can upgrade via Razorpay;
// Pro users see their renewal date + cancel.

import Link from "next/link";
import AppShell from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { currentUser } from "@/lib/auth/session";
import { isAuthConfigured } from "@/lib/auth/google";
import { PLANS, PRO_PRICING, isPro } from "@/lib/auth/plan";
import { isBillingConfigured, isTestMode } from "@/lib/billing/razorpay";
import UpgradeButton from "./upgrade-button";
import ManageSubscription from "./manage-subscription";

export const metadata = { title: "Pricing — MadRank" };
export const dynamic = "force-dynamic";

const FREE_POINTS = [
  `${PLANS.free.scansPerDay} scans/day`,
  `${PLANS.free.maxPages} pages per scan`,
  "On-page SEO + AI-search audit",
  "Plain-language fixes & issues",
];
const PRO_POINTS = [
  `${PLANS.pro.scansPerDay} scans/day`,
  `${PLANS.pro.maxPages} pages per scan + deep scan`,
  "Performance (PageSpeed) & AI fixes",
  "Search Console insights",
  "Saved history & shareable reports",
];

function Check({ children }) {
  return (
    <li className="flex items-start gap-2 text-sm">
      <span className="mt-0.5 text-pass">✓</span>
      <span>{children}</span>
    </li>
  );
}

export default async function PricingPage() {
  const user = isAuthConfigured() ? await currentUser() : null;
  const pro = isPro(user);

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl space-y-6 p-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">Simple pricing</h1>
          <p className="text-muted-foreground">Start free. Upgrade when you need more.</p>
        </div>

        {isBillingConfigured() && isTestMode() && (
          <p className="rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-center text-sm text-warning">
            ⚠️ Test mode — no real charge. Use Razorpay test card{" "}
            <code className="font-mono">4111 1111 1111 1111</code>, any future expiry &amp; CVV.
          </p>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          {/* Free */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Free <span className="text-2xl font-bold">₹0</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-1.5">
                {FREE_POINTS.map((p) => (
                  <Check key={p}>{p}</Check>
                ))}
              </ul>
              {!pro && <p className="text-xs text-muted-foreground">Your current plan.</p>}
            </CardContent>
          </Card>

          {/* Pro */}
          <Card className="border-primary">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  Pro <Badge>Popular</Badge>
                </span>
                <span className="text-2xl font-bold">
                  {PRO_PRICING.monthly.amount}
                  <span className="text-sm font-normal text-muted-foreground">
                    {PRO_PRICING.monthly.per}
                  </span>
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-1.5">
                {PRO_POINTS.map((p) => (
                  <Check key={p}>{p}</Check>
                ))}
              </ul>

              {!isBillingConfigured() ? (
                <p className="rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
                  Online upgrade isn&rsquo;t enabled yet. Contact us to go Pro.
                </p>
              ) : !user ? (
                <Link href="/login?next=/pricing" className={buttonVariants({ className: "w-full" })}>
                  Sign in to upgrade
                </Link>
              ) : pro ? (
                <ManageSubscription user={user} />
              ) : (
                <UpgradeButton />
              )}
            </CardContent>
          </Card>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Payments are processed securely by Razorpay (UPI, cards, netbanking). Cancel anytime.
        </p>
      </div>
    </AppShell>
  );
}
