import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createToken, setAuthCookie, migrateAnonPlans } from "@/lib/auth";
import { prisma } from "@/lib/db";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export async function GET(req: NextRequest) {
  try {
    const code = req.nextUrl.searchParams.get("code");
    const error = req.nextUrl.searchParams.get("error");
    const state = req.nextUrl.searchParams.get("state");

    if (error || !code) {
      return NextResponse.redirect(`${APP_URL}/signup?error=google_denied`);
    }

    // Verify OAuth state to prevent CSRF
    const cookieStore = await cookies();
    const savedState = cookieStore.get("oauth_state")?.value;
    cookieStore.delete("oauth_state");
    if (!state || !savedState || state !== savedState) {
      return NextResponse.redirect(`${APP_URL}/signup?error=google_failed`);
    }

    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      return NextResponse.redirect(`${APP_URL}/signup?error=google_not_configured`);
    }

    // Exchange code for tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: `${APP_URL}/api/auth/google/callback`,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenRes.ok) {
      return NextResponse.redirect(`${APP_URL}/signup?error=google_token_failed`);
    }

    const tokens = await tokenRes.json();

    // Decode id_token to get user info
    const payload = JSON.parse(
      Buffer.from(tokens.id_token.split(".")[1], "base64").toString()
    );
    const { email, sub: googleId } = payload;

    if (!email) {
      return NextResponse.redirect(`${APP_URL}/signup?error=google_no_email`);
    }

    // Find or create user
    let user = await prisma.user.findFirst({
      where: { provider: "google", providerId: googleId },
    });

    if (!user) {
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing && existing.passwordHash) {
        // Email belongs to a password-based account — don't auto-link
        return NextResponse.redirect(`${APP_URL}/login?error=google_failed`);
      } else if (existing) {
        // Account exists but has no password (another OAuth or anon) — safe to link
        user = await prisma.user.update({
          where: { id: existing.id },
          data: { provider: "google", providerId: googleId },
        });
      } else {
        user = await prisma.user.create({
          data: { email, provider: "google", providerId: googleId },
        });
      }
    }

    const token = createToken(user.id);
    await setAuthCookie(token);
    await migrateAnonPlans(user.id);

    return NextResponse.redirect(`${APP_URL}/dashboard`);
  } catch (e) {
    console.error("Google OAuth error:", e);
    return NextResponse.redirect(`${APP_URL}/signup?error=google_failed`);
  }
}
