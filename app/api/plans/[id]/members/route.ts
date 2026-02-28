import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getPlan, getPlanMembers, addPlanMember, getUserByEmail } from "@/lib/firestore";
import { getUserTier, canSharePlans } from "@/lib/tiers";
import { rateLimit } from "@/lib/rate-limit";

const MAX_MEMBERS = 3;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

    const members = await getPlanMembers(id);
    return NextResponse.json({ members });
  } catch (e) {
    console.error("Get members error:", e);
    return NextResponse.json({ error: "Failed to load members" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getCurrentUser();
    if (!auth) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Rate limit: 10 share invites per hour per user
    if (!rateLimit(`share:${auth.userId}`, { maxRequests: 10, windowMs: 60 * 60 * 1000 })) {
      return NextResponse.json({ error: "Too many share requests. Try again later." }, { status: 429 });
    }

    const { id } = await params;
    const plan = await getPlan(id, auth.userId);
    if (!plan) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    // Only plan owner can invite
    if (plan.userId !== auth.userId) {
      return NextResponse.json({ error: "Only the plan owner can share" }, { status: 403 });
    }

    // Must be Pro Plus to share
    const tier = await getUserTier(auth.userId);
    if (!canSharePlans(tier)) {
      return NextResponse.json({ error: "Upgrade to Pro Plus to share plans" }, { status: 403 });
    }

    const body = await req.json();
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!email || !EMAIL_RE.test(email)) {
      return NextResponse.json({ error: "Valid email required" }, { status: 400 });
    }

    // Check member limit
    const currentMembers = await getPlanMembers(id);
    if (currentMembers.length >= MAX_MEMBERS) {
      return NextResponse.json(
        { error: `You can share with up to ${MAX_MEMBERS} people` },
        { status: 400 }
      );
    }

    // Prevent self-invite
    const result = await getUserByEmail(email);
    if (!result) {
      return NextResponse.json(
        { error: "No Planscope account found for that email" },
        { status: 404 }
      );
    }

    if (result.uid === auth.userId) {
      return NextResponse.json({ error: "You can't share with yourself" }, { status: 400 });
    }

    // Prevent duplicate
    if ((plan.sharedWithUserIds || []).includes(result.uid)) {
      return NextResponse.json({ error: "Already shared with this person" }, { status: 400 });
    }

    await addPlanMember(id, result.uid, email);
    return NextResponse.json({ success: true, member: { userId: result.uid, email, role: "editor" } });
  } catch (e) {
    console.error("Add member error:", e);
    return NextResponse.json({ error: "Failed to share plan" }, { status: 500 });
  }
}
