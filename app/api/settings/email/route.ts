import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, comparePassword } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const auth = await getCurrentUser();
    if (!auth) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const { email, currentPassword } = await req.json();

    if (!email || !currentPassword) {
      return NextResponse.json(
        { error: "New email and current password are required" },
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

    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (!user.passwordHash) {
      return NextResponse.json(
        { error: "Email changes are not available for OAuth accounts" },
        { status: 400 }
      );
    }

    const valid = await comparePassword(currentPassword, user.passwordHash);
    if (!valid) {
      return NextResponse.json(
        { error: "Password is incorrect" },
        { status: 401 }
      );
    }

    const existing = await prisma.user.findUnique({ where: { email: trimmedEmail } });
    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    await prisma.user.update({
      where: { id: auth.userId },
      data: { email: trimmedEmail },
    });

    return NextResponse.json({ success: true, email: trimmedEmail });
  } catch (e) {
    console.error("Change email error:", e);
    return NextResponse.json(
      { error: "Failed to change email" },
      { status: 500 }
    );
  }
}
