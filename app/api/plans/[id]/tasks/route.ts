import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getPlan, createTask } from "@/lib/firestore";
import { canAddActiveTask } from "@/lib/tiers";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getCurrentUser();
    if (!auth) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    if (!rateLimit(`tasks:${auth.userId}`, { maxRequests: 60, windowMs: 60_000 })) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }
    const { id } = await params;
    const body = await req.json();

    const plan = await getPlan(id, auth.userId);
    if (!plan) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    // Archived/completed plans are read-only
    if (plan.status === "archived" || plan.status === "completed") {
      return NextResponse.json({ error: "Plan is archived" }, { status: 403 });
    }

    // Validate title
    if (!body.title || typeof body.title !== "string" || body.title.trim().length === 0) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }
    if (body.title.length > 500) {
      return NextResponse.json({ error: "Title must be under 500 characters" }, { status: 400 });
    }

    // Validate section
    const validSections = ["do_first", "this_week", "not_this_week"];
    const targetSection = body.section || "this_week";
    if (!validSections.includes(targetSection)) {
      return NextResponse.json({ error: "Invalid section" }, { status: 400 });
    }
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

    // Validate optional timeEstimate
    if (body.timeEstimate !== undefined && body.timeEstimate !== null) {
      if (typeof body.timeEstimate !== "string" || body.timeEstimate.length > 100) {
        return NextResponse.json({ error: "Invalid time estimate" }, { status: 400 });
      }
    }

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
