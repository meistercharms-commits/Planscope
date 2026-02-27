import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getPlanHistory } from "@/lib/firestore";

export async function GET() {
  try {
    const auth = await getCurrentUser();
    if (!auth) {
      return NextResponse.json({ tasks: [] });
    }

    // Get most recent plan (any status)
    const plans = await getPlanHistory(auth.userId, 1);
    if (plans.length === 0) {
      return NextResponse.json({ tasks: [] });
    }

    const latestPlan = plans[0];
    const parkedTasks = latestPlan.tasks
      .filter((t) => t.section === "not_this_week" && t.status === "pending")
      .map((t) => ({ id: t.id, title: t.title, category: t.category }));

    if (parkedTasks.length === 0) {
      return NextResponse.json({ tasks: [] });
    }

    return NextResponse.json({ planId: latestPlan.id, tasks: parkedTasks });
  } catch (e) {
    console.error("Parked tasks fetch error:", e);
    return NextResponse.json({ tasks: [] });
  }
}
