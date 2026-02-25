"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import ProgressBar from "@/components/ui/ProgressBar";

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

      <div className="space-y-3">
        {plans.map((plan) => (
          <Link
            key={plan.id}
            href={
              plan.status === "review"
                ? `/plan/${plan.id}`
                : `/plan/${plan.id}/progress`
            }
            className="block bg-bg-card rounded-lg shadow-card p-4 hover:shadow-sm transition-all"
          >
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-semibold text-text font-display">
                {plan.label}
              </h2>
              <span className="text-xs text-text-secondary">
                {plan.completedTasks}/{plan.totalTasks} done
              </span>
            </div>
            <ProgressBar done={plan.completedTasks} total={plan.totalTasks} />
          </Link>
        ))}
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
