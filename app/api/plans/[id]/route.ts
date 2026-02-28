import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getPlan, updatePlan } from "@/lib/firestore";
import { getUserTier } from "@/lib/tiers";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getCurrentUser();
    if (!auth) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
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
    const auth = await getCurrentUser();
    if (!auth) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    const { id } = await params;
    const body = await req.json();

    const plan = await getPlan(id, auth.userId);

    if (!plan) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    // Handle label update
    if ("label" in body && !("status" in body) && !("colour" in body)) {
      const label = typeof body.label === "string" ? body.label.trim().slice(0, 50) : null;
      await updatePlan(id, { label: label || null });
      const updated = await getPlan(id, auth.userId);
      return NextResponse.json(updated);
    }

    // Handle colour update (Pro Plus only)
    if ("colour" in body && !("status" in body)) {
      const tier = await getUserTier(auth.userId);
      if (tier !== "pro_plus") {
        return NextResponse.json({ error: "Pro Plus feature" }, { status: 403 });
      }
      const validColours = ["work", "health", "home", "money", "life"];
      const colour = body.colour;
      if (colour !== null && !validColours.includes(colour)) {
        return NextResponse.json({ error: "Invalid colour" }, { status: 400 });
      }
      await updatePlan(id, { colour: colour || null });
      const updated = await getPlan(id, auth.userId);
      return NextResponse.json(updated);
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
