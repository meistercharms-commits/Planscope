/**
 * Parse a task's timeEstimate string into seconds.
 *
 * Supported formats:
 *   "15 min"       -> 900
 *   "30-60 min"    -> 1800  (uses lower bound)
 *   "1-2 hours"    -> 3600  (uses lower bound)
 *   "2 hours"      -> 7200
 *   null/undefined -> 1500  (25 min default)
 */
export function parseTimeEstimate(estimate: string | null): number {
  if (!estimate) return 25 * 60;

  const normalized = estimate.toLowerCase().trim();

  const numMatch = normalized.match(/^(\d+)/);
  if (!numMatch) return 25 * 60;

  const value = parseInt(numMatch[1], 10);

  if (normalized.includes("hour")) {
    return value * 60 * 60;
  }

  return value * 60;
}

/**
 * Format seconds into a display string.
 * Under 60 min: "MM:SS"
 * 60 min or more: "H:MM:SS"
 */
export function formatTime(totalSeconds: number): string {
  if (totalSeconds >= 3600) {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return `${hrs}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}
