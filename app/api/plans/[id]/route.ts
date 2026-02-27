import { NextRequest, NextResponse } from "next/server";
import { getAuthOrAnon } from "@/lib/auth";
import { getPlan, updatePlan } from "@/lib/firestore";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthOrAnon();
    const { id } = await params;
    const plan = await getPlan(id, auth.userId);

    if (!plan) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    return NextResponse.json(plan);
  } catch (e) {
    console.error("Get plan error:", e);
    return NextResponse.json(
      { error: "Failed to load plan" },
      { status: 500 }
    );
  }
}

export async function PATCH(
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

    const validStatuses = ["review", "active", "completed", "archived"];
    if (!body.status || !validStatuses.includes(body.status)) {
      return NextResponse.json(
        { error: "Invalid status" },
        { status: 400 }
      );
    }

    // Enforce valid state transitions
    const validTransitions: Record<string, string[]> = {
      review: ["active", "archived"],
      active: ["completed", "archived"],
      completed: ["archived"],
      archived: [],
    };
    if (!validTransitions[plan.status]?.includes(body.status)) {
      return NextResponse.json(
        { error: `Cannot change status from ${plan.status} to ${body.status}` },
        { status: 400 }
      );
    }

    await updatePlan(id, { status: body.status });

    // Refetch plan with tasks to return updated state
    const updated = await getPlan(id, auth.userId);
    return NextResponse.json(updated);
  } catch (e) {
    console.error("Update plan error:", e);
    return NextResponse.json(
      { error: "Failed to update plan" },
      { status: 500 }
    );
  }
}
