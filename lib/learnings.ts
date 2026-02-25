import { prisma } from "@/lib/db";
import type { LearningsSummary, PlanLearning } from "@/types";

/**
 * Extract per-plan learning metrics from completed/active plans.
 * Analyses the last 1-4 plans for the user.
 */
export async function extractPlanLearnings(
  userId: string
): Promise<PlanLearning[]> {
  const plans = await prisma.plan.findMany({
    where: {
      userId,
      status: { in: ["active", "completed"] },
    },
    orderBy: { createdAt: "desc" },
    take: 4,
    include: {
      tasks: true,
    },
  });

  return plans.map((plan) => {
    const activeTasks = plan.tasks.filter(
      (t) => t.section === "do_first" || t.section === "this_week"
    );
    const completed = activeTasks.filter((t) => t.status === "done");
    const totalPlanned = activeTasks.length;
    const completionRate =
      totalPlanned > 0
        ? Math.round((completed.length / totalPlanned) * 100)
        : 0;

    // Category performance
    const categoryPerformance: Record<
      string,
      { attempted: number; completed: number; rate: number }
    > = {};
    for (const task of activeTasks) {
      const cat = task.category || "other";
      if (!categoryPerformance[cat]) {
        categoryPerformance[cat] = { attempted: 0, completed: 0, rate: 0 };
      }
      categoryPerformance[cat].attempted++;
      if (task.status === "done") {
        categoryPerformance[cat].completed++;
      }
    }
    for (const cat of Object.keys(categoryPerformance)) {
      const p = categoryPerformance[cat];
      p.rate = p.attempted > 0 ? Math.round((p.completed / p.attempted) * 100) : 0;
    }

    // Do-first completion
    const doFirstTasks = plan.tasks.filter((t) => t.section === "do_first");
    const doFirstDone = doFirstTasks.filter((t) => t.status === "done");
    const doFirstCompletion =
      doFirstTasks.length > 0
        ? Math.round((doFirstDone.length / doFirstTasks.length) * 100)
        : 0;

    // Quick-win completion (small effort tasks)
    const quickWins = activeTasks.filter((t) => t.effort === "small");
    const quickWinsDone = quickWins.filter((t) => t.status === "done");
    const quickWinCompletion =
      quickWins.length > 0
        ? Math.round((quickWinsDone.length / quickWins.length) * 100)
        : 0;

    return {
      planId: plan.id,
      weekStart: plan.weekStart.toISOString(),
      metrics: {
        totalTasksPlanned: totalPlanned,
        tasksCompleted: completed.length,
        completionRate,
      },
      categoryPerformance,
      doFirstCompletion,
      quickWinCompletion,
    };
  });
}

/**
 * Generate a high-level summary from plan learnings
 * for the LLM and UI display.
 */
export async function generateLearningSummary(
  userId: string
): Promise<LearningsSummary | null> {
  const learnings = await extractPlanLearnings(userId);

  // Need at least 2 plans for meaningful patterns
  if (learnings.length < 2) {
    return null;
  }

  const weeksSampled = learnings.length;

  // Overall completion rate (average across plans)
  const overallCompletionRate = Math.round(
    learnings.reduce((sum, l) => sum + l.metrics.completionRate, 0) /
      weeksSampled
  );

  // Aggregate category performance across all plans
  const categoryTotals: Record<
    string,
    { attempted: number; completed: number }
  > = {};
  for (const learning of learnings) {
    for (const [cat, perf] of Object.entries(learning.categoryPerformance)) {
      if (!categoryTotals[cat]) {
        categoryTotals[cat] = { attempted: 0, completed: 0 };
      }
      categoryTotals[cat].attempted += perf.attempted;
      categoryTotals[cat].completed += perf.completed;
    }
  }

  const strongCategories: string[] = [];
  const weakCategories: string[] = [];
  for (const [cat, totals] of Object.entries(categoryTotals)) {
    if (totals.attempted < 2) continue; // Skip categories with too few data points
    const rate = Math.round((totals.completed / totals.attempted) * 100);
    if (rate >= 70) strongCategories.push(cat);
    if (rate <= 40) weakCategories.push(cat);
  }

  // Do-first success rate
  const doFirstSuccess = Math.round(
    learnings.reduce((sum, l) => sum + l.doFirstCompletion, 0) / weeksSampled
  );

  // Overcommitment detection: consistently planning more than completing
  const avgPlanned =
    learnings.reduce((sum, l) => sum + l.metrics.totalTasksPlanned, 0) /
    weeksSampled;
  const avgCompleted =
    learnings.reduce((sum, l) => sum + l.metrics.tasksCompleted, 0) /
    weeksSampled;
  const overcommitmentWarning =
    avgPlanned >= 5 && avgCompleted / avgPlanned < 0.6;

  // Recurring issues: find task titles that appear in 2+ plans with low completion
  const taskAppearances: Record<
    string,
    { count: number; completed: number }
  > = {};
  for (const learning of learnings) {
    // Re-fetch plan tasks for title analysis
    const plan = await prisma.plan.findUnique({
      where: { id: learning.planId },
      include: { tasks: true },
    });
    if (!plan) continue;

    const activeTasks = plan.tasks.filter(
      (t) => t.section === "do_first" || t.section === "this_week"
    );
    for (const task of activeTasks) {
      const key = task.title.toLowerCase().trim();
      if (!taskAppearances[key]) {
        taskAppearances[key] = { count: 0, completed: 0 };
      }
      taskAppearances[key].count++;
      if (task.status === "done") {
        taskAppearances[key].completed++;
      }
    }
  }

  const recurringIssues = Object.entries(taskAppearances)
    .filter(
      ([, data]) =>
        data.count >= 2 && data.completed / data.count < 0.5
    )
    .map(([title, data]) => ({
      title: title.charAt(0).toUpperCase() + title.slice(1),
      count: data.count,
    }))
    .slice(0, 5);

  // Generate top recommendation
  let topRecommendation = "";
  if (overcommitmentWarning) {
    topRecommendation = `You tend to plan ${Math.round(avgPlanned)} tasks but complete about ${Math.round(avgCompleted)}. Try planning fewer tasks to build momentum.`;
  } else if (doFirstSuccess >= 80) {
    topRecommendation =
      "You're great at tackling your top priorities. Keep leading with do-first tasks.";
  } else if (weakCategories.length > 0) {
    topRecommendation = `Your ${weakCategories.join(" and ")} tasks tend to slip. Consider starting smaller in those areas.`;
  } else if (overallCompletionRate >= 75) {
    topRecommendation =
      "Strong completion rate. You're finding a good rhythm with your planning.";
  } else {
    topRecommendation =
      "Building planning habits takes time. Each week gets a little clearer.";
  }

  return {
    weeksSampled,
    overallCompletionRate,
    strongCategories,
    weakCategories,
    doFirstSuccess,
    recurringIssues,
    overcommitmentWarning,
    topRecommendation,
  };
}
