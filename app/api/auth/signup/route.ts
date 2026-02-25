import { NextRequest, NextResponse } from "next/server";
import { hashPassword, createToken, setAuthCookie, migrateAnonPlans } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") || "unknown";
    if (!rateLimit(`signup:${ip}`, { maxRequests: 5, windowMs: 60 * 60 * 1000 })) {
      return NextResponse.json(
        { error: "Too many signup attempts. Please try again later." },
        { status: 429 }
      );
    }
    const { email, password } = await req.json();

    if (!email || !password || typeof email !== "string" || typeof password !== "string") {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const trimmedEmail = email.trim().toLowerCase();
    if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(trimmedEmail) || trimmedEmail.length > 254 || trimmedEmail.endsWith("@planscope.local")) {
      return NextResponse.json(
        { error: "Please enter a valid email address" },
        { status: 400 }
      );
    }

    if (password.length < 6 || password.length > 72) {
      return NextResponse.json(
        { error: "Password must be between 6 and 72 characters" },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({ where: { email: trimmedEmail } });
    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: { email: trimmedEmail, passwordHash },
    });

    const token = createToken(user.id);
    await setAuthCookie(token);
    await migrateAnonPlans(user.id);

    return NextResponse.json(
      { userId: user.id, email: user.email },
      { status: 201 }
    );
  } catch (e: unknown) {
    if (e && typeof e === "object" && "code" in e && (e as { code: string }).code === "P2002") {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }
    console.error("Signup error:", e);
    return NextResponse.json({ error: "Signup failed" }, { status: 500 });
  }
}
