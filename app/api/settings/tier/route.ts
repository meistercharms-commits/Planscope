import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getUserTier, getMonthlyPlanCount } from "@/lib/tiers";
import { TIER_LIMITS, TIER_LABELS, TIER_PRICES } from "@/types";

export async function GET() {
  try {
    const auth = await getCurrentUser();
    if (!auth) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
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
        plansLimit: limits.plansPerMonth,
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

// PATCH: Update tier (for testing; will be replaced by Stripe webhook)
export async function PATCH(req: NextRequest) {
  try {
    const auth = await getCurrentUser();
    if (!auth) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { tier } = await req.json();
    const validTiers = ["free", "pro", "pro_plus"];
    if (!validTiers.includes(tier)) {
      return NextResponse.json({ error: "Invalid tier" }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: auth.userId },
      data: { tier, tierUpdatedAt: new Date() },
    });

    return NextResponse.json({ tier });
  } catch (e) {
    console.error("Update tier error:", e);
    return NextResponse.json({ error: "Failed to update tier" }, { status: 500 });
  }
}
