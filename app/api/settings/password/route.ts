import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, comparePassword, hashPassword } from "@/lib/auth";
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

    const { currentPassword, newPassword } = await req.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: "Current password and new password are required" },
        { status: 400 }
      );
    }

    if (newPassword.length < 6 || newPassword.length > 72) {
      return NextResponse.json(
        { error: "Password must be between 6 and 72 characters" },
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
        { error: "Password changes are not available for OAuth accounts" },
        { status: 400 }
      );
    }

    const valid = await comparePassword(currentPassword, user.passwordHash);
    if (!valid) {
      return NextResponse.json(
        { error: "Current password is incorrect" },
        { status: 401 }
      );
    }

    const newHash = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: auth.userId },
      data: { passwordHash: newHash },
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("Change password error:", e);
    return NextResponse.json(
      { error: "Failed to change password" },
      { status: 500 }
    );
  }
}
