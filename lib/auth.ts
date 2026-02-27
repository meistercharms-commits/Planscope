import { cookies } from "next/headers";
import { adminAuth } from "@/lib/firebase-admin";

const SESSION_COOKIE = "__session";
const SESSION_EXPIRY = 5 * 24 * 60 * 60 * 1000; // 5 days in ms

// ─── Session Cookie Management ───

/**
 * Create a secure session cookie from a Firebase ID token.
 * Uses Firebase Admin's createSessionCookie (server-verified, supports revocation).
 */
export async function createSessionCookie(idToken: string): Promise<void> {
  const sessionCookie = await adminAuth.createSessionCookie(idToken, {
    expiresIn: SESSION_EXPIRY,
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, sessionCookie, {
    httpOnly: true,
    secure: true,
    path: "/",
    maxAge: SESSION_EXPIRY / 1000,
    sameSite: "lax",
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

// ─── Auth Checks (used by API routes) ───

/**
 * Verify session cookie and return the user's Firebase UID.
 * Uses checkRevoked=true for maximum security.
 */
export async function getCurrentUser(): Promise<{ userId: string } | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE)?.value;
    if (!sessionCookie) return null;

    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
    return { userId: decoded.uid };
  } catch {
    return null;
  }
}

/**
 * Returns the authenticated user. Checks if they're anonymous.
 * In Firebase Auth, anonymous users have no email and no providers.
 */
export async function getAuthOrAnon(): Promise<{
  userId: string;
  isAnon: boolean;
}> {
  const auth = await getCurrentUser();
  if (!auth) {
    throw new Error("No authentication token provided");
  }

  try {
    const userRecord = await adminAuth.getUser(auth.userId);
    const isAnon =
      userRecord.providerData.length === 0 && !userRecord.email;
    return { userId: auth.userId, isAnon };
  } catch (err) {
    // Only treat "user not found" as anonymous — re-throw real errors
    const code = (err as { code?: string }).code;
    if (code === "auth/user-not-found") {
      return { userId: auth.userId, isAnon: true };
    }
    throw err;
  }
}
