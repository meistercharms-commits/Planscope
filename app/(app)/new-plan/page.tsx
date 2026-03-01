"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Button from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import SegmentedControl from "@/components/ui/SegmentedControl";
import Spinner from "@/components/ui/Spinner";
import { Mic, MicOff, UserPlus, ChevronDown, ChevronRight, Bookmark } from "lucide-react";
import { useAuth } from "@/lib/useAuth";
import { Tier } from "@/types";
import { schedulePlanReady, triggerUpgradeNotice } from "@/lib/notifications";
import { useSpeechToText } from "@/lib/useSpeechToText";
import { getTargetWeek, formatWeekLabel } from "@/lib/week-dates";

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

interface ParkedTask {
  id: string;
  title: string;
  category: string;
}

export default function NewPlanPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [dump, setDump] = useState("");
  const [mode, setMode] = useState("week");
  const [timeAvailable, setTimeAvailable] = useState("");
  const [energyLevel, setEnergyLevel] = useState("");
  const [focusArea, setFocusArea] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [attempted, setAttempted] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // Tier info
  const [tierData, setTierData] = useState<TierData | null>(null);

  // Recurring weeks
  const [lastPlan, setLastPlan] = useState<LastPlanData | null>(null);
  const [useCopy, setUseCopy] = useState(false);

  // Plan label (Pro Plus)
  const [planLabel, setPlanLabel] = useState("");

  // Active plan check
  const [activePlan, setActivePlan] = useState<{ id: string; status: string } | null>(null);

  // Carry-over parked tasks
  const [parkedTasks, setParkedTasks] = useState<ParkedTask[]>([]);
  const [selectedParked, setSelectedParked] = useState<Set<string>>(new Set());
  const [carryOverOpen, setCarryOverOpen] = useState(false);

  // Voice input (Pro Plus)
  const {
    isSupported: speechSupported,
    isListening,
    interimTranscript,
    error: speechError,
    startListening,
    stopListening,
  } = useSpeechToText((transcript) => {
    setDump((prev) => {
      const sep = prev.length > 0 && !prev.endsWith(" ") ? " " : "";
      const combined = prev + sep + transcript;
      if (combined.length > 10000) {
        stopListening();
        return combined.slice(0, 10000);
      }
      return combined;
    });
  });

  useEffect(() => {
    fetch("/api/settings/tier")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) setTierData(data);
      })
      .catch((err) => console.error("[NewPlan] Tier fetch failed:", err));

    // Fetch active plans for this week
    fetch("/api/plans/active")
      .then((r) => (r.ok ? r.json() : null))
      .then((plans) => {
        if (plans && plans.length > 0) setActivePlan(plans[0]);
      })
      .catch((err) => console.error("[NewPlan] Active plans fetch failed:", err));

    // Fetch last plan for recurring option
    fetch("/api/plans/history")
      .then((r) => (r.ok ? r.json() : null))
      .then((plans) => {
        if (plans && plans.length > 0) setLastPlan(plans[0]);
      })
      .catch((err) => console.error("[NewPlan] History fetch failed:", err));

    // Fetch parked tasks from last plan (signed-in users only)
    fetch("/api/plans/parked-tasks")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.tasks?.length > 0) setParkedTasks(data.tasks);
      })
      .catch((err) => console.error("[NewPlan] Parked tasks fetch failed:", err));
  }, []);

  const canUseCopy = lastPlan && (tierData?.tier === "pro" || tierData?.tier === "pro_plus");
  const isProPlus = tierData?.tier === "pro_plus";
  const isPaidUser = tierData?.tier === "pro" || tierData?.tier === "pro_plus";
  const plansRemaining = tierData?.usage.plansRemaining;
  const plansLimit = tierData?.usage.plansLimit;
  const plansUsed = tierData ? tierData.usage.plansThisMonth : 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!timeAvailable || !energyLevel || !focusArea) {
      setAttempted(true);
      return;
    }
    if (loading) return; // Guard against double-submit
    setError("");
    setLoading(true);

    const controller = new AbortController();
    abortRef.current = controller;
    const timeoutId = setTimeout(() => controller.abort(), 65000); // 65s timeout

    try {
      // Append selected parked tasks to the dump
      let finalDump = useCopy ? "[Copied from previous plan]" : dump;
      if (selectedParked.size > 0 && !useCopy) {
        const carried = parkedTasks
          .filter((t) => selectedParked.has(t.id))
          .map((t) => t.title)
          .join(". ");
        finalDump = finalDump + "\n\nCarried over from last plan: " + carried + ".";
      }

      const res = await fetch("/api/generate-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dump: finalDump,
          mode,
          time_available: timeAvailable,
          energy_level: energyLevel,
          focus_area: focusArea,
          ...(useCopy && lastPlan ? { copyFromPlanId: lastPlan.id } : {}),
          ...(isProPlus && planLabel ? { label: planLabel } : {}),
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        const data = await res.json();
        if (data.code === "PLAN_LIMIT_REACHED" || data.code === "ACTIVE_PLAN_LIMIT") {
          setError(data.error);
          if (data.code === "PLAN_LIMIT_REACHED") {
            triggerUpgradeNotice(plansUsed ?? 0, plansLimit ?? 4).catch((err) => console.error("[NewPlan] Upgrade notice failed:", err));
          }
          setLoading(false);
          return;
        }
        throw new Error(data.error || "Failed to generate plan");
      }

      const data = await res.json();

      // Anonymous users: plan generated but not saved — show preview
      if (data.requiresLogin && data.preview) {
        sessionStorage.setItem("planscope_preview", JSON.stringify(data.preview));
        router.push("/plan/preview");
        return;
      }

      const { id, taskCount } = data;
      // Schedule "plan ready" notification (fires 5 min from now if user leaves app)
      schedulePlanReady(id, taskCount ?? 7).catch((err) => console.error("[NewPlan] Plan ready notification failed:", err));
      router.push(`/plan/${id}`);
    } catch (err) {
      clearTimeout(timeoutId);
      if (err instanceof DOMException && err.name === "AbortError") {
        setError("Plan generation timed out. Please try again.");
      } else {
        setError((err as Error).message);
      }
      setLoading(false);
    }
  }

  if (loading) {
    const { weekStart, weekEnd } = getTargetWeek();
    const weekLabel = formatWeekLabel(weekStart, weekEnd);
    return <Spinner
      subtitle={`Week of ${weekLabel}`}
      onCancel={() => {
        abortRef.current?.abort();
        abortRef.current = null;
        setLoading(false);
      }}
    />;
  }

  // Plan limit reached
  if (tierData && plansRemaining !== null && plansRemaining !== undefined && plansRemaining <= 0) {
    return (
      <div className="max-w-2xl lg:max-w-3xl mx-auto px-4 sm:px-6 py-8">
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
          <div className="mt-6">
            <Link href="/dashboard" className="text-sm text-primary font-medium hover:underline">
              Back to dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl lg:max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <div className="animate-fade-in">
        {/* Active plan warning for Free/Pro */}
        {activePlan && tierData && tierData.tier !== "pro_plus" && (
          <div className="bg-warm-bg border border-warm-border rounded-lg p-4 mb-6">
            <p className="text-sm font-medium text-warm-text mb-1">
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

          {/* Plan label for Pro Plus — render while tier loads to avoid layout shift */}
          {(tierData === null || isProPlus) && (
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
                  className="w-4 h-4 rounded border-border text-primary focus-visible:ring-primary"
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

          {/* Carry over parked tasks */}
          {parkedTasks.length > 0 && !useCopy && (
            <div className="bg-bg-card rounded-lg border border-border overflow-hidden">
              <button
                type="button"
                onClick={() => setCarryOverOpen(!carryOverOpen)}
                aria-expanded={carryOverOpen}
                aria-controls="carry-over-panel"
                className="w-full flex items-center gap-3 p-4 text-left cursor-pointer"
              >
                <div className="w-8 h-8 rounded-full bg-primary-light flex items-center justify-center flex-shrink-0">
                  <Bookmark size={16} className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text">
                    Carry over from last plan
                  </p>
                  <p className="text-xs text-text-secondary">
                    {parkedTasks.length} parked {parkedTasks.length === 1 ? "task" : "tasks"} from last time
                  </p>
                </div>
                {selectedParked.size > 0 && (
                  <span className="text-xs font-medium text-primary bg-primary-light px-2 py-0.5 rounded-full">
                    {selectedParked.size} selected
                  </span>
                )}
                {carryOverOpen ? (
                  <ChevronDown size={18} className="text-text-secondary flex-shrink-0" />
                ) : (
                  <ChevronRight size={18} className="text-text-secondary flex-shrink-0" />
                )}
              </button>
              {carryOverOpen && (
                <div id="carry-over-panel" role="region" className="px-4 pb-4 space-y-2">
                  {parkedTasks.length >= 3 && (
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedParked.size === parkedTasks.length) {
                          setSelectedParked(new Set());
                        } else {
                          setSelectedParked(new Set(parkedTasks.map((t) => t.id)));
                        }
                      }}
                      className="text-xs font-medium text-primary hover:underline cursor-pointer mb-1"
                    >
                      {selectedParked.size === parkedTasks.length ? "Deselect all" : "Select all"}
                    </button>
                  )}
                  {parkedTasks.map((task) => (
                    <label key={task.id} className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedParked.has(task.id)}
                        onChange={() => {
                          setSelectedParked((prev) => {
                            const next = new Set(prev);
                            if (next.has(task.id)) {
                              next.delete(task.id);
                            } else {
                              next.add(task.id);
                            }
                            return next;
                          });
                        }}
                        className="w-4 h-4 rounded border-border text-primary focus-visible:ring-primary mt-0.5"
                      />
                      <span className="text-sm text-text">{task.title}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Brain Dump */}
          {!useCopy && (
            <div>
              <p className="text-sm font-medium text-text-secondary mb-2">
                Just type{isPaidUser && speechSupported ? " or speak" : ""}, no formatting needed
              </p>
              <div className="relative">
                <Textarea
                  placeholder="Finish Q2 proposal. Call client about scope change. Code review for team backend. Update project docs. Prep for 1:1s. Should really exercise this week..."
                  value={dump + (interimTranscript ? (dump ? " " : "") + interimTranscript : "")}
                  onChange={(e) => setDump(e.target.value)}
                  className="min-h-[200px] sm:min-h-[240px]"
                  maxLength={10000}
                  required={!useCopy}
                  readOnly={isListening}
                />
                {isPaidUser && speechSupported && (
                  <button
                    type="button"
                    onClick={isListening ? stopListening : startListening}
                    disabled={loading}
                    aria-label={isListening ? "Stop voice input" : "Start voice input"}
                    className={`absolute bottom-3 right-3 p-2.5 rounded-full transition-all duration-200 ${
                      isListening
                        ? "bg-red-50 text-red-500 animate-pulse-recording"
                        : "bg-[#F5F5F5] text-text-secondary hover:bg-[#E8F5EF] hover:text-primary"
                    } disabled:opacity-40 disabled:cursor-not-allowed`}
                  >
                    {isListening ? <MicOff size={20} /> : <Mic size={20} />}
                  </button>
                )}
              </div>
              {speechError && (
                <p className="text-xs text-warm-text mt-1">{speechError}</p>
              )}
              {isListening && (
                <p className="text-xs text-primary mt-1 flex items-center gap-1.5">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse-recording" />
                  Listening...
                </p>
              )}
              <div className="flex justify-between items-center mt-2">
                <p className="text-xs text-text-tertiary">
                  {dump.length < 20 && dump.length > 0 && !isListening
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
            required
            error={attempted && !timeAvailable}
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
            required
            error={attempted && !energyLevel}
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
            required
            error={attempted && !focusArea}
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
            <div className="px-4 py-3 bg-warm-bg border border-warm-border rounded-md text-sm text-warm-text">
              {error}
            </div>
          )}

          {/* Submit */}
          <div>
            <Button
              type="submit"
              fullWidth
              size="lg"
              disabled={(!useCopy && dump.length < 20 && selectedParked.size === 0) || !timeAvailable || !energyLevel || !focusArea}
            >
              {useCopy ? "Copy & make my plan" : "Make me a plan"}
            </Button>
            {attempted && (!timeAvailable || !energyLevel || !focusArea) && (
              <p className="text-xs text-warm-text mt-2 text-center">
                Please select{!timeAvailable ? " time available" : ""}{!energyLevel ? `${!timeAvailable ? "," : ""} energy level` : ""}{!focusArea ? `${!timeAvailable || !energyLevel ? "," : ""} main focus` : ""} above.
              </p>
            )}
          </div>
        </form>

        {/* Sign-up nudge for anonymous users */}
        {!authLoading && !user && (
          <div className="mt-6 bg-bg-card rounded-lg border border-border p-5 text-center">
            <div
              className="rounded-full bg-primary-light inline-flex items-center justify-center mb-3"
              style={{ width: 40, height: 40 }}
            >
              <UserPlus size={20} className="text-primary" />
            </div>
            <p className="text-sm font-semibold text-text font-display mb-1">
              You&apos;ll need an account to save your plan
            </p>
            <p className="text-xs text-text-secondary mb-4 max-w-sm mx-auto leading-relaxed">
              You can create a plan to preview it, but sign up or log in to keep it and track your progress.
            </p>
            <div className="flex items-center justify-center gap-3">
              <Link
                href="/signup"
                className="inline-flex items-center px-5 py-2.5 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-dark transition-colors"
              >
                Sign up free
              </Link>
              <Link
                href="/login"
                className="text-sm font-medium text-primary hover:underline"
              >
                Log in
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
