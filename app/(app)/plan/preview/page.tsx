"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  MessageCircle,
  ArrowRight,
  Bookmark,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Spinner from "@/components/ui/Spinner";
import { getCategoryColors } from "@/lib/category-colors";

interface Task {
  id: string;
  title: string;
  section: string;
  timeEstimate: string | null;
  effort: string | null;
  urgency: string | null;
  category: string | null;
  context: string | null;
}

interface PlanMeta {
  headline: string;
  burnout_alert: string | null;
  reality_check: string;
  real_talk: string | null;
  next_week_preview: string;
}

interface PreviewPlan {
  mode: string;
  weekStart: string;
  weekEnd: string;
  status: string;
  planMeta: string | null;
  tasks: Task[];
}

export default function PlanPreviewPage() {
  const router = useRouter();
  const [plan, setPlan] = useState<PreviewPlan | null>(null);
  const [parkedOpen, setParkedOpen] = useState(true);
  const [tweakOpen, setTweakOpen] = useState(false);
  const [signupPrompt, setSignupPrompt] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem("planscope_preview");
    if (!stored) {
      router.push("/new-plan");
      return;
    }
    try {
      setPlan(JSON.parse(stored));
    } catch {
      router.push("/new-plan");
    }
  }, [router]);

  if (!plan) return <Spinner />;

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
  const activeTasks = plan.tasks.filter((t) => t.section !== "not_this_week");

  const categories = Array.from(
    new Set(thisWeek.map((t) => t.category || "other"))
  );

  const weekStart = new Date(plan.weekStart);
  const weekEnd = new Date(plan.weekEnd);
  const dateRange = `${formatDate(weekStart)} \u2013 ${formatDate(weekEnd)}`;

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
        <p className="text-sm text-text-secondary mt-1">
          {activeTasks.length} {activeTasks.length === 1 ? "task" : "tasks"}
        </p>
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
              <TaskPreviewCard
                key={task.id}
                task={task}
                onFocusClick={() => setSignupPrompt(true)}
              />
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
                  <TaskPreviewCard
                    key={task.id}
                    task={task}
                    onFocusClick={() => setSignupPrompt(true)}
                  />
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
                  <ParkedPreviewCard key={task.id} task={task} />
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

      {/* Real Talk */}
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

      {/* Save CTA */}
      <div className="animate-fade-in-up stagger-4 mb-6" style={{ opacity: 0 }}>
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Bookmark size={20} className="text-primary flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-text">
                Want to keep this plan?
              </p>
              <p className="text-xs text-text-secondary mt-0.5 mb-3">
                Create a free account so you can track progress, use focus mode, and get personalised recommendations.
              </p>
              <Link
                href="/signup"
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary/90 transition-colors"
              >
                Save my plans
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-3 animate-fade-in-up stagger-4 pb-8" style={{ opacity: 0 }}>
        <Button onClick={() => router.push("/signup")} fullWidth size="lg">
          Accept &amp; Get going
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
          Sign up to tweak and regenerate your plan.
        </p>
        <div className="space-y-3">
          <Link
            href="/signup"
            className="block w-full px-4 py-3 text-center text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors"
          >
            Sign up free
          </Link>
          <Button
            variant="secondary"
            fullWidth
            onClick={() => {
              setTweakOpen(false);
              router.push("/new-plan");
            }}
          >
            Start over instead
          </Button>
        </div>
        <div className="h-px bg-border my-4" />
        <Button variant="secondary" fullWidth onClick={() => setTweakOpen(false)}>
          Cancel
        </Button>
      </Modal>

      {/* Focus signup prompt modal */}
      <Modal open={signupPrompt} onClose={() => setSignupPrompt(false)} title="Focus mode">
        <p className="text-sm text-text-secondary mb-4">
          Sign up to use focus mode, track your progress, and save your plan.
        </p>
        <div className="space-y-3">
          <Link
            href="/signup"
            className="block w-full px-4 py-3 text-center text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors"
          >
            Sign up free
          </Link>
        </div>
        <div className="h-px bg-border my-4" />
        <Button variant="secondary" fullWidth onClick={() => setSignupPrompt(false)}>
          Cancel
        </Button>
      </Modal>
    </div>
  );
}

function TaskPreviewCard({
  task,
  onFocusClick,
}: {
  task: Task;
  onFocusClick: () => void;
}) {
  const colors = getCategoryColors(task.category);
  const contextParts = task.context?.split(" | ").filter(Boolean) || [];

  return (
    <div
      className="flex items-start gap-3 bg-bg-card rounded-lg p-4 shadow-card hover:shadow-sm transition-all duration-200 border-l-[3px]"
      style={{ borderLeftColor: colors.border }}
    >
      <div className="flex-1 min-w-0">
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
        {contextParts.length > 0 && (
          <p className="text-xs text-text-secondary mt-2 ml-6 leading-relaxed">
            {contextParts.join(" ")}
          </p>
        )}
      </div>

      {/* Focus mode chevron */}
      <button
        onClick={onFocusClick}
        className="flex-shrink-0 self-center p-2 -mr-2 text-text-tertiary hover:text-primary transition-colors cursor-pointer"
        aria-label={`Focus on ${task.title}`}
      >
        <ChevronRight size={18} />
      </button>
    </div>
  );
}

function ParkedPreviewCard({ task }: { task: Task }) {
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
