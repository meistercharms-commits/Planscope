import Link from "next/link";
import { Plus } from "lucide-react";

interface PlanSummary {
  id: string;
  label: string;
  mode: string;
  status: string;
  totalTasks: number;
  completedTasks: number;
}

export default function DashboardMultiPlan({
  plans,
}: {
  plans: PlanSummary[];
  tier: string;
}) {
  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 animate-fade-in">
      <h1 className="text-[28px] font-bold text-text font-display mb-2">
        Your plans this week
      </h1>
      <p className="text-sm text-text-secondary mb-6">
        {plans.length} active plans. Pick what matters.
      </p>

      {/* Plan cards */}
      <div className="space-y-3">
        {plans.map((plan) => {
          const pct =
            plan.totalTasks > 0
              ? Math.round((plan.completedTasks / plan.totalTasks) * 100)
              : 0;
          return (
            <Link
              key={plan.id}
              href={
                plan.status === "review"
                  ? `/plan/${plan.id}`
                  : `/plan/${plan.id}/progress`
              }
              className="block bg-bg-card rounded-lg shadow-card p-4 hover:shadow-sm transition-all"
            >
              <div className="flex items-center justify-between mb-1">
                <p className="font-semibold text-text font-display">
                  {plan.label || "Plan"}
                </p>
                <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-bg-subtle text-text-secondary">
                  {plan.mode === "today" ? "Today" : "This Week"}
                </span>
              </div>
              <p className="text-xs text-text-secondary mb-3">
                {plan.status === "review"
                  ? "Ready for review"
                  : `${plan.completedTasks} of ${plan.totalTasks} done`}
              </p>
              <div className="h-1.5 bg-border rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </Link>
          );
        })}
      </div>

      <div className="mt-6">
        <Link
          href="/new-plan"
          className="flex items-center justify-center gap-2 w-full py-3 text-sm font-medium text-primary border border-dashed border-primary/30 rounded-lg hover:bg-primary/5 transition-colors"
        >
          <Plus size={18} />
          New plan for this week
        </Link>
      </div>
    </div>
  );
}
