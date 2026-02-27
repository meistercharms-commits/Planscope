"use client";

import { useEffect, useState, useRef, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  MessageCircle,
  ArrowRight,
  Share2,
  Download,
  X,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Spinner from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";
import LearningsInsight from "@/components/ui/LearningsInsight";
import ClarityCard from "@/components/ui/ClarityCard";
import type { LearningsSummary, PlanTask, PlanMeta } from "@/types";
import { getCategoryColors } from "@/lib/category-colors";

interface PlanData {
  id: string;
  mode: string;
  weekStart: string;
  weekEnd: string;
  status: string;
  planMeta: string | null;
  parsedDump: { tasks?: { title: string }[] } | null;
  tasks: PlanTask[];
}

export default function PlanReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { showToast } = useToast();
  const [plan, setPlan] = useState<PlanData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [parkedOpen, setParkedOpen] = useState(true);
  const [tweakOpen, setTweakOpen] = useState(false);
  const [tweaking, setTweaking] = useState(false);
  const [learnings, setLearnings] = useState<LearningsSummary | null>(null);
  const [showClarityCard, setShowClarityCard] = useState(false);
  const [sharing, setSharing] = useState(false);
  const clarityCardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchPlan();
    // Fetch learnings (if user has learning enabled)
    fetch("/api/settings/learn-enabled")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.learnEnabled) {
          fetch("/api/users/learnings")
            .then((r) => (r.ok ? r.json() : null))
            .then((data) => {
              if (data?.learnings) setLearnings(data.learnings);
            })
            .catch((err) => console.error("[PlanReview] Learnings fetch failed:", err));
        }
      })
      .catch((err) => console.error("[PlanReview] Learn-enabled fetch failed:", err));
  }, [id]);

  async function fetchPlan() {
    try {
      const res = await fetch(`/api/plans/${id}`);
      if (!res.ok) throw new Error("Plan not found");
      const data = await res.json();
      // If already active, redirect to progress
      if (data.status === "active") {
        router.replace(`/plan/${id}/progress`);
        return;
      }
      setPlan(data);
    } catch {
      router.push("/new-plan");
    } finally {
      setLoading(false);
    }
  }

  async function handleAccept() {
    setSaving(true);
    try {
      await fetch(`/api/plans/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "active" }),
      });
      showToast("Plan saved. You've got this.");
      setShowClarityCard(true);
    } catch {
      showToast("Something went wrong saving your plan.", "error");
    } finally {
      setSaving(false);
    }
  }

  const handleShare = useCallback(async () => {
    if (!clarityCardRef.current) return;
    setSharing(true);
    try {
      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(clarityCardRef.current, {
        pixelRatio: 2,
        cacheBust: true,
      });

      // Try native share (mobile / Capacitor)
      if (navigator.share && navigator.canShare) {
        const res = await fetch(dataUrl);
        const blob = await res.blob();
        const file = new File([blob], "planscope-clarity.png", { type: "image/png" });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file] });
          return;
        }
      }

      // Fallback: download
      const link = document.createElement("a");
      link.download = "planscope-clarity.png";
      link.href = dataUrl;
      link.click();
    } catch (err) {
      // User cancelled the share dialog — not an error
      if (err instanceof DOMException && err.name === "AbortError") return;
      console.error("[ClarityCard] Share failed:", err);
      showToast("Couldn't generate image. Try again.", "error");
    } finally {
      setSharing(false);
    }
  }, [showToast]);

  function handleContinue() {
    router.push(`/plan/${id}/progress`);
  }

  async function handleTweak(type: string) {
    setTweaking(true);
    setTweakOpen(false);
    // For v1, re-generate by redirecting back to new-plan
    // A full tweak would re-score without re-parsing
    showToast("Rebalancing your plan...");
    setTimeout(() => {
      setTweaking(false);
      fetchPlan();
    }, 1500);
  }

  if (loading || tweaking) return <Spinner />;
  if (!plan) return null;

  // Parse plan metadata
  let meta: PlanMeta | null = null;
  if (plan.planMeta) {
    try {
      meta = JSON.parse(plan.planMeta);
    } catch {
      // graceful fallback
    }
  }

  const doFirst = plan.tasks.filter((t) => t.section === "do_first");
  const thisWeek = plan.tasks.filter((t) => t.section === "this_week");
  const notThisWeek = plan.tasks.filter((t) => t.section === "not_this_week");

  // Group "this week" by category
  const categories = Array.from(
    new Set(thisWeek.map((t) => t.category || "other"))
  );

  const weekStart = new Date(plan.weekStart);
  const weekEnd = new Date(plan.weekEnd);
  const dateRange = `${formatDate(weekStart)} – ${formatDate(weekEnd)}`;

  // Clarity card stats
  const thoughtsCount = plan.parsedDump?.tasks?.length ?? plan.tasks.length;
  const prioritiesCount = doFirst.length;
  const totalTasks = doFirst.length + thisWeek.length;
  const parkedCount = notThisWeek.length;
  const clarityWeekLabel = weekStart.toLocaleDateString("en-GB", { day: "numeric", month: "short" });

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      {/* Headline + Header */}
      <div className="animate-fade-in mb-6">
        {meta?.headline ? (
          <>
            <h1 className="text-[28px] font-bold text-text font-display leading-tight">
              {meta.headline}
            </h1>
            <p className="text-sm text-text-secondary mt-1">{dateRange}</p>
          </>
        ) : (
          <>
            <h1 className="text-[28px] font-bold text-text font-display">
              Your {plan.mode === "today" ? "day" : "week"}, simplified
            </h1>
            <p className="text-sm text-text-secondary mt-1">{dateRange}</p>
          </>
        )}
      </div>

      {/* Burnout Alert */}
      {meta?.burnout_alert && (
        <div className="animate-fade-in mb-6 bg-accent/5 border border-accent/20 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle size={20} className="text-accent flex-shrink-0 mt-0.5" />
            <p className="text-sm text-text leading-relaxed">{meta.burnout_alert}</p>
          </div>
        </div>
      )}

      {/* Learnings Insight */}
      {learnings && (
        <div className="animate-fade-in mb-6">
          <LearningsInsight learnings={learnings} />
        </div>
      )}

      <div className="h-px bg-border mb-6" />

      {/* Do First */}
      {doFirst.length > 0 && (
        <section className="mb-8 animate-fade-in-up stagger-1" style={{ opacity: 0 }}>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-text mb-4 font-display">
            <img src="/icons/do_first.svg" alt="" className="w-5 h-5" />
            Do First
          </h2>
          <div className="space-y-3">
            {doFirst.map((task) => (
              <TaskReviewCard key={task.id} task={task} showContext />
            ))}
          </div>
        </section>
      )}

      <div className="h-px bg-border mb-6" />

      {/* This Week */}
      <section className="mb-8 animate-fade-in-up stagger-2" style={{ opacity: 0 }}>
        <h2 className="flex items-center gap-2 text-lg font-semibold text-text mb-4 font-display">
          <img src={`/icons/${plan.mode === "today" ? "timer" : "this_week"}.svg`} alt="" className="w-5 h-5" />
          {plan.mode === "today" ? "Today" : "This Week"} ({doFirst.length + thisWeek.length} tasks)
        </h2>
        {categories.map((cat) => {
          const tasks = thisWeek.filter((t) => (t.category || "other") === cat);
          const catColors = getCategoryColors(cat);
          if (tasks.length === 0) return null;
          return (
            <div key={cat} className="mb-4">
              <h3 className="text-sm font-medium text-text mb-2 flex items-center gap-2">
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: catColors.border }}
                />
                {catColors.label}
                <span className="text-text-secondary font-normal">({tasks.length})</span>
              </h3>
              <div className="space-y-3">
                {tasks.map((task) => (
                  <TaskReviewCard key={task.id} task={task} showContext />
                ))}
              </div>
            </div>
          );
        })}
      </section>

      <div className="h-px bg-border mb-6" />

      {/* Not This Week */}
      {notThisWeek.length > 0 && (
        <section className="mb-8 animate-fade-in-up stagger-3" style={{ opacity: 0 }}>
          <div className="bg-bg-card rounded-lg shadow-card p-4">
            <button
              onClick={() => setParkedOpen(!parkedOpen)}
              className="flex items-center gap-2 font-semibold text-text w-full text-left cursor-pointer"
            >
              {parkedOpen ? (
                <ChevronDown size={18} />
              ) : (
                <ChevronRight size={18} />
              )}
              <img src="/icons/not_this_week.svg" alt="" className="w-5 h-5" />
              Not {plan.mode === "today" ? "Today" : "This Week"} ({notThisWeek.length} safely parked)
            </button>
            <p className="text-xs text-text-secondary italic mt-1 ml-[26px]">
              These matter, just not {plan.mode === "today" ? "today" : "this week"}. You&apos;re not dropping them.
            </p>

            {parkedOpen && (
              <div className="mt-3 pt-3 border-t border-border space-y-3">
                {notThisWeek.map((task) => (
                  <ParkedTaskCard key={task.id} task={task} />
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Reality Check */}
      {meta?.reality_check && (
        <section className="mb-8 animate-fade-in-up stagger-3" style={{ opacity: 0 }}>
          <div className="bg-bg-card rounded-lg shadow-card p-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-text mb-2">
              <MessageCircle size={16} className="text-primary" />
              Reality check
            </h3>
            <p className="text-sm text-text-secondary leading-relaxed">
              {meta.reality_check}
            </p>
          </div>
        </section>
      )}

      {/* Real Talk (burnout advice) */}
      {meta?.real_talk && (
        <section className="mb-8 animate-fade-in-up stagger-3" style={{ opacity: 0 }}>
          <div className="bg-accent/5 border border-accent/20 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-text mb-2">
              Honest thought
            </h3>
            <p className="text-sm text-text-secondary leading-relaxed">
              {meta.real_talk}
            </p>
          </div>
        </section>
      )}

      {/* Next Week Preview */}
      {meta?.next_week_preview && (
        <section className="mb-8 animate-fade-in-up stagger-4" style={{ opacity: 0 }}>
          <div className="flex items-start gap-2 text-sm text-text-secondary">
            <ArrowRight size={16} className="text-text-tertiary flex-shrink-0 mt-0.5" />
            <p>
              <span className="font-medium text-text">Next up: </span>
              {meta.next_week_preview}
            </p>
          </div>
        </section>
      )}

      {/* Actions */}
      <div className="space-y-3 animate-fade-in-up stagger-4 pb-8" style={{ opacity: 0 }}>
        <Button onClick={handleAccept} loading={saving} fullWidth size="lg">
          Accept & Get going
        </Button>
        <Button
          variant="secondary"
          onClick={() => setTweakOpen(true)}
          fullWidth
          size="lg"
        >
          Tweak
        </Button>
      </div>

      {/* Tweak Modal */}
      <Modal open={tweakOpen} onClose={() => setTweakOpen(false)} title="Adjust your plan">
        <p className="text-sm text-text-secondary mb-4">
          How should we adjust?
        </p>
        <div className="space-y-3">
          <Button fullWidth onClick={() => handleTweak("less")}>
            Too much (reduce to 5)
          </Button>
          <Button fullWidth onClick={() => handleTweak("more")}>
            Too little (expand to 7+)
          </Button>
          <Button fullWidth onClick={() => handleTweak("focus")}>
            Wrong focus (change emphasis)
          </Button>
        </div>
        <div className="h-px bg-border my-4" />
        <Button variant="secondary" fullWidth onClick={() => setTweakOpen(false)}>
          Cancel
        </Button>
      </Modal>

      {/* Clarity Card Overlay */}
      {showClarityCard && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/40 animate-fade-in px-4">
          <div className="relative animate-scale-in">
            {/* Close button */}
            <button
              onClick={handleContinue}
              className="absolute -top-3 -right-3 z-10 w-8 h-8 bg-white rounded-full shadow-md flex items-center justify-center text-text-secondary hover:text-text transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>

            <ClarityCard
              ref={clarityCardRef}
              thoughtsCount={thoughtsCount}
              prioritiesCount={prioritiesCount}
              totalTasks={totalTasks}
              parkedCount={parkedCount}
              weekLabel={clarityWeekLabel}
              mode={plan.mode}
            />
          </div>

          <div className="flex gap-3 mt-6 animate-fade-in" style={{ animationDelay: "200ms" }}>
            <Button
              variant="secondary"
              onClick={handleShare}
              loading={sharing}
              size="sm"
            >
              {"share" in navigator ? (
                <><Share2 size={16} className="mr-2" />Share</>
              ) : (
                <><Download size={16} className="mr-2" />Save image</>
              )}
            </Button>
            <Button onClick={handleContinue} size="sm">
              Continue to plan
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function TaskReviewCard({ task, showContext }: { task: PlanTask; showContext?: boolean }) {
  const contextParts = task.context?.split(" | ").filter(Boolean) || [];
  const colors = getCategoryColors(task.category);

  return (
    <div
      className="bg-bg-card rounded-lg p-4 shadow-card hover:shadow-sm transition-all duration-200 border-l-[3px]"
      style={{ borderLeftColor: colors.border }}
    >
      <div className="flex items-center gap-2">
        <span
          className="w-4 h-4 flex-shrink-0 inline-block"
          style={{
            maskImage: `url(${colors.icon})`,
            maskSize: "contain",
            maskRepeat: "no-repeat",
            WebkitMaskImage: `url(${colors.icon})`,
            WebkitMaskSize: "contain",
            WebkitMaskRepeat: "no-repeat",
            backgroundColor: colors.border,
          }}
        />
        <p className="font-medium text-text flex-1">{task.title}</p>
        <span
          className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: colors.badge, color: colors.badgeText }}
        >
          {colors.label}
        </span>
      </div>
      {task.timeEstimate && (
        <div className="flex items-center gap-1.5 mt-1.5 ml-6">
          <img src="/icons/timer.svg" alt="" className="w-3 h-3 opacity-50" />
          <span className="text-xs text-text-secondary font-medium">{task.timeEstimate}</span>
        </div>
      )}
      {showContext && contextParts.length > 0 && (
        <p className="text-xs text-text-secondary mt-2 ml-6 leading-relaxed">
          {contextParts.join(" ")}
        </p>
      )}
    </div>
  );
}

function ParkedTaskCard({ task }: { task: PlanTask }) {
  const contextParts = task.context?.split(" | ").filter(Boolean) || [];
  const reason = contextParts[0] || null;
  const validation = contextParts[1] || null;
  const colors = getCategoryColors(task.category);

  return (
    <div
      className="pl-3 border-l-2"
      style={{ borderLeftColor: colors.border + "60" }}
    >
      <p className="text-sm text-text-secondary">
        {task.title}
        {task.category && (
          <span
            className="text-[10px] font-medium uppercase tracking-wide ml-1.5"
            style={{ color: colors.badgeText }}
          >
            {colors.label}
          </span>
        )}
      </p>
      {(reason || validation) && (
        <p className="text-xs text-text-tertiary mt-0.5 leading-relaxed">
          {reason}
          {validation && reason && " — "}
          {validation}
        </p>
      )}
    </div>
  );
}

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-GB", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}
