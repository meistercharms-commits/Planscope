import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { adminAuth } from "@/lib/firebase-admin";
import { getUser } from "@/lib/firestore";

export async function POST(req: NextRequest) {
  try {
    const auth = await getCurrentUser();
    if (!auth) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const { newPassword } = await req.json();

    if (!newPassword) {
      return NextResponse.json(
        { error: "New password is required" },
        { status: 400 }
      );
    }

    if (newPassword.length < 6 || newPassword.length > 72) {
      return NextResponse.json(
        { error: "Password must be between 6 and 72 characters" },
        { status: 400 }
      );
    }

    const user = await getUser(auth.userId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Only email/password users can change password
    if (user.provider !== "email") {
      return NextResponse.json(
        { error: "Password changes are not available for OAuth accounts" },
        { status: 400 }
      );
    }

    // Update password in Firebase Auth
    await adminAuth.updateUser(auth.userId, { password: newPassword });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("Change password error:", e);
    return NextResponse.json(
      { error: "Failed to change password" },
      { status: 500 }
    );
  }
}
