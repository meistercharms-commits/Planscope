import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const auth = await getCurrentUser();
    if (!auth) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: {
        id: true,
        email: true,
        createdAt: true,
        updatedAt: true,
        plans: {
          include: {
            tasks: {
              orderBy: { sortOrder: "asc" },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const exportData = {
      exportedAt: new Date().toISOString(),
      account: {
        id: user.id,
        email: user.email,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      plans: user.plans.map((plan) => ({
        id: plan.id,
        mode: plan.mode,
        weekStart: plan.weekStart,
        weekEnd: plan.weekEnd,
        originalDump: plan.originalDump,
        parsedDump: plan.parsedDump ? JSON.parse(plan.parsedDump) : null,
        constraints: plan.constraints ? JSON.parse(plan.constraints) : null,
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
