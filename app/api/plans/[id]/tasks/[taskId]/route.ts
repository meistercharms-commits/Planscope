import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getPlan, getTask, updateTask, deleteTask, promoteTaskAtomic } from "@/lib/firestore";
import { rateLimit } from "@/lib/rate-limit";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; taskId: string }> }
) {
  try {
    const auth = await getCurrentUser();
    if (!auth) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    if (!rateLimit(`tasks:${auth.userId}`, { maxRequests: 60, windowMs: 60_000 })) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const { id, taskId } = await params;
    const body = await req.json();

    // Verify plan ownership
    const plan = await getPlan(id, auth.userId);
    if (!plan) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    // Archived/completed plans are read-only
    if (plan.status === "archived" || plan.status === "completed") {
      return NextResponse.json({ error: "Plan is archived" }, { status: 403 });
    }

    // Verify task belongs to this plan
    const existingTask = await getTask(id, taskId);
    if (!existingTask) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Enforce 7-item cap atomically when promoting from parked to active
    if (body.section !== undefined && body.section !== "not_this_week") {
      if (existingTask.section === "not_this_week") {
        // Use transaction to prevent race condition (two tabs promoting simultaneously)
        const result = await promoteTaskAtomic(id, taskId, body.section);
        if (!result.allowed) {
          return NextResponse.json(
            { error: "Your plan is full. Pick what matters.", code: "PLAN_FULL", activeCount: result.activeCount },
            { status: 403 }
          );
        }
        // If only section was being changed, return early
        if (Object.keys(body).length === 1) {
          return NextResponse.json(result.task);
        }
        // Otherwise, continue with remaining field updates (remove section since already handled)
        delete body.section;
      }
    }

    // Validate fields before building update
    const validStatuses = ["pending", "done", "skipped"];
    if (body.status !== undefined && !validStatuses.includes(body.status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    const validSections = ["do_first", "this_week", "not_this_week"];
    if (body.section !== undefined && !validSections.includes(body.section)) {
      return NextResponse.json({ error: "Invalid section" }, { status: 400 });
    }
    if (body.title !== undefined) {
      if (typeof body.title !== "string" || body.title.trim().length === 0) {
        return NextResponse.json({ error: "Title cannot be empty" }, { status: 400 });
      }
      if (body.title.length > 500) {
        return NextResponse.json({ error: "Title must be under 500 characters" }, { status: 400 });
      }
    }

    const updateData: Record<string, unknown> = {};
    if (body.status !== undefined) {
      updateData.status = body.status;
      updateData.completedAt = body.status === "done" ? new Date() : null;
    }
    if (body.title !== undefined) updateData.title = body.title;
    if (body.section !== undefined) updateData.section = body.section;
    if (body.timeEstimate !== undefined) {
      if (body.timeEstimate !== null && (typeof body.timeEstimate !== "string" || body.timeEstimate.length > 100)) {
        return NextResponse.json({ error: "Invalid time estimate" }, { status: 400 });
      }
      updateData.timeEstimate = body.timeEstimate;
    }

    const task = await updateTask(id, taskId, updateData);

    return NextResponse.json(task);
  } catch (e) {
    console.error("Update task error:", e);
    return NextResponse.json(
      { error: "Failed to update task" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; taskId: string }> }
) {
  try {
    const auth = await getCurrentUser();
    if (!auth) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { id, taskId } = await params;

    const plan = await getPlan(id, auth.userId);
    if (!plan) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    if (plan.status === "archived" || plan.status === "completed") {
      return NextResponse.json({ error: "Plan is archived" }, { status: 403 });
    }

    // Verify task belongs to this plan
    const existingTask = await getTask(id, taskId);
    if (!existingTask) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    await deleteTask(id, taskId);

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("Delete task error:", e);
    return NextResponse.json(
      { error: "Failed to delete task" },
      { status: 500 }
    );
  }
}
