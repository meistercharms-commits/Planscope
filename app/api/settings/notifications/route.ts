import { NextRequest, NextResponse } from "next/server";
import { getAuthOrAnon } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { DEFAULT_NOTIFICATION_PREFS, NotificationPrefs } from "@/types";

function parsePrefs(raw: string | null): NotificationPrefs {
  if (!raw) return { ...DEFAULT_NOTIFICATION_PREFS };
  try {
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_NOTIFICATION_PREFS, ...parsed };
  } catch {
    return { ...DEFAULT_NOTIFICATION_PREFS };
  }
}

export async function GET() {
  try {
    const auth = await getAuthOrAnon();
    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { notificationPrefs: true },
    });

    return NextResponse.json(parsePrefs(user?.notificationPrefs ?? null));
  } catch {
    return NextResponse.json(DEFAULT_NOTIFICATION_PREFS);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await getAuthOrAnon();
    const body = await req.json();

    // Get existing prefs
    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { notificationPrefs: true },
    });

    const current = parsePrefs(user?.notificationPrefs ?? null);

    // Merge incoming changes with current prefs
    const updated: NotificationPrefs = { ...current };

    if (typeof body.planReady === "boolean") updated.planReady = body.planReady;
    if (typeof body.dailyCheckin === "boolean") updated.dailyCheckin = body.dailyCheckin;
    if (typeof body.dailyCheckinTime === "string") updated.dailyCheckinTime = body.dailyCheckinTime;
    if (typeof body.celebrations === "boolean") updated.celebrations = body.celebrations;
    if (body.celebrationMode === "milestones" || body.celebrationMode === "every") {
      updated.celebrationMode = body.celebrationMode;
    }
    if (typeof body.focusTimer === "boolean") updated.focusTimer = body.focusTimer;
    if (typeof body.nudges === "boolean") updated.nudges = body.nudges;
    if (typeof body.promotional === "boolean") updated.promotional = body.promotional;

    await prisma.user.update({
      where: { id: auth.userId },
      data: { notificationPrefs: JSON.stringify(updated) },
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json(
      { error: "Could not update notification preferences" },
      { status: 500 }
    );
  }
}
