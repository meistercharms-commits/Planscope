"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Button from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import SegmentedControl from "@/components/ui/SegmentedControl";
import Spinner from "@/components/ui/Spinner";
import { Tier } from "@/types";

interface TierData {
  tier: Tier;
  usage: {
    plansThisMonth: number;
    plansLimit: number;
    plansRemaining: number | null;
  };
}

interface LastPlanData {
  id: string;
  weekStart: string;
  label: string | null;
}

export default function NewPlanPage() {
  const router = useRouter();
  const [dump, setDump] = useState("");
  const [mode, setMode] = useState("week");
  const [timeAvailable, setTimeAvailable] = useState("");
  const [energyLevel, setEnergyLevel] = useState("");
  const [focusArea, setFocusArea] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Tier info
  const [tierData, setTierData] = useState<TierData | null>(null);

  // Recurring weeks
  const [lastPlan, setLastPlan] = useState<LastPlanData | null>(null);
  const [useCopy, setUseCopy] = useState(false);

  // Plan label (Pro Plus)
  const [planLabel, setPlanLabel] = useState("");

  // Active plan check
  const [activePlan, setActivePlan] = useState<{ id: string; status: string } | null>(null);

  useEffect(() => {
    fetch("/api/settings/tier")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) setTierData(data);
      })
      .catch(() => {});

    // Fetch active plans for this week
    fetch("/api/plans/active")
      .then((r) => (r.ok ? r.json() : null))
      .then((plans) => {
        if (plans && plans.length > 0) setActivePlan(plans[0]);
      })
      .catch(() => {});

    // Fetch last plan for recurring option
    fetch("/api/plans/history")
      .then((r) => (r.ok ? r.json() : null))
      .then((plans) => {
        if (plans && plans.length > 0) setLastPlan(plans[0]);
      })
      .catch(() => {});
  }, []);

  const canUseCopy = lastPlan && (tierData?.tier === "pro" || tierData?.tier === "pro_plus");
  const isProPlus = tierData?.tier === "pro_plus";
  const plansRemaining = tierData?.usage.plansRemaining;
  const plansLimit = tierData?.usage.plansLimit;
  const plansUsed = tierData ? tierData.usage.plansThisMonth : 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/generate-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dump: useCopy ? "[Copied from previous plan]" : dump,
          mode,
          time_available: timeAvailable,
          energy_level: energyLevel,
          focus_area: focusArea,
          ...(useCopy && lastPlan ? { copyFromPlanId: lastPlan.id } : {}),
          ...(planLabel ? { label: planLabel } : {}),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        if (data.code === "PLAN_LIMIT_REACHED" || data.code === "ACTIVE_PLAN_LIMIT") {
          setError(data.error);
          setLoading(false);
          return;
        }
        throw new Error(data.error || "Failed to generate plan");
      }

      const { id } = await res.json();
      router.push(`/plan/${id}`);
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  }

  if (loading) {
    return <Spinner />;
  }

  // Plan limit reached
  if (tierData && plansRemaining !== null && plansRemaining !== undefined && plansRemaining <= 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <div className="animate-fade-in text-center py-12">
          <h1 className="text-[28px] font-bold text-text font-display mb-2">
            You&apos;ve used all {plansLimit} plans this month
          </h1>
          <p className="text-sm text-text-secondary mb-6">
            Your plans reset on the 1st. Until then, focus on what you&apos;ve already planned.
          </p>
          {tierData.tier === "free" && (
            <p className="text-sm text-text-secondary">
              Need more plans?{" "}
              <Link href="/settings" className="text-primary font-medium hover:underline">
                See Pro options
              </Link>
            </p>
          )}
          {tierData.tier === "pro" && (
            <p className="text-sm text-text-secondary">
              Need unlimited plans?{" "}
              <Link href="/settings" className="text-primary font-medium hover:underline">
                See Pro Plus
              </Link>
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      <div className="animate-fade-in">
        {/* Active plan warning for Free/Pro */}
        {activePlan && tierData && tierData.tier !== "pro_plus" && (
          <div className="bg-[#F9F5F0] border border-[#E8DDD0] rounded-lg p-4 mb-6">
            <p className="text-sm font-medium text-[#8A6D4B] mb-1">
              You already have an active plan
            </p>
            <p className="text-sm text-text-secondary mb-3">
              Free and Pro users can have one active plan at a time. Finish your tasks or archive your current plan to start a new one.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href={activePlan.status === "review" ? `/plan/${activePlan.id}` : `/plan/${activePlan.id}/progress`}
                className="text-sm text-primary font-medium hover:underline"
              >
                Go to your current plan
              </Link>
              <Link
                href="/settings"
                className="text-sm text-text-secondary hover:underline"
              >
                {tierData.tier === "free" ? "See Pro Plus" : "Upgrade to Pro Plus"}
              </Link>
            </div>
          </div>
        )}

        <h1 className="text-[28px] font-bold text-text font-display mb-2">
          What&apos;s on your mind?
        </h1>
        <p className="text-sm text-text-secondary mb-4">
          Dump everything. We&apos;ll make sense of it.
        </p>

        {/* Plan usage */}
        {tierData && plansRemaining !== null && plansRemaining !== undefined && (
          <p className="text-sm text-text-secondary mb-6 flex items-center gap-2">
            <span>
              You&apos;ve used {plansUsed} of {plansLimit} plans this month
            </span>
            {plansRemaining === 1 && (
              <span className="text-accent font-medium">&mdash; last one!</span>
            )}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Mode Toggle */}
          <SegmentedControl
            label="Mode"
            options={[
              { value: "today", label: "Today", icon: "/icons/today.svg" },
              { value: "week", label: "This Week", icon: "/icons/this_week.svg" },
            ]}
            value={mode}
            onChange={setMode}
          />

          {/* Plan label for Pro Plus */}
          {isProPlus && (
            <Input
              label="Plan name (optional)"
              placeholder="e.g. Work week, Creative projects"
              value={planLabel}
              onChange={(e) => setPlanLabel(e.target.value)}
              maxLength={50}
            />
          )}

          {/* Copy last week option (Pro/Pro Plus) */}
          {canUseCopy && (
            <div className="bg-bg-card rounded-lg border border-border p-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useCopy}
                  onChange={(e) => setUseCopy(e.target.checked)}
                  className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                />
                <div>
                  <p className="text-sm font-medium text-text">Copy last week&apos;s plan</p>
                  <p className="text-xs text-text-secondary">
                    Start from where you left off. You can still tweak it.
                  </p>
                </div>
              </label>
            </div>
          )}

          {/* Brain Dump */}
          {!useCopy && (
            <div>
              <p className="text-sm font-medium text-text-secondary mb-2">
                Just type, no formatting needed
              </p>
              <Textarea
                placeholder="Finish Q2 proposal. Call client about scope change. Code review for team backend. Update project docs. Prep for 1:1s. Should really exercise this week..."
                value={dump}
                onChange={(e) => setDump(e.target.value)}
                className="min-h-[200px] sm:min-h-[240px]"
                required={!useCopy}
              />
              <div className="flex justify-between items-center mt-2">
                <p className="text-xs text-text-tertiary">
                  {dump.length < 20 && dump.length > 0
                    ? `${20 - dump.length} more characters needed`
                    : "\u00A0"}
                </p>
                <p className="text-xs text-text-tertiary">
                  {dump.length > 0 ? `${dump.length} characters` : ""}
                </p>
              </div>
            </div>
          )}

          {/* Constraints */}
          <SegmentedControl
            label="Time available"
            options={[
              { value: "low", label: "Low", icon: "/icons/low_time.svg" },
              { value: "medium", label: "Medium", icon: "/icons/medium_time.svg" },
              { value: "high", label: "High", icon: "/icons/high_time.svg" },
            ]}
            value={timeAvailable}
            onChange={setTimeAvailable}
          />

          <SegmentedControl
            label="Energy level"
            options={[
              { value: "drained", label: "Drained", icon: "/icons/drained.svg" },
              { value: "ok", label: "OK", icon: "/icons/ok_energy.svg" },
              { value: "fired_up", label: "Fired up", icon: "/icons/fired_up_energy.svg" },
            ]}
            value={energyLevel}
            onChange={setEnergyLevel}
          />

          <SegmentedControl
            label="Main focus"
            options={[
              { value: "work", label: "Work", icon: "/icons/work.svg" },
              { value: "health", label: "Health", icon: "/icons/health.svg" },
              { value: "home", label: "Home", icon: "/icons/home.svg" },
              { value: "money", label: "Money", icon: "/icons/money.svg" },
              { value: "other", label: "Other", icon: "/icons/other.svg" },
            ]}
            value={focusArea}
            onChange={setFocusArea}
          />

          <p className="text-xs text-text-secondary">
            This helps Planscope pick realistic tasks for you.
          </p>

          {/* Error */}
          {error && (
            <div className="px-4 py-3 bg-[#F9F5F0] border border-[#E8DDD0] rounded-md text-sm text-[#8A6D4B]">
              {error}
            </div>
          )}

          {/* Submit */}
          <Button
            type="submit"
            fullWidth
            size="lg"
            disabled={(!useCopy && dump.length < 20) || !timeAvailable || !energyLevel || !focusArea}
          >
            {useCopy ? "Copy & make my plan" : "Make me a plan"}
          </Button>
        </form>
      </div>
    </div>
  );
}
