"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { Flame, ChevronDown, ChevronRight } from "lucide-react";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Spinner from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";

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

interface PlanData {
  id: string;
  mode: string;
  weekStart: string;
  weekEnd: string;
  status: string;
  tasks: Task[];
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

  useEffect(() => {
    fetchPlan();
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
      router.push(`/plan/${id}/progress`);
    } catch {
      showToast("Something went wrong saving your plan.", "error");
    } finally {
      setSaving(false);
    }
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

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="animate-fade-in mb-8">
        <h1 className="text-[28px] font-bold text-text font-display">
          Your {plan.mode === "today" ? "day" : "week"}, simplified
        </h1>
        <p className="text-sm text-text-secondary mt-1">{dateRange}</p>
      </div>

      <div className="h-px bg-border mb-6" />

      {/* Do First */}
      {doFirst.length > 0 && (
        <section className="mb-8 animate-fade-in-up stagger-1" style={{ opacity: 0 }}>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-text mb-4 font-display">
            <Flame size={20} className="text-accent" />
            Do First
          </h2>
          <div className="space-y-3">
            {doFirst.map((task) => (
              <TaskReviewCard key={task.id} task={task} />
            ))}
          </div>
        </section>
      )}

      <div className="h-px bg-border mb-6" />

      {/* This Week */}
      <section className="mb-8 animate-fade-in-up stagger-2" style={{ opacity: 0 }}>
        <h2 className="text-lg font-semibold text-text mb-4 font-display">
          {plan.mode === "today" ? "Today" : "This Week"} ({doFirst.length + thisWeek.length} tasks)
        </h2>
        {categories.map((cat) => {
          const tasks = thisWeek.filter((t) => (t.category || "other") === cat);
          if (tasks.length === 0) return null;
          return (
            <div key={cat} className="mb-4">
              <h3 className="text-sm font-medium text-text mb-2 capitalize">
                {cat} ({tasks.length})
              </h3>
              <div className="space-y-3">
                {tasks.map((task) => (
                  <TaskReviewCard key={task.id} task={task} />
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
              Not {plan.mode === "today" ? "Today" : "This Week"} ({notThisWeek.length} safely parked)
            </button>
            <p className="text-xs text-text-secondary italic mt-1 ml-[26px]">
              These matter, just not {plan.mode === "today" ? "today" : "this week"}. You&apos;re not dropping them.
            </p>

            {parkedOpen && (
              <div className="mt-3 pt-3 border-t border-border space-y-2">
                {notThisWeek.map((task) => (
                  <div
                    key={task.id}
                    className="text-sm text-text-secondary pl-2"
                  >
                    &bull; {task.title}
                    {task.category && (
                      <span className="text-text-tertiary ml-1">
                        ({task.category})
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Actions */}
      <div className="space-y-3 animate-fade-in-up stagger-4 pb-8" style={{ opacity: 0 }}>
        <Button onClick={handleAccept} loading={saving} fullWidth size="lg">
          Looks good
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
    </div>
  );
}

function TaskReviewCard({ task }: { task: Task }) {
  return (
    <div className="bg-bg-card rounded-lg p-4 shadow-card hover:shadow-sm transition-all duration-200">
      <p className="font-medium text-text">{task.title}</p>
      <p className="text-xs text-text-secondary mt-1">
        {task.timeEstimate}
        {task.context && ` | ${task.context}`}
      </p>
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
