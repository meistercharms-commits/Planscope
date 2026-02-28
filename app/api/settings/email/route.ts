import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { adminAuth } from "@/lib/firebase-admin";
import { getUser, getUserByEmail, updateUser } from "@/lib/firestore";
import { isValidEmail } from "@/lib/validation";

export async function POST(req: NextRequest) {
  try {
    const auth = await getCurrentUser();
    if (!auth) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    // Rate limit: 5 attempts per hour per user
    const allowed = rateLimit(`email:${auth.userId}`, { maxRequests: 5, windowMs: 3600000 });
    if (!allowed) {
      return NextResponse.json(
        { error: "Too many email change attempts. Please try again later." },
        { status: 429 }
      );
    }

    const { email } = await req.json();

    if (!email) {
      return NextResponse.json(
        { error: "New email is required" },
        { status: 400 }
      );
    }

    const trimmedEmail = email.trim().toLowerCase();
    if (!isValidEmail(trimmedEmail)) {
      return NextResponse.json(
        { error: "Please enter a valid email address" },
        { status: 400 }
      );
    }

    const user = await getUser(auth.userId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Only email/password users can change email
    if (user.provider !== "email") {
      return NextResponse.json(
        { error: "Email changes are not available for OAuth accounts" },
        { status: 400 }
      );
    }

    // Check if email already in use (generic error to prevent enumeration)
    const existing = await getUserByEmail(trimmedEmail);
    if (existing) {
      return NextResponse.json(
        { error: "This email cannot be used. Please try a different one." },
        { status: 400 }
      );
    }

    // Update email in Firebase Auth and Firestore
    await adminAuth.updateUser(auth.userId, { email: trimmedEmail });
    await updateUser(auth.userId, { email: trimmedEmail });

    return NextResponse.json({ success: true, email: trimmedEmail });
  } catch (e) {
    console.error("Change email error:", e);
    return NextResponse.json(
      { error: "Failed to change email" },
      { status: 500 }
    );
  }
}
