import { NextRequest, NextResponse } from "next/server";
import { getAuthOrAnon } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canAddActiveTask } from "@/lib/tiers";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; taskId: string }> }
) {
  try {
    const auth = await getAuthOrAnon();

    const { id, taskId } = await params;
    const body = await req.json();

    // Verify plan ownership
    const plan = await prisma.plan.findFirst({
      where: { id, userId: auth.userId },
    });
    if (!plan) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    // Verify task belongs to this plan
    const existingTask = await prisma.planTask.findFirst({
      where: { id: taskId, planId: id },
    });
    if (!existingTask) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Enforce 7-item cap when moving from parked to active
    if (body.section !== undefined && body.section !== "not_this_week") {
      if (existingTask.section === "not_this_week") {
        const capCheck = await canAddActiveTask(id);
        if (!capCheck.allowed) {
          return NextResponse.json(
            { error: capCheck.message, code: "PLAN_FULL", activeCount: capCheck.activeCount },
            { status: 403 }
          );
        }
      }
    }

    const updateData: Record<string, unknown> = {};
    if (body.status !== undefined) {
      updateData.status = body.status;
      updateData.completedAt = body.status === "done" ? new Date() : null;
    }
    if (body.title !== undefined) updateData.title = body.title;
    if (body.section !== undefined) updateData.section = body.section;
    if (body.timeEstimate !== undefined) updateData.timeEstimate = body.timeEstimate;

    const task = await prisma.planTask.update({
      where: { id: taskId },
      data: updateData,
    });

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
    const auth = await getAuthOrAnon();

    const { id, taskId } = await params;

    const plan = await prisma.plan.findFirst({
      where: { id, userId: auth.userId },
    });
    if (!plan) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    // Verify task belongs to this plan
    const existingTask = await prisma.planTask.findFirst({
      where: { id: taskId, planId: id },
    });
    if (!existingTask) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    await prisma.planTask.delete({ where: { id: taskId } });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("Delete task error:", e);
    return NextResponse.json(
      { error: "Failed to delete task" },
      { status: 500 }
    );
  }
}
