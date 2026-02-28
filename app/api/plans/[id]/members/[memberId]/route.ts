import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getPlan, removePlanMember } from "@/lib/firestore";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  try {
    const auth = await getCurrentUser();
    if (!auth) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    const { id, memberId } = await params;
    const plan = await getPlan(id, auth.userId);
    if (!plan) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    const isOwner = plan.userId === auth.userId;
    const isSelf = memberId === auth.userId;

    // Owner can remove anyone; members can only remove themselves
    if (!isOwner && !isSelf) {
      return NextResponse.json({ error: "Not authorised" }, { status: 403 });
    }

    await removePlanMember(id, memberId);
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("Remove member error:", e);
    return NextResponse.json({ error: "Failed to remove member" }, { status: 500 });
  }
}
