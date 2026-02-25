import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const APPLE_CLIENT_ID = process.env.APPLE_CLIENT_ID;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export async function GET() {
  if (!APPLE_CLIENT_ID) {
    return NextResponse.redirect(`${APP_URL}/signup?error=apple_not_configured`);
  }

  const state = crypto.randomUUID();
  const cookieStore = await cookies();
  cookieStore.set("oauth_state", state, {
    httpOnly: true,
    path: "/",
    maxAge: 600,
    sameSite: "lax",
  });

  const params = new URLSearchParams({
    client_id: APPLE_CLIENT_ID,
    redirect_uri: `${APP_URL}/api/auth/apple/callback`,
    response_type: "code id_token",
    scope: "name email",
    response_mode: "form_post",
    state,
  });

  return NextResponse.redirect(
    `https://appleid.apple.com/auth/authorize?${params}`
  );
}
