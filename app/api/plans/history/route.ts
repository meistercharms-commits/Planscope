import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getUserTier, canViewHistory } from "@/lib/tiers";

export async function GET() {
  try {
    const auth = await getCurrentUser();
    if (!auth) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const tier = await getUserTier(auth.userId);
    if (!canViewHistory(tier)) {
      return NextResponse.json(
        { error: "Plan history is available on Pro and Pro Plus.", code: "TIER_REQUIRED" },
        { status: 403 }
      );
    }

    const plans = await prisma.plan.findMany({
      where: { userId: auth.userId },
      include: {
        tasks: {
          select: { id: true, status: true, section: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    const history = plans.map((plan) => {
      const activeTasks = plan.tasks.filter((t) => t.section !== "not_this_week");
      const doneTasks = activeTasks.filter((t) => t.status === "done");
      return {
        id: plan.id,
        label: plan.label,
        mode: plan.mode,
        weekStart: plan.weekStart,
        weekEnd: plan.weekEnd,
        status: plan.status,
        createdAt: plan.createdAt,
        totalTasks: activeTasks.length,
        completedTasks: doneTasks.length,
        completionRate:
          activeTasks.length > 0
            ? Math.round((doneTasks.length / activeTasks.length) * 100)
            : 0,
      };
    });

    return NextResponse.json(history);
  } catch (e) {
    console.error("Plan history error:", e);
    return NextResponse.json({ error: "Failed to load history" }, { status: 500 });
  }
}
