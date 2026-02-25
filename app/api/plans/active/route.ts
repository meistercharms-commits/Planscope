import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const auth = await getCurrentUser();
    if (!auth) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const now = new Date();
    const dayOfWeek = now.getDay();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - dayOfWeek);
    weekStart.setHours(0, 0, 0, 0);

    const plans = await prisma.plan.findMany({
      where: {
        userId: auth.userId,
        status: { in: ["active", "review"] },
        weekStart: { gte: weekStart },
      },
      include: {
        tasks: {
          select: { id: true, status: true, section: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(
      plans.map((plan) => {
        const activeTasks = plan.tasks.filter((t) => t.section !== "not_this_week");
        const doneTasks = activeTasks.filter((t) => t.status === "done");
        return {
          id: plan.id,
          label: plan.label,
          mode: plan.mode,
          status: plan.status,
          weekStart: plan.weekStart,
          totalTasks: activeTasks.length,
          completedTasks: doneTasks.length,
        };
      })
    );
  } catch (e) {
    console.error("Active plans error:", e);
    return NextResponse.json({ error: "Failed to load active plans" }, { status: 500 });
  }
}
