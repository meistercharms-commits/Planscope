import { NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe, mapPriceIdToTier } from "@/lib/stripe-admin";
import { getUserByStripeCustomerId, updateUser } from "@/lib/firestore";

// ─── Helpers ───

function getCustomerId(obj: { customer: string | Stripe.Customer | Stripe.DeletedCustomer }): string {
  return typeof obj.customer === "string" ? obj.customer : obj.customer.id;
}

function getSubscriptionPeriodEnd(subscription: Stripe.Subscription): Date {
  // In Stripe v20+, current_period_end is on each SubscriptionItem
  const item = subscription.items.data[0];
  if (item?.current_period_end) {
    return new Date(item.current_period_end * 1000);
  }
  // Fallback: use billing_cycle_anchor if no item period available
  return new Date(subscription.billing_cycle_anchor * 1000);
}

function getSubscriptionIdFromInvoice(invoice: Stripe.Invoice): string | null {
  // In Stripe v20+, subscription is nested under parent.subscription_details
  const subDetails = invoice.parent?.subscription_details;
  if (!subDetails?.subscription) return null;
  return typeof subDetails.subscription === "string"
    ? subDetails.subscription
    : subDetails.subscription.id;
}

// Simple in-memory set to detect duplicate webhook deliveries (same serverless instance)
const processedEvents = new Set<string>();
const MAX_PROCESSED_EVENTS = 500;

/**
 * POST /api/webhooks/stripe
 *
 * Handles Stripe webhook events for subscription lifecycle.
 * CRITICAL: Verifies webhook signature before processing.
 *
 * Events handled:
 * - customer.subscription.created — New subscription
 * - customer.subscription.updated — Plan change / renewal
 * - customer.subscription.deleted — Cancellation
 * - invoice.payment_succeeded — Successful payment
 * - invoice.payment_failed — Failed payment
 */
export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    console.error("Webhook: Missing stripe-signature header");
    return NextResponse.json(
      { error: "Missing signature" },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  // 1. Verify webhook signature (CRITICAL for security)
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    console.error("Webhook: STRIPE_WEBHOOK_SECRET not configured");
    return NextResponse.json(
      { error: "Server misconfigured" },
      { status: 500 }
    );
  }

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`Webhook signature verification failed: ${message}`);
    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 400 }
    );
  }

  // 2. Check for duplicate delivery (same serverless instance)
  if (processedEvents.has(event.id)) {
    console.log(`Webhook: Duplicate event ${event.id} (${event.type}), skipping`);
    return NextResponse.json({ received: true });
  }
  processedEvents.add(event.id);
  // Prevent unbounded growth
  if (processedEvents.size > MAX_PROCESSED_EVENTS) {
    const firstKey = processedEvents.values().next().value;
    if (firstKey) processedEvents.delete(firstKey);
  }

  // 3. Process event
  try {
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = getCustomerId(subscription);

        const result = await getUserByStripeCustomerId(customerId);
        if (!result) {
          console.error(
            `Webhook: No user found for Stripe customer ${customerId}`
          );
          break;
        }

        const priceId = subscription.items.data[0]?.price?.id;
        if (!priceId) {
          console.error("Webhook: No price ID found in subscription");
          break;
        }

        const tier = mapPriceIdToTier(priceId);
        const periodEnd = getSubscriptionPeriodEnd(subscription);

        await updateUser(result.uid, {
          stripeSubscriptionId: subscription.id,
          stripeSubscriptionStatus: subscription.status,
          stripePriceId: priceId,
          stripeCurrentPeriodEnd: periodEnd,
          tier,
          tierUpdatedAt: new Date(),
          subscriptionUpdatedAt: new Date(),
        });

        console.log(
          `Webhook: Updated user ${result.uid} to tier "${tier}" (${event.type})`
        );
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = getCustomerId(subscription);

        const result = await getUserByStripeCustomerId(customerId);
        if (!result) {
          console.error(
            `Webhook: No user found for Stripe customer ${customerId}`
          );
          break;
        }

        // Revert to free tier
        await updateUser(result.uid, {
          tier: "free",
          stripeSubscriptionId: null,
          stripeSubscriptionStatus: "canceled",
          stripePriceId: null,
          stripeCurrentPeriodEnd: null,
          tierUpdatedAt: new Date(),
          subscriptionUpdatedAt: new Date(),
        });

        console.log(
          `Webhook: Cancelled subscription for user ${result.uid}, reverted to free tier`
        );
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        if (!invoice.customer) break;
        const customerId = getCustomerId(invoice as { customer: string | Stripe.Customer | Stripe.DeletedCustomer });

        const result = await getUserByStripeCustomerId(customerId);
        if (!result) break;

        // Update period end from the subscription
        const subscriptionId = getSubscriptionIdFromInvoice(invoice);

        if (subscriptionId) {
          const subscription =
            await stripe.subscriptions.retrieve(subscriptionId);
          const periodEnd = getSubscriptionPeriodEnd(subscription);
          await updateUser(result.uid, {
            stripeCurrentPeriodEnd: periodEnd,
            stripeSubscriptionStatus: subscription.status,
            subscriptionUpdatedAt: new Date(),
          });
        }

        console.log(
          `Webhook: Payment succeeded for user ${result.uid}`
        );
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        if (!invoice.customer) break;
        const customerId = getCustomerId(invoice as { customer: string | Stripe.Customer | Stripe.DeletedCustomer });

        const result = await getUserByStripeCustomerId(customerId);
        if (!result) break;

        // Mark as past_due but DON'T change the tier yet
        // (give user time to update payment method)
        await updateUser(result.uid, {
          stripeSubscriptionStatus: "past_due",
          subscriptionUpdatedAt: new Date(),
        });

        console.log(
          `Webhook: Payment failed for user ${result.uid}, marked as past_due`
        );
        break;
      }

      default:
        console.log(`Webhook: Unhandled event type ${event.type}`);
    }
  } catch (error) {
    console.error(`Webhook processing error for ${event.type}:`, error);
    // Still return 200 to acknowledge receipt — Stripe will retry otherwise
  }

  // Always return 200 to Stripe
  return NextResponse.json({ received: true });
}
