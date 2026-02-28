/**
 * Determine which week a new plan should target.
 *
 * Sunday–Saturday week, UTC-based.
 * If today is Saturday (1 day left), the plan targets *next* week instead
 * because a "weekly" plan with only one day isn't useful.
 */
export function getTargetWeek(): {
  weekStart: Date;
  weekEnd: Date;
  isNextWeek: boolean;
} {
  const now = new Date();
  const dayOfWeek = now.getUTCDay(); // 0 = Sun, 6 = Sat

  const weekStart = new Date(now);
  let isNextWeek = false;

  if (dayOfWeek === 6) {
    // Saturday → plan for next week (starts next Sunday)
    weekStart.setUTCDate(now.getUTCDate() + 1);
    isNextWeek = true;
  } else {
    // Sunday–Friday → plan for this week
    weekStart.setUTCDate(now.getUTCDate() - dayOfWeek);
  }
  weekStart.setUTCHours(0, 0, 0, 0);

  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekStart.getUTCDate() + 6);

  return { weekStart, weekEnd, isNextWeek };
}

/**
 * Format week dates as "3 – 9 Mar" or "28 Feb – 6 Mar" (cross-month).
 */
export function formatWeekLabel(weekStart: Date, weekEnd: Date): string {
  const startDay = weekStart.getUTCDate();
  const endDay = weekEnd.getUTCDate();
  const startMonth = weekStart.toLocaleDateString("en-GB", {
    month: "short",
    timeZone: "UTC",
  });
  const endMonth = weekEnd.toLocaleDateString("en-GB", {
    month: "short",
    timeZone: "UTC",
  });

  if (startMonth === endMonth) {
    return `${startDay} – ${endDay} ${startMonth}`;
  }
  return `${startDay} ${startMonth} – ${endDay} ${endMonth}`;
}
