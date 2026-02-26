import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getUser } from "@/lib/firestore";

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

    return NextResponse.json({
      id: user.id,
      email: user.email,
      provider: user.provider,
      tier: user.tier,
    });
  } catch {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
}
