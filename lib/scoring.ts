import { ParsedTask, UserConstraints, ScoredTask, GeneratedPlan } from "@/types";

export function scoreTask(task: ParsedTask, constraints: UserConstraints): number {
  let score = 0;

  // Impact / Urgency (35%)
  if (task.urgency === "high") score += 35;
  else if (task.urgency === "medium") score += 20;
  else score += 5;

  // Deadline proximity (30%)
  if (task.deadline) {
    const daysUntil = Math.floor(
      (new Date(task.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    if (daysUntil <= 1) score += 30;
    else if (daysUntil <= 3) score += 25;
    else if (daysUntil <= 7) score += 15;
    else score += 5;
  }

  // Effort fit (20%) - small tasks score higher for realistic plans
  if (task.effort === "small") score += 20;
  else if (task.effort === "medium") score += 15;
  else score += 8;

  // Energy fit (15%)
  if (
    (constraints.energy_level === "fired_up" && task.effort === "large") ||
    (constraints.energy_level === "drained" && task.effort === "small")
  ) {
    score += 15;
  } else if (constraints.energy_level === "ok") {
    score += 10;
  } else {
    score += 5;
  }

  // Focus area boost
  if (task.category === constraints.focus_area) {
    score += 5;
  }

  return score;
}

function estimateMinutes(effort: string): number {
  switch (effort) {
    case "small": return 25;
    case "medium": return 75;
    case "large": return 150;
    default: return 60;
  }
}

export function selectPlan(
  tasks: ParsedTask[],
  constraints: UserConstraints,
  mode: string = "week"
): GeneratedPlan {
  // Score all tasks
  const scored: ScoredTask[] = tasks.map((task, idx) => ({
    ...task,
    score: scoreTask(task, constraints),
    idx,
  }));

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  // Capacity model (in minutes)
  const maxMinutes =
    mode === "today"
      ? { low: 90, medium: 180, high: 300 }[constraints.time_available]
      : { low: 600, medium: 900, high: 1500 }[constraints.time_available];

  const maxTasks = mode === "today" ? 3 : 7;

  // Select tasks that fit within budget
  const selected: ScoredTask[] = [];
  let totalMinutes = 0;

  for (const task of scored) {
    const mins = estimateMinutes(task.effort);
    if (totalMinutes + mins <= maxMinutes && selected.length < maxTasks) {
      selected.push(task);
      totalMinutes += mins;
    }
  }

  // Partition: "Do first" = top 2-3 by urgency/score
  const doFirstCount = mode === "today" ? 1 : Math.min(3, Math.ceil(selected.length * 0.35));
  const doFirst = selected.slice(0, doFirstCount);
  const thisWeek = selected;
  const notThisWeek = scored.filter(
    (t) => !selected.find((s) => s.idx === t.idx)
  );

  return { doFirst, thisWeek, notThisWeek };
}
