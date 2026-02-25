"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Calendar, TrendingUp, Lock } from "lucide-react";
import Button from "@/components/ui/Button";
import ProgressBar from "@/components/ui/ProgressBar";
import { useAuth } from "@/lib/useAuth";

interface PlanHistoryItem {
  id: string;
  label: string | null;
  mode: string;
  weekStart: string;
  weekEnd: string;
  status: string;
  createdAt: string;
  totalTasks: number;
  completedTasks: number;
  completionRate: number;
}

export default function HistoryPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [plans, setPlans] = useState<PlanHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [tierError, setTierError] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
      return;
    }
    if (user) {
      fetch("/api/plans/history")
        .then(async (r) => {
          if (r.status === 403) {
            setTierError(true);
            return;
          }
          if (r.ok) {
            const data = await r.json();
            setPlans(data);
          }
        })
        .catch(() => {})
        .finally(() => setHistoryLoading(false));
    }
  }, [user, loading, router]);

  if (loading || historyLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-lg text-text-secondary">Loading...</div>
      </div>
    );
  }

  if (tierError) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 text-center">
        <div className="py-12">
          <Lock size={40} className="text-text-tertiary mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-text font-display mb-2">
            Plan history is a Pro feature
          </h1>
          <p className="text-sm text-text-secondary mb-6">
            See your past plans, track patterns, and measure completion rates.
          </p>
          <Link href="/settings">
            <Button>See Pro options</Button>
          </Link>
        </div>
      </div>
    );
  }

  const totalPlans = plans.length;
  const avgCompletion =
    totalPlans > 0
      ? Math.round(
          plans.reduce((sum, p) => sum + p.completionRate, 0) / totalPlans
        )
      : 0;

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 animate-fade-in">
      <h1 className="text-[28px] font-bold text-text font-display mb-2">
        Plan History
      </h1>
      <p className="text-sm text-text-secondary mb-6">
        {totalPlans} plans created. Average completion: {avgCompletion}%.
      </p>

      {/* Stats summary */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-bg-card rounded-lg shadow-card p-4 text-center">
          <Calendar size={20} className="text-primary mx-auto mb-1" />
          <p className="text-2xl font-bold text-text font-display">
            {totalPlans}
          </p>
          <p className="text-xs text-text-secondary">Total plans</p>
        </div>
        <div className="bg-bg-card rounded-lg shadow-card p-4 text-center">
          <TrendingUp size={20} className="text-primary mx-auto mb-1" />
          <p className="text-2xl font-bold text-text font-display">
            {avgCompletion}%
          </p>
          <p className="text-xs text-text-secondary">Avg. completion</p>
        </div>
      </div>

      {/* Plan list */}
      {plans.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-sm text-text-secondary">
            No plans yet.{" "}
            <Link href="/new-plan" className="text-primary font-medium hover:underline">
              Create your first one.
            </Link>
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {plans.map((plan) => {
            const weekStart = new Date(plan.weekStart);
            return (
              <Link
                key={plan.id}
                href={`/plan/${plan.id}/progress`}
                className="block bg-bg-card rounded-lg shadow-card p-4 hover:shadow-sm transition-all"
              >
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="font-medium text-text text-sm">
                      {plan.label ||
                        `Week of ${weekStart.toLocaleDateString("en-GB", {
                          month: "short",
                          day: "numeric",
                        })}`}
                    </p>
                    <p className="text-xs text-text-secondary">
                      {plan.completedTasks}/{plan.totalTasks} tasks completed
                    </p>
                  </div>
                  <span
                    className={`text-sm font-semibold ${
                      plan.completionRate >= 80
                        ? "text-primary"
                        : plan.completionRate >= 50
                          ? "text-accent"
                          : "text-text-secondary"
                    }`}
                  >
                    {plan.completionRate}%
                  </span>
                </div>
                <ProgressBar
                  done={plan.completedTasks}
                  total={plan.totalTasks}
                />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
