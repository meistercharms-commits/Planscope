"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Lock, Zap, Target, Calendar, Mic } from "lucide-react";
import Button from "@/components/ui/Button";
import StatsCard from "@/components/ui/StatsCard";
import EmptyState from "@/components/ui/EmptyState";
import { SkeletonCard } from "@/components/ui/Skeleton";
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
  const { user, loading } = useAuth();
  const [plans, setPlans] = useState<PlanHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [tierError, setTierError] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      // Not logged in — stop loading and show upsell
      setHistoryLoading(false);
      return;
    }
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
      .catch((err) => console.error("[History] Fetch failed:", err))
      .finally(() => setHistoryLoading(false));
  }, [user, loading]);

  if (loading || historyLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <div className="space-y-4">
          <SkeletonCard lines={2} />
          <SkeletonCard lines={2} />
          <SkeletonCard lines={2} />
        </div>
      </div>
    );
  }

  // Not logged in — show login prompt + upsell
  if (!user) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 animate-fade-in">
        <h1 className="text-[28px] font-bold text-text font-display mb-2">
          Plan History
        </h1>
        <p className="text-sm text-text-secondary mb-8">
          Track your progress over time.
        </p>

        <div className="text-center py-12 bg-bg-card rounded-lg p-8 shadow-card mb-6">
          <Lock size={40} className="text-text-tertiary mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-text font-display mb-2">
            Sign in to view your history
          </h2>
          <p className="text-sm text-text-secondary mb-6 max-w-sm mx-auto">
            Create an account or log in to keep track of your past plans and completion rates.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/login">
              <Button>Log in</Button>
            </Link>
            <Link href="/signup">
              <Button variant="secondary">Create account</Button>
            </Link>
          </div>
        </div>

        {/* Pro upsell */}
        <div className="bg-bg-card rounded-lg p-6 shadow-card">
          <h3 className="text-sm font-semibold text-text font-display mb-4">
            Unlock more with Pro
          </h3>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Zap size={18} className="text-primary mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-text">Serious about execution</p>
                <p className="text-xs text-text-secondary">8 plans per month for people who plan to follow through</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Calendar size={18} className="text-primary mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-text">Build planning momentum</p>
                <p className="text-xs text-text-secondary">Recurring weekly templates so your rhythm never breaks</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Target size={18} className="text-primary mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-text">Protect your deep work</p>
                <p className="text-xs text-text-secondary">Built-in Focus Mode to guard your concentration</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Mic size={18} className="text-primary mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-text">Voice-to-plan</p>
                <p className="text-xs text-text-secondary">Capture your thoughts in seconds, no typing needed</p>
              </div>
            </div>
          </div>
          <div className="mt-5 pt-4 border-t border-border">
            <Link href="/settings">
              <Button variant="secondary" fullWidth>See Pro options</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Logged in but tier doesn't support history
  if (tierError) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 animate-fade-in">
        <h1 className="text-[28px] font-bold text-text font-display mb-2">
          Plan History
        </h1>
        <p className="text-sm text-text-secondary mb-8">
          Track your progress over time.
        </p>

        <div className="text-center py-12 bg-bg-card rounded-lg p-8 shadow-card mb-6">
          <Lock size={40} className="text-text-tertiary mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-text font-display mb-2">
            Plan history is a Pro feature
          </h2>
          <p className="text-sm text-text-secondary mb-6 max-w-sm mx-auto">
            See your past plans, track patterns, and measure completion rates.
          </p>
          <Link href="/settings">
            <Button>Upgrade to Pro</Button>
          </Link>
        </div>

        {/* Pro feature breakdown */}
        <div className="bg-bg-card rounded-lg p-6 shadow-card">
          <h3 className="text-sm font-semibold text-text font-display mb-4">
            What you get with Pro
          </h3>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Zap size={18} className="text-primary mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-text">Serious about execution</p>
                <p className="text-xs text-text-secondary">8 plans per month for people who plan to follow through</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Calendar size={18} className="text-primary mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-text">Build planning momentum</p>
                <p className="text-xs text-text-secondary">Recurring weekly templates so your rhythm never breaks</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Target size={18} className="text-primary mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-text">Protect your deep work</p>
                <p className="text-xs text-text-secondary">Built-in Focus Mode to guard your concentration</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Mic size={18} className="text-primary mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-text">Voice-to-plan</p>
                <p className="text-xs text-text-secondary">Capture your thoughts in seconds, no typing needed</p>
              </div>
            </div>
          </div>
          <div className="mt-5 pt-4 border-t border-border">
            <Link href="/settings">
              <Button variant="secondary" fullWidth>See Pro options</Button>
            </Link>
          </div>
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

  const totalTasksCompleted = plans.reduce((sum, p) => sum + p.completedTasks, 0);
  const totalTasksPlanned = plans.reduce((sum, p) => sum + p.totalTasks, 0);
  const bestWeek = totalPlans > 0 ? Math.max(...plans.map(p => p.completionRate)) : 0;

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 animate-fade-in">
      <h1 className="text-[28px] font-bold text-text font-display mb-2">
        Plan History
      </h1>
      <p className="text-sm text-text-secondary mb-6">
        {totalPlans} plans created. {totalTasksCompleted} tasks completed.
      </p>

      {/* Stats summary - Grid layout */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        {/* Average Completion - Ring */}
        <StatsCard
          variant="ring"
          label="Avg. Completion"
          value={avgCompletion}
          ringValue={avgCompletion}
          subtext={totalPlans > 0 ? `${totalPlans} week${totalPlans !== 1 ? 's' : ''}` : "No data"}
        />

        {/* Total Tasks Completed */}
        <StatsCard
          label="Tasks Completed"
          value={totalTasksCompleted}
          subtext={`of ${totalTasksPlanned} planned`}
          icon={<Zap size={24} />}
        />

        {/* Best Week */}
        <StatsCard
          label="Best Week"
          value={`${bestWeek}%`}
          subtext={bestWeek > avgCompletion ? "Above average" : bestWeek === avgCompletion && totalPlans > 1 ? "Consistent" : ""}
          icon={<Target size={24} />}
        />
      </div>

      {/* Plan list */}
      {plans.length === 0 ? (
        <EmptyState
          icon="/icons/no_plans.svg"
          title="Your history starts here"
          description="Once you've made your first plan and the week passes, it'll show up here so you can look back at what you've done."
          actionLabel="Create your first plan"
          actionHref="/new-plan"
        />
      ) : (
        <div className="space-y-3">
          {plans.map((plan) => {
            const weekStart = new Date(plan.weekStart);
            const pct = plan.totalTasks > 0
              ? Math.round((plan.completedTasks / plan.totalTasks) * 100)
              : 0;
            return (
              <Link
                key={plan.id}
                href={`/plan/${plan.id}/progress`}
                className="block bg-bg-card rounded-lg shadow-card p-4 hover:shadow-sm transition-all"
              >
                <div className="flex items-center justify-between mb-1">
                  <p className="font-semibold text-text font-display">
                    {plan.label ||
                      `Week of ${weekStart.toLocaleDateString("en-GB", {
                        month: "short",
                        day: "numeric",
                      })}`}
                  </p>
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
                <p className="text-xs text-text-secondary mb-3">
                  {plan.completedTasks} of {plan.totalTasks} done
                  {plan.status === "review" && " · Ready for review"}
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
      )}
    </div>
  );
}
