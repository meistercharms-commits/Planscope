import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getUserTier, getMonthlyPlanCount } from "@/lib/tiers";
import { TIER_LIMITS, TIER_LABELS, TIER_PRICES } from "@/types";

export async function GET() {
  try {
    const auth = await getCurrentUser();

    // Not logged in — return free tier defaults
    if (!auth) {
      const tier = "free" as const;
      const limits = TIER_LIMITS[tier];
      return NextResponse.json({
        tier,
        label: TIER_LABELS[tier],
        prices: TIER_PRICES[tier],
        limits,
        usage: {
          plansThisMonth: 0,
          plansLimit: limits.plansPerMonth,
          plansRemaining: limits.plansPerMonth,
        },
      });
    }

    const tier = await getUserTier(auth.userId);
    const planCount = await getMonthlyPlanCount(auth.userId);
    const limits = TIER_LIMITS[tier];

    return NextResponse.json({
      tier,
      label: TIER_LABELS[tier],
      prices: TIER_PRICES[tier],
      limits,
      usage: {
        plansThisMonth: planCount,
        plansLimit: limits.plansPerMonth === Infinity ? null : limits.plansPerMonth,
        plansRemaining:
          limits.plansPerMonth === Infinity
            ? null
            : Math.max(0, limits.plansPerMonth - planCount),
      },
    });
  } catch (e) {
    console.error("Tier info error:", e);
    return NextResponse.json({ error: "Failed to load tier info" }, { status: 500 });
  }
}

// PATCH: Tier changes are now managed exclusively by Stripe webhooks.
// This endpoint is disabled to prevent free tier bypass.
export async function PATCH() {
  return NextResponse.json(
    { error: "Tier changes are managed through billing. Visit Settings to manage your subscription." },
    { status: 403 }
  );
}
