import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, clearSessionCookie } from "@/lib/auth";
import { adminAuth } from "@/lib/firebase-admin";
import { deleteUserAndData } from "@/lib/firestore";

export async function POST(req: NextRequest) {
  try {
    const auth = await getCurrentUser();
    if (!auth) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const { confirmation } = await req.json();

    if (confirmation !== "DELETE") {
      return NextResponse.json(
        { error: "Please type DELETE to confirm" },
        { status: 400 }
      );
    }

    // Delete all user data from Firestore (user doc + all plans + all tasks)
    await deleteUserAndData(auth.userId);

    // Delete Firebase Auth account
    await adminAuth.deleteUser(auth.userId);

    // Clear session cookie
    await clearSessionCookie();

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("Delete account error:", e);
    return NextResponse.json(
      { error: "Failed to delete account" },
      { status: 500 }
    );
  }
}
