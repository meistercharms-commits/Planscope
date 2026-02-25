import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, clearAuthCookie } from "@/lib/auth";
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

    const { confirmation } = await req.json();

    if (confirmation !== "DELETE") {
      return NextResponse.json(
        { error: "Please type DELETE to confirm" },
        { status: 400 }
      );
    }

    await prisma.user.delete({
      where: { id: auth.userId },
    });

    await clearAuthCookie();

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("Delete account error:", e);
    return NextResponse.json(
      { error: "Failed to delete account" },
      { status: 500 }
    );
  }
}
