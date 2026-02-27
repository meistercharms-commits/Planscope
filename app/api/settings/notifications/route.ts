import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getUser, updateUser } from "@/lib/firestore";
import { DEFAULT_NOTIFICATION_PREFS, NotificationPrefs } from "@/types";

function mergePrefs(raw: Record<string, unknown> | null | undefined): NotificationPrefs {
  if (!raw) return { ...DEFAULT_NOTIFICATION_PREFS };
  return { ...DEFAULT_NOTIFICATION_PREFS, ...raw } as NotificationPrefs;
}

export async function GET() {
  try {
    const auth = await getCurrentUser();
    if (!auth) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    const user = await getUser(auth.userId);

    // Firestore stores notificationPrefs as a native map — no JSON.parse needed
    return NextResponse.json(mergePrefs(user?.notificationPrefs as unknown as Record<string, unknown> | null));
  } catch {
    return NextResponse.json(DEFAULT_NOTIFICATION_PREFS);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await getCurrentUser();
    if (!auth) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    const body = await req.json();

    // Get existing prefs
    const user = await getUser(auth.userId);
    const current = mergePrefs(user?.notificationPrefs as unknown as Record<string, unknown> | null);

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

    // Firestore stores as native map — no JSON.stringify needed
    await updateUser(auth.userId, { notificationPrefs: updated });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json(
      { error: "Could not update notification preferences" },
      { status: 500 }
    );
  }
}
