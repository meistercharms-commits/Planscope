import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getUser } from "@/lib/firestore";
import { getUserTier } from "@/lib/tiers";

export async function GET() {
  try {
    const auth = await getCurrentUser();
    if (!auth) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const user = await getUser(auth.userId);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Use getUserTier() for consistency — checks Stripe subscription status
    const tier = await getUserTier(auth.userId);

    return NextResponse.json({
      id: user.id,
      email: user.email,
      provider: user.provider,
      tier,
    });
  } catch {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
}
