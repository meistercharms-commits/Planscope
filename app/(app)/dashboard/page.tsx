import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { getUserTier, canHaveMultipleActivePlans } from "@/lib/tiers";
import DashboardMultiPlan from "./DashboardMultiPlan";
import DashboardEmpty from "./DashboardEmpty";

export default async function DashboardPage() {
  // Check for existing auth — don't create anon user here (can't set cookies in Server Components)
  const loggedIn = await getCurrentUser();
  let userId: string | null = null;

  if (loggedIn) {
    userId = loggedIn.userId;
  } else {
    // Check for existing anon cookie without creating one
    const cookieStore = await cookies();
    const anonId = cookieStore.get("planscope_anon")?.value;
    if (anonId) {
      const anonUser = await prisma.user.findFirst({
        where: { email: `anon-${anonId}@planscope.local` },
      });
      if (anonUser) userId = anonUser.id;
    }
  }

  // No user found at all — show empty state
  if (!userId) return <DashboardEmpty />;

  const auth = { userId };

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

  // No active plans: show empty state with CTA
  if (activePlans.length === 0) return <DashboardEmpty />;

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
