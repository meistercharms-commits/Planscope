import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getUserTier, canHaveMultipleActivePlans } from "@/lib/tiers";
import DashboardMultiPlan from "./DashboardMultiPlan";

export default async function DashboardPage() {
  const auth = await getCurrentUser();
  if (!auth) redirect("/new-plan");

  const tier = await getUserTier(auth.userId);

  const now = new Date();
  const dayOfWeek = now.getDay();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - dayOfWeek);
  weekStart.setHours(0, 0, 0, 0);

  const activePlans = await prisma.plan.findMany({
    where: {
      userId: auth.userId,
      status: { in: ["active", "review"] },
      weekStart: { gte: weekStart },
    },
    include: {
      tasks: { select: { id: true, status: true, section: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  // No active plans: go to brain dump
  if (activePlans.length === 0) redirect("/new-plan");

  // Single plan: redirect as before
  if (activePlans.length === 1) {
    const plan = activePlans[0];
    if (plan.status === "review") redirect(`/plan/${plan.id}`);
    redirect(`/plan/${plan.id}/progress`);
  }

  // Multiple plans but tier doesn't allow it: redirect to most recent
  if (!canHaveMultipleActivePlans(tier)) {
    const mostRecent = activePlans[0];
    if (mostRecent.status === "review") redirect(`/plan/${mostRecent.id}`);
    redirect(`/plan/${mostRecent.id}/progress`);
  }

  // Multiple plans (Pro Plus): show plan picker
  const planSummaries = activePlans.map((plan) => {
    const active = plan.tasks.filter((t) => t.section !== "not_this_week");
    const done = active.filter((t) => t.status === "done");
    return {
      id: plan.id,
      label: plan.label || "Plan",
      mode: plan.mode,
      status: plan.status,
      totalTasks: active.length,
      completedTasks: done.length,
    };
  });

  return <DashboardMultiPlan plans={planSummaries} tier={tier} />;
}
