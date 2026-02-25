import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { createToken, setAuthCookie, migrateAnonPlans } from "@/lib/auth";
import { prisma } from "@/lib/db";

const APPLE_CLIENT_ID = process.env.APPLE_CLIENT_ID;
const APPLE_TEAM_ID = process.env.APPLE_TEAM_ID;
const APPLE_KEY_ID = process.env.APPLE_KEY_ID;
const APPLE_PRIVATE_KEY = process.env.APPLE_PRIVATE_KEY;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

function generateAppleClientSecret(): string {
  if (!APPLE_TEAM_ID || !APPLE_CLIENT_ID || !APPLE_KEY_ID || !APPLE_PRIVATE_KEY) {
    throw new Error("Apple OAuth not configured");
  }

  return jwt.sign({}, APPLE_PRIVATE_KEY.replace(/\\n/g, "\n"), {
    algorithm: "ES256",
    expiresIn: "180d",
    issuer: APPLE_TEAM_ID,
    audience: "https://appleid.apple.com",
    subject: APPLE_CLIENT_ID,
    header: { alg: "ES256", kid: APPLE_KEY_ID },
  });
}

// Apple uses form_post, so the callback comes as a POST
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const code = formData.get("code") as string | null;
    const idToken = formData.get("id_token") as string | null;
    const state = formData.get("state") as string | null;

    if (!code) {
      return NextResponse.redirect(`${APP_URL}/signup?error=apple_denied`);
    }

    // Verify OAuth state to prevent CSRF
    const cookieStore = await cookies();
    const savedState = cookieStore.get("oauth_state")?.value;
    cookieStore.delete("oauth_state");
    if (!state || !savedState || state !== savedState) {
      return NextResponse.redirect(`${APP_URL}/signup?error=apple_failed`);
    }

    if (!APPLE_CLIENT_ID || !APPLE_TEAM_ID || !APPLE_KEY_ID || !APPLE_PRIVATE_KEY) {
      return NextResponse.redirect(`${APP_URL}/signup?error=apple_not_configured`);
    }

    const clientSecret = generateAppleClientSecret();

    // Exchange code for tokens
    const tokenRes = await fetch("https://appleid.apple.com/auth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: APPLE_CLIENT_ID,
        client_secret: clientSecret,
        code,
        grant_type: "authorization_code",
        redirect_uri: `${APP_URL}/api/auth/apple/callback`,
      }),
    });

    let payload: { email?: string; sub: string };

    if (tokenRes.ok) {
      const tokens = await tokenRes.json();
      payload = JSON.parse(
        Buffer.from(tokens.id_token.split(".")[1], "base64").toString()
      );
    } else if (idToken) {
      // Fallback: decode the id_token from the form post
      payload = JSON.parse(
        Buffer.from(idToken.split(".")[1], "base64").toString()
      );
    } else {
      return NextResponse.redirect(`${APP_URL}/signup?error=apple_token_failed`);
    }

    const { email, sub: appleId } = payload;

    if (!email && !appleId) {
      return NextResponse.redirect(`${APP_URL}/signup?error=apple_no_email`);
    }

    // Find or create user
    let user = await prisma.user.findFirst({
      where: { provider: "apple", providerId: appleId },
    });

    if (!user && email) {
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing && existing.passwordHash) {
        // Email belongs to a password-based account — don't auto-link
        return NextResponse.redirect(`${APP_URL}/login?error=apple_failed`);
      } else if (existing) {
        // Account exists but has no password (another OAuth or anon) — safe to link
        user = await prisma.user.update({
          where: { id: existing.id },
          data: { provider: "apple", providerId: appleId },
        });
      } else {
        user = await prisma.user.create({
          data: { email, provider: "apple", providerId: appleId },
        });
      }
    }

    if (!user) {
      return NextResponse.redirect(`${APP_URL}/signup?error=apple_no_email`);
    }

    const token = createToken(user.id);
    await setAuthCookie(token);
    await migrateAnonPlans(user.id);

    return NextResponse.redirect(`${APP_URL}/dashboard`);
  } catch (e) {
    console.error("Apple OAuth error:", e);
    return NextResponse.redirect(`${APP_URL}/signup?error=apple_failed`);
  }
}
