import { NextRequest, NextResponse } from "next/server";
import { comparePassword, createToken, setAuthCookie, migrateAnonPlans } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") || "unknown";
    if (!rateLimit(`login:${ip}`, { maxRequests: 10, windowMs: 15 * 60 * 1000 })) {
      return NextResponse.json(
        { error: "Too many login attempts. Please try again in 15 minutes." },
        { status: 429 }
      );
    }
    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }
    const { email, password } = body;

    if (!email || !password || typeof email !== "string" || typeof password !== "string") {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
    if (!user) {
      // Constant-time: run a dummy bcrypt compare to prevent timing oracle
      await comparePassword(password, "$2b$10$LqjrY/On5iQR/Gby8bt7fuyP2Amn5WsclBh96XboLhzlfeH7Pyozm");
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    if (!user.passwordHash) {
      const provider = user.provider === "google" ? "Google" : user.provider === "apple" ? "Apple" : "your OAuth provider";
      return NextResponse.json(
        { error: `This account uses ${provider}. Please sign in with ${provider} instead.` },
        { status: 400 }
      );
    }

    const valid = await comparePassword(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    const token = createToken(user.id);
    await setAuthCookie(token);
    await migrateAnonPlans(user.id);

    return NextResponse.json({ userId: user.id, email: user.email });
  } catch (e) {
    console.error("Login error:", e);
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
