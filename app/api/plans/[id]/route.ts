import { NextRequest, NextResponse } from "next/server";
import { getAuthOrAnon } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthOrAnon();
    const { id } = await params;
    const plan = await prisma.plan.findFirst({
      where: { id, userId: auth.userId },
      include: { tasks: { orderBy: { sortOrder: "asc" } } },
    });

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

    const plan = await prisma.plan.findFirst({
      where: { id, userId: auth.userId },
    });

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

    const updated = await prisma.plan.update({
      where: { id },
      data: { status: body.status },
      include: { tasks: { orderBy: { sortOrder: "asc" } } },
    });

    return NextResponse.json(updated);
  } catch (e) {
    console.error("Update plan error:", e);
    return NextResponse.json(
      { error: "Failed to update plan" },
      { status: 500 }
    );
  }
}
