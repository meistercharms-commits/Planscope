"use client";

import { NotificationPrefs, DEFAULT_NOTIFICATION_PREFS } from "@/types";

// ─── ID ranges for cancel/replace ───
const ID_PLAN_READY = 1000;
const ID_DAILY_CHECKIN = 2000;
const ID_NUDGE_3D = 3000;
const ID_NUDGE_5D = 3500;
// const ID_CELEBRATION = 4000;  // immediate, no cancel needed
const ID_UPGRADE = 5000;
const ID_FOCUS_TIMER = 6000;

// Simple hash for stable IDs from string (planId / taskId)
function hashId(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % 900; // 0–899
}

// ─── Platform detection ───
async function isNative(): Promise<boolean> {
  try {
    const { Capacitor } = await import("@capacitor/core");
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

async function getLocalNotifications() {
  try {
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    return LocalNotifications;
  } catch {
    return null;
  }
}

// ─── Permission handling ───
export async function checkPermission(): Promise<"granted" | "denied" | "prompt"> {
  if (!(await isNative())) return "granted"; // web always "granted" (no-op)
  try {
    const LN = await getLocalNotifications();
    if (!LN) return "granted"; // plugin not available, skip gracefully
    const result = await LN.checkPermissions();
    if (result.display === "granted") return "granted";
    if (result.display === "denied") return "denied";
    return "prompt";
  } catch {
    return "granted"; // if plugin errors, don't block the user — just save prefs
  }
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!(await isNative())) return true; // web: silently succeed
  try {
    const LN = await getLocalNotifications();
    if (!LN) return true; // plugin not available, succeed silently
    const result = await LN.requestPermissions();
    return result.display === "granted";
  } catch {
    return true; // don't block the user if plugin errors
  }
}

// ─── Notification prefs helper ───
export async function fetchNotificationPrefs(): Promise<NotificationPrefs> {
  try {
    const res = await fetch("/api/settings/notifications");
    if (res.ok) return await res.json();
  } catch {
    // fall through
  }
  return { ...DEFAULT_NOTIFICATION_PREFS };
}

// ─── Schedule helpers ───
async function scheduleNotification(options: {
  id: number;
  title: string;
  body: string;
  at: Date;
  sound?: string;
  actionTypeId?: string;
}) {
  if (!(await isNative())) return;
  try {
    const LN = await getLocalNotifications();
    if (!LN) return;
    await LN.schedule({
      notifications: [
        {
          id: options.id,
          title: options.title,
          body: options.body,
          schedule: { at: options.at },
          sound: options.sound || undefined,
          actionTypeId: options.actionTypeId,
        },
      ],
    });
  } catch (e) {
    console.warn("[Notifications] Schedule failed:", e);
  }
}

async function cancelNotification(id: number) {
  if (!(await isNative())) return;
  try {
    const LN = await getLocalNotifications();
    if (!LN) return;
    await LN.cancel({ notifications: [{ id }] });
  } catch {
    // ignore
  }
}

// ─── 1. Plan Ready ───
export async function schedulePlanReady(planId: string, taskCount: number) {
  const prefs = await fetchNotificationPrefs();
  if (!prefs.planReady) return;

  const id = ID_PLAN_READY + hashId(planId);
  const at = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes from now

  await scheduleNotification({
    id,
    title: "Your plan arrived",
    body: `${taskCount} tasks, ready when you are. No rush.`,
    at,
    sound: "gentle_chime.wav",
  });
}

// ─── 2. Progress Celebrations ───
export async function triggerCelebration(
  doneCount: number,
  totalCount: number
) {
  const prefs = await fetchNotificationPrefs();
  if (!prefs.celebrations) return;

  const percent = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  // Determine if this is a milestone
  const isFirst = doneCount === 1;
  const isHalf = percent === 50 || (percent > 45 && percent < 55 && doneCount === Math.ceil(totalCount / 2));
  const isComplete = doneCount === totalCount;

  if (prefs.celebrationMode === "milestones" && !isFirst && !isHalf && !isComplete) {
    return; // Only fire at milestones
  }

  let title: string;
  let body: string;

  if (isComplete) {
    title = `WEEK DONE. ${doneCount}/${totalCount} \u2713\u2713\u2713`;
    body = "You finished your plan. That's huge. Really.";
  } else if (isHalf) {
    title = `You're halfway! ${doneCount}/${totalCount} \ud83d\udd25`;
    body = "You're actually doing this.";
  } else if (isFirst) {
    title = `You started! 1/${totalCount} \u2713`;
    body = "Momentum building. Keep going?";
  } else {
    title = `${doneCount}/${totalCount} done \u2713`;
    body = "Keep it up. You're making progress.";
  }

  // Immediate notification (schedule 2 seconds from now)
  const notifId = 4000 + doneCount;
  await scheduleNotification({
    id: notifId,
    title,
    body,
    at: new Date(Date.now() + 2000),
  });
}

// ─── 3. Focus Timer ───
export async function scheduleFocusTimer(taskId: string, durationSeconds: number) {
  const prefs = await fetchNotificationPrefs();
  if (!prefs.focusTimer) return;

  const id = ID_FOCUS_TIMER + hashId(taskId);
  const at = new Date(Date.now() + durationSeconds * 1000);

  await scheduleNotification({
    id,
    title: "Time's up \u2713",
    body: "Your focus session is done. Nice work.",
    at,
    sound: "gentle_chime.wav",
  });
}

export async function cancelFocusTimer(taskId: string) {
  const id = ID_FOCUS_TIMER + hashId(taskId);
  await cancelNotification(id);
}

// ─── 4. Daily Check-in ───
export async function scheduleDailyCheckin(time: string) {
  if (!(await isNative())) return;

  try {
    const LN = await getLocalNotifications();
    if (!LN) return;

    // Cancel existing daily check-in first
    await LN.cancel({ notifications: [{ id: ID_DAILY_CHECKIN }] });

    // Parse time string "HH:MM"
    const [hours, minutes] = time.split(":").map(Number);
    const now = new Date();
    const scheduledDate = new Date();
    scheduledDate.setHours(hours, minutes, 0, 0);

    // If the time has already passed today, schedule for tomorrow
    if (scheduledDate <= now) {
      scheduledDate.setDate(scheduledDate.getDate() + 1);
    }

    await LN.schedule({
      notifications: [
        {
          id: ID_DAILY_CHECKIN,
          title: "Today's priorities",
          body: "Quick look at what matters today.",
          schedule: {
            at: scheduledDate,
            every: "day" as const,
          },
        },
      ],
    });
  } catch (e) {
    console.warn("[Notifications] Daily check-in schedule failed:", e);
  }
}

export async function cancelDailyCheckin() {
  await cancelNotification(ID_DAILY_CHECKIN);
}

// ─── 5. Gentle Nudges ───
export async function scheduleNudges(planId: string) {
  const prefs = await fetchNotificationPrefs();
  if (!prefs.nudges) return;

  const id3 = ID_NUDGE_3D + hashId(planId);
  const id5 = ID_NUDGE_5D + hashId(planId);

  // Cancel any existing nudges for this plan
  await cancelNotification(id3);
  await cancelNotification(id5);

  const day3 = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
  const day5 = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);

  await scheduleNotification({
    id: id3,
    title: "Your plan's still waiting",
    body: "No judgment. When you're ready, it's here.",
    at: day3,
  });

  await scheduleNotification({
    id: id5,
    title: "This week's almost over",
    body: "What would it feel like to finish?",
    at: day5,
  });
}

export async function cancelNudges(planId: string) {
  const id3 = ID_NUDGE_3D + hashId(planId);
  const id5 = ID_NUDGE_5D + hashId(planId);
  await cancelNotification(id3);
  await cancelNotification(id5);
}

// ─── 6. Subscription/Upgrade ───
export async function triggerUpgradeNotice(plansUsed: number, planLimit: number) {
  const prefs = await fetchNotificationPrefs();
  if (!prefs.promotional) return;

  await scheduleNotification({
    id: ID_UPGRADE,
    title: `You've used your ${plansUsed} plans this month`,
    body: `Ready for more? Pro gets you ${planLimit === 4 ? 8 : "unlimited"} plans.`,
    at: new Date(Date.now() + 5000),
  });
}
