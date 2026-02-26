import { NextResponse } from "next/server";
import { getCurrentUser, rateLimit } from "@/lib/auth";
import { getUser, updateUser } from "@/lib/firestore";
import { stripe, isValidPriceId } from "@/lib/stripe-admin";

/**
 * POST /api/checkout/create-session
 *
 * Creates a Stripe Checkout session for subscription upgrades.
 * Redirects the user to Stripe's hosted checkout page.
 *
 * Body: { priceId: string }
 * Returns: { checkoutUrl: string }
 */
export async function POST(req: Request) {
  try {
    // 1. Authenticate
    const auth = await getCurrentUser();
    if (!auth) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    // 2. Rate limit: 5 checkout attempts per user per hour
    if (
      !rateLimit(`checkout:${auth.userId}`, {
        maxRequests: 5,
        windowMs: 60 * 60 * 1000,
      })
    ) {
      return NextResponse.json(
        { error: "Too many checkout attempts. Please try again later." },
        { status: 429 }
      );
    }

    // 3. Parse and validate request
    const body = await req.json();
    const { priceId } = body;

    if (!priceId || typeof priceId !== "string") {
      return NextResponse.json(
        { error: "Price ID is required" },
        { status: 400 }
      );
    }

    if (!isValidPriceId(priceId)) {
      return NextResponse.json(
        { error: "Invalid price ID" },
        { status: 400 }
      );
    }

    // 4. Get user from Firestore
    const user = await getUser(auth.userId);
    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // 5. Create or retrieve Stripe customer
    let stripeCustomerId = user.stripeCustomerId;

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email || undefined,
        metadata: {
          firebaseUid: auth.userId,
        },
      });
      stripeCustomerId = customer.id;

      // Save Stripe customer ID to Firestore
      await updateUser(auth.userId, {
        stripeCustomerId: customer.id,
      });
    }

    // 6. Determine URLs
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    // 7. Create Stripe Checkout session
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: "subscription",
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${appUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/settings`,
      client_reference_id: auth.userId,
      subscription_data: {
        metadata: {
          firebaseUid: auth.userId,
        },
      },
      // Allow promotion codes if you want to offer discounts later
      allow_promotion_codes: true,
    });

    return NextResponse.json({
      checkoutUrl: session.url,
    });
  } catch (error) {
    console.error("Checkout session error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
