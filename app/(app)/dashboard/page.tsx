import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getActivePlans, archiveStalePlans } from "@/lib/firestore";
import { getUserTier, canHaveMultipleActivePlans } from "@/lib/tiers";
import DashboardMultiPlan from "./DashboardMultiPlan";
import DashboardEmpty from "./DashboardEmpty";

export default async function DashboardPage() {
  // Check for existing auth via session cookie
  const loggedIn = await getCurrentUser();

  // No user found at all — show empty state
  // (Firebase anonymous auth is handled client-side via ensureAnonymous in layout)
  if (!loggedIn) return <DashboardEmpty />;

  const auth = { userId: loggedIn.userId };

  // Fire-and-forget: archive stale plans (housekeeping, don't block page load)
  archiveStalePlans(auth.userId).catch(() => {});

  // Run tier + active plans in parallel (each is ~50-150ms Firestore round-trip)
  let tier, activePlans;
  try {
    [tier, activePlans] = await Promise.all([
      getUserTier(auth.userId),
      getActivePlans(auth.userId),
    ]);
  } catch (e) {
    console.error("Dashboard: failed to load:", (e as Error).message);
    return <DashboardEmpty />;
  }

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
      colour: plan.colour ?? null,
      mode: plan.mode,
      status: plan.status,
      totalTasks: active.length,
      completedTasks: done.length,
    };
  });

  return <DashboardMultiPlan plans={planSummaries} tier={tier} />;
}
