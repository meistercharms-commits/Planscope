import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getUser } from "@/lib/firestore";
import { stripe } from "@/lib/stripe-admin";

/**
 * GET /api/billing/customer
 *
 * Returns the current user's subscription info and a Stripe billing portal URL.
 * The billing portal lets users manage their subscription (change plan, cancel,
 * update payment method) entirely through Stripe's hosted UI.
 */
export async function GET() {
  try {
    // 1. Authenticate
    const auth = await getCurrentUser();
    if (!auth) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    // 2. Get user from Firestore
    const user = await getUser(auth.userId);
    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // 3. Build billing portal URL if user has a Stripe customer ID
    let billingPortalUrl: string | null = null;

    if (user.stripeCustomerId) {
      const appUrl =
        process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

      try {
        const portalSession = await stripe.billingPortal.sessions.create({
          customer: user.stripeCustomerId,
          return_url: `${appUrl}/settings`,
        });
        billingPortalUrl = portalSession.url;
      } catch (error) {
        console.error("Failed to create billing portal session:", error);
        // Continue without portal URL — not a fatal error
      }
    }

    // 4. Return subscription data (only what the UI needs — no internal Stripe IDs)
    return NextResponse.json({
      tier: user.tier,
      stripeSubscriptionId: user.stripeSubscriptionId,
      stripeSubscriptionStatus: user.stripeSubscriptionStatus,
      stripeCurrentPeriodEnd: user.stripeCurrentPeriodEnd
        ? user.stripeCurrentPeriodEnd.toISOString()
        : null,
      billingPortalUrl,
    });
  } catch (error) {
    console.error("Billing customer error:", error);
    return NextResponse.json(
      { error: "Failed to retrieve billing information" },
      { status: 500 }
    );
  }
}
