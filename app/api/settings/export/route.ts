import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getUserWithAllPlans } from "@/lib/firestore";

export async function GET() {
  try {
    const auth = await getCurrentUser();
    if (!auth) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const data = await getUserWithAllPlans(auth.userId);

    if (!data) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { user, plans } = data;

    const exportData = {
      exportedAt: new Date().toISOString(),
      account: {
        id: user.id,
        email: user.email,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      plans: plans.map((plan) => ({
        id: plan.id,
        mode: plan.mode,
        weekStart: plan.weekStart,
        weekEnd: plan.weekEnd,
        originalDump: plan.originalDump,
        parsedDump: plan.parsedDump,
        constraints: plan.constraints,
        status: plan.status,
        createdAt: plan.createdAt,
        updatedAt: plan.updatedAt,
        tasks: plan.tasks.map((task) => ({
          id: task.id,
          title: task.title,
          section: task.section,
          timeEstimate: task.timeEstimate,
          effort: task.effort,
          urgency: task.urgency,
          category: task.category,
          context: task.context,
          status: task.status,
          sortOrder: task.sortOrder,
          completedAt: task.completedAt,
          createdAt: task.createdAt,
        })),
      })),
    };

    return NextResponse.json(exportData);
  } catch (e) {
    console.error("Data export error:", e);
    return NextResponse.json(
      { error: "Failed to export data" },
      { status: 500 }
    );
  }
}
