import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase-admin";
import { createSessionCookie, clearSessionCookie } from "@/lib/auth";
import { createUser, getUser } from "@/lib/firestore";
import { DEFAULT_NOTIFICATION_PREFS } from "@/types";

/**
 * POST /api/auth/session
 * Receives a Firebase ID token, verifies it, creates a secure session cookie,
 * and ensures the user document exists in Firestore.
 */
export async function POST(req: NextRequest) {
  try {
    const { idToken } = await req.json();

    if (!idToken || typeof idToken !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid idToken" },
        { status: 400 }
      );
    }

    // Verify the ID token is valid and recent (within 15 minutes)
    const decoded = await adminAuth.verifyIdToken(idToken, true);

    // Only create session cookies for recently signed-in users
    const signInAge = Date.now() / 1000 - decoded.auth_time;
    if (signInAge > 15 * 60) {
      return NextResponse.json(
        { error: "Token is too old. Please sign in again." },
        { status: 401 }
      );
    }

    // Create the secure session cookie
    await createSessionCookie(idToken);

    // Ensure user document exists in Firestore (first sign-in)
    const existingUser = await getUser(decoded.uid);
    if (!existingUser) {
      const provider = decoded.firebase?.sign_in_provider || "anonymous";
      await createUser(decoded.uid, {
        email: decoded.email || "",
        provider:
          provider === "password"
            ? "email"
            : provider === "google.com"
              ? "google"
              : provider === "apple.com"
                ? "apple"
                : provider === "anonymous"
                  ? "anonymous"
                  : provider,
        tier: "free",
        learnEnabled: true,
        notificationPrefs: { ...DEFAULT_NOTIFICATION_PREFS },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const err = error as Error;
    console.error("[Session] Error creating session:", err.message);
    return NextResponse.json(
      { error: "Failed to create session" },
      { status: 401 }
    );
  }
}

/**
 * DELETE /api/auth/session
 * Clears the session cookie (logout).
 */
export async function DELETE() {
  try {
    await clearSessionCookie();
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: true });
  }
}
