import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getActivePlans } from "@/lib/firestore";

export async function GET() {
  try {
    const auth = await getCurrentUser();
    if (!auth) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const plans = await getActivePlans(auth.userId);

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
