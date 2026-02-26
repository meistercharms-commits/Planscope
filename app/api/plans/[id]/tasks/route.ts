import { NextRequest, NextResponse } from "next/server";
import { getAuthOrAnon } from "@/lib/auth";
import { getPlan, createTask } from "@/lib/firestore";
import { canAddActiveTask } from "@/lib/tiers";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthOrAnon();
    const { id } = await params;
    const body = await req.json();

    const plan = await getPlan(id, auth.userId);
    if (!plan) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    // Enforce 7-item cap for active sections
    const targetSection = body.section || "this_week";
    if (targetSection !== "not_this_week") {
      const capCheck = await canAddActiveTask(id);
      if (!capCheck.allowed) {
        return NextResponse.json(
          { error: capCheck.message, code: "PLAN_FULL", activeCount: capCheck.activeCount },
          { status: 403 }
        );
      }
    }

    const maxOrder = Math.max(0, ...plan.tasks.map((t) => t.sortOrder));

    const task = await createTask(id, {
      title: body.title,
      section: body.section || "this_week",
      timeEstimate: body.timeEstimate || null,
      effort: "medium",
      urgency: "medium",
      category: "other",
      context: null,
      status: "pending",
      sortOrder: maxOrder + 1,
    });

    return NextResponse.json(task, { status: 201 });
  } catch (e) {
    console.error("Add task error:", e);
    return NextResponse.json(
      { error: "Failed to add task" },
      { status: 500 }
    );
  }
}
