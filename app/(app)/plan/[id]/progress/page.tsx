"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ChevronDown,
  ChevronRight,
  Check,
  Plus,
  EyeOff,
  Eye,
  Bookmark,
  Archive,
} from "lucide-react";
import Button from "@/components/ui/Button";
import ProgressBar from "@/components/ui/ProgressBar";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/lib/useAuth";
import { getCategoryColors } from "@/lib/category-colors";
import { triggerCelebration, scheduleNudges, cancelNudges } from "@/lib/notifications";
import type { PlanTask } from "@/types";

interface PlanData {
  id: string;
  mode: string;
  weekStart: string;
  weekEnd: string;
  tasks: PlanTask[];
}

const celebMessages = [
  "Nice, that's one more off your plate.",
  "One less thing to carry.",
  "Steady progress.",
  "That's handled.",
  "Cleared.",
  "Moving forward.",
];

export default function PlanProgressPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { showToast } = useToast();
  const { user } = useAuth();
  const isAnon = !user;
  const [plan, setPlan] = useState<PlanData | null>(null);
  const [loading, setLoading] = useState(true);
  const [parkedOpen, setParkedOpen] = useState(true);
  const [hideDone, setHideDone] = useState(false);
  const [addingTask, setAddingTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");

  useEffect(() => {
    fetchPlan();
    // Reset nudge timers when user opens their plan (re-schedules from now)
    cancelNudges(id).then(() => scheduleNudges(id)).catch((err) => console.error("[Progress] Nudge scheduling failed:", err));
  }, [id]);

  async function fetchPlan() {
    try {
      const res = await fetch(`/api/plans/${id}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setPlan(data);
    } catch {
      router.push("/new-plan");
    } finally {
      setLoading(false);
    }
  }

  async function toggleTask(taskId: string, currentStatus: PlanTask["status"]) {
    if (!plan) return;

    const newStatus: PlanTask["status"] = currentStatus === "done" ? "pending" : "done";

    // Optimistic update
    const updatedPlan = {
      ...plan,
      tasks: plan.tasks.map((t) =>
        t.id === taskId ? { ...t, status: newStatus } : t
      ),
    };
    setPlan(updatedPlan);

    try {
      await fetch(`/api/plans/${id}/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      // Celebrate only after server confirms
      if (newStatus === "done") {
        const activeTasks = updatedPlan.tasks.filter((t) => t.section !== "not_this_week");
        const doneCount = activeTasks.filter((t) => t.status === "done").length;
        const totalActive = activeTasks.length;
        const completionPercent = totalActive > 0
          ? Math.round((doneCount / totalActive) * 100)
          : 0;

        let msg = celebMessages[Math.floor(Math.random() * celebMessages.length)];

        if (completionPercent === 50) {
          msg = "Halfway there. Keep it going.";
        } else if (completionPercent === 75) {
          msg = "Nearly done. You're in the home stretch.";
        } else if (completionPercent === 100) {
          msg = "All done. Great work.";
        }

        showToast(msg);
        triggerCelebration(doneCount, totalActive).catch((err) => console.error("[Progress] Celebration failed:", err));
      }
    } catch {
      // Revert on error
      setPlan({
        ...plan,
        tasks: plan.tasks.map((t) =>
          t.id === taskId ? { ...t, status: currentStatus } : t
        ),
      });
      showToast("Couldn't save that change. Try again.", "error");
    }
  }

  async function promoteParkedTask(taskId: string) {
    if (!plan) return;

    const task = plan.tasks.find((t) => t.id === taskId);
    if (!task) return;

    // Optimistic update
    setPlan({
      ...plan,
      tasks: plan.tasks.map((t) =>
        t.id === taskId ? { ...t, section: "this_week" } : t
      ),
    });
    setAddingTask(false);

    try {
      const res = await fetch(`/api/plans/${id}/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section: "this_week" }),
      });

      if (res.status === 403) {
        // Revert
        setPlan({
          ...plan,
          tasks: plan.tasks.map((t) =>
            t.id === taskId ? { ...t, section: "not_this_week" } : t
          ),
        });
        showToast("Your plan is full. Pick what matters.");
        return;
      }

      if (res.ok) {
        showToast("Moved to this week");
      }
    } catch {
      // Revert
      setPlan({
        ...plan,
        tasks: plan.tasks.map((t) =>
          t.id === taskId ? { ...t, section: "not_this_week" } : t
        ),
      });
      showToast("Couldn't move task. Try again.", "error");
    }
  }

  async function addTask() {
    if (!newTaskTitle.trim() || !plan) return;

    // Client-side pre-check
    const activeCount = plan.tasks.filter(
      (t) => t.section !== "not_this_week"
    ).length;
    if (activeCount >= 7) {
      showToast("Your plan is full. Pick what matters.");
      setAddingTask(false);
      setNewTaskTitle("");
      return;
    }

    try {
      const res = await fetch(`/api/plans/${id}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTaskTitle.trim() }),
      });

      if (res.status === 403) {
        const data = await res.json();
        showToast(data.error || "Your plan is full. Pick what matters.");
        setAddingTask(false);
        setNewTaskTitle("");
        return;
      }

      if (res.ok) {
        const task = await res.json();
        setPlan({ ...plan, tasks: [...plan.tasks, task] });
        setNewTaskTitle("");
        setAddingTask(false);
        showToast("Task added");
      }
    } catch {
      showToast("Couldn't add task. Try again.", "error");
    }
  }

  const [archiving, setArchiving] = useState(false);

  async function archivePlan() {
    if (!plan || archiving) return;
    setArchiving(true);
    try {
      const res = await fetch(`/api/plans/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "archived" }),
      });
      if (res.ok) {
        showToast("Plan archived");
        router.push("/dashboard");
      } else {
        showToast("Couldn't archive plan. Try again.", "error");
        setArchiving(false);
      }
    } catch {
      showToast("Couldn't archive plan. Try again.", "error");
      setArchiving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-lg text-text-secondary">Loading your plan...</div>
      </div>
    );
  }

  if (!plan) return null;

  const activeTasks = plan.tasks.filter(
    (t) => t.section !== "not_this_week"
  );
  const doneCount = activeTasks.filter((t) => t.status === "done").length;
  const totalActive = activeTasks.length;

  const doFirst = plan.tasks.filter((t) => t.section === "do_first");
  const thisWeek = plan.tasks.filter((t) => t.section === "this_week");
  const notThisWeek = plan.tasks.filter((t) => t.section === "not_this_week");

  const categories = Array.from(
    new Set(thisWeek.map((t) => t.category || "other"))
  );

  const weekStart = new Date(plan.weekStart);

  return (
    <div>
      <style>{`
        @keyframes checkScaleAnimation {
          0% { transform: scale(0.5); opacity: 0; }
          50% { transform: scale(1.2); }
          100% { transform: scale(1); opacity: 1; }
        }
        .animate-checkmark {
          animation: checkScaleAnimation 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        @keyframes slideOutLeft {
          0% { opacity: 1; transform: translateX(0); }
          100% { opacity: 0; transform: translateX(-100px); }
        }
        .animate-task-complete {
          animation: slideOutLeft 0.5s ease-out forwards;
        }
      `}</style>
      {/* Progress Bar */}
      <ProgressBar done={doneCount} total={totalActive} />

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6">
        {/* Plan Header */}
        <div className="mb-6">
          <h1 className="text-[28px] font-bold text-text font-display">
            {plan.mode === "today"
              ? "Today"
              : `Week of ${weekStart.toLocaleDateString("en-GB", { month: "short", day: "numeric" })}`}
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            {totalActive} {totalActive === 1 ? "task" : "tasks"}
          </p>
        </div>

        {/* Do First */}
        {doFirst.length > 0 && (
          <section className="mb-6">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-text mb-3 font-display">
              <img src="/icons/do_first.svg" alt="" className="w-5 h-5" />
              Do First
            </h2>
            <div className="space-y-2">
              {doFirst.map((task) => (
                <TaskProgressCard
                  key={task.id}
                  task={task}
                  onToggle={() => toggleTask(task.id, task.status)}
                  hidden={hideDone && task.status === "done"}
                  planId={id}
                  userTier={user?.tier}
                />
              ))}
            </div>
          </section>
        )}

        <div className="h-px bg-border mb-6" />

        {/* This Week */}
        <section className="mb-6">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-text mb-3 font-display">
            <img src={`/icons/${plan.mode === "today" ? "timer" : "this_week"}.svg`} alt="" className="w-5 h-5" />
            {plan.mode === "today" ? "Today" : "This Week"}
          </h2>

          {categories.map((cat) => {
            const tasks = thisWeek.filter(
              (t) => (t.category || "other") === cat
            );
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
                <div className="space-y-2">
                  {tasks.map((task) => (
                    <TaskProgressCard
                      key={task.id}
                      task={task}
                      onToggle={() => toggleTask(task.id, task.status)}
                      hidden={hideDone && task.status === "done"}
                      planId={id}
                      userTier={user?.tier}
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
          <section className="mb-6">
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
                <div className="mt-3 pt-3 border-t border-border space-y-2">
                  {notThisWeek.map((task) => (
                    <div
                      key={task.id}
                      className="text-sm text-text-secondary pl-2"
                    >
                      &bull; {task.title}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {/* Save CTA for anonymous users */}
        {isAnon && (
          <div className="bg-primary-light rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <Bookmark size={20} className="text-primary flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-text">
                  Want to keep your plans?
                </p>
                <p className="text-xs text-text-secondary mt-0.5 mb-3">
                  Create a free account so your progress is saved across sessions.
                </p>
                <Link
                  href="/signup"
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary-dark transition-colors"
                >
                  Save my plans
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3 pt-4 pb-8">
          <Button
            variant="secondary"
            fullWidth
            onClick={() => setHideDone(!hideDone)}
          >
            {hideDone ? (
              <>
                <Eye size={16} className="mr-2" /> Show done
              </>
            ) : (
              <>
                <EyeOff size={16} className="mr-2" /> Collapse done
              </>
            )}
          </Button>

          {addingTask ? (
            <div className="space-y-3">
              {/* Show parked items to promote first */}
              {notThisWeek.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-text-secondary mb-2">
                    Pick from parked
                  </p>
                  <div className="space-y-2">
                    {notThisWeek.map((task) => (
                      <button
                        key={task.id}
                        onClick={() => promoteParkedTask(task.id)}
                        className="w-full flex items-center gap-3 p-3 rounded-lg bg-bg-card border border-border/60 shadow-sm hover:border-primary/40 hover:shadow transition-all text-left cursor-pointer"
                      >
                        <Plus size={16} className="text-primary flex-shrink-0" />
                        <span className="text-sm text-text">{task.title}</span>
                      </button>
                    ))}
                  </div>
                  <div className="relative my-3">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-border" />
                    </div>
                    <div className="relative flex justify-center">
                      <span className="bg-bg px-3 text-xs text-text-tertiary">or add new</span>
                    </div>
                  </div>
                </div>
              )}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="What needs doing?"
                  className="flex-1 px-4 py-3 border border-transparent rounded-lg text-base bg-bg-subtle transition-all duration-200 focus:outline-none focus:bg-bg-card focus:border-border focus:ring-2 focus:ring-primary-light focus:shadow-sm"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") addTask();
                    if (e.key === "Escape") {
                      setAddingTask(false);
                      setNewTaskTitle("");
                    }
                  }}
                  autoFocus={notThisWeek.length === 0}
                />
                <Button onClick={addTask} disabled={!newTaskTitle.trim()}>
                  Add
                </Button>
              </div>
            </div>
          ) : totalActive >= 7 ? (
            <div className="text-center py-3">
              <p className="text-sm text-text-secondary font-medium">
                7 items. That&apos;s real.
              </p>
              <p className="text-xs text-text-secondary mt-1">
                Park or complete a task to add a new one.
              </p>
            </div>
          ) : (
            <Button
              variant="secondary"
              fullWidth
              onClick={() => setAddingTask(true)}
            >
              <Plus size={16} className="mr-2" /> Add task ({7 - totalActive} slots left)
            </Button>
          )}

          {/* Archive plan */}
          <div className="pt-4 border-t border-border">
            <button
              onClick={archivePlan}
              disabled={archiving}
              className="w-full flex items-center justify-center gap-2 py-3 text-sm text-text-secondary hover:text-text transition-colors cursor-pointer disabled:opacity-50"
            >
              <Archive size={16} />
              {archiving ? "Archiving..." : "Archive this plan"}
            </button>
            <p className="text-xs text-text-tertiary text-center mt-1">
              Moves this plan to your history so you can start fresh.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function TaskProgressCard({
  task,
  onToggle,
  hidden,
  planId,
  userTier,
}: {
  task: PlanTask;
  onToggle: () => void;
  hidden: boolean;
  planId: string;
  userTier?: string;
}) {
  const isDone = task.status === "done";
  const colors = getCategoryColors(task.category);
  const [hovered, setHovered] = useState(false);

  if (hidden) return null;

  return (
    <div
      className={`flex items-start gap-3 p-4 rounded-lg cursor-pointer transition-all duration-200 border-l-[3px] ${
        isDone
          ? "bg-bg-subtle opacity-60"
          : "bg-bg-card shadow-card"
      }`}
      style={{
        borderLeftColor: isDone ? colors.border + "80" : colors.border,
        backgroundColor: !isDone && hovered ? colors.hoverBg : undefined,
      }}
      onClick={onToggle}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Checkbox — category-coloured when done */}
      <div
        className={`w-5 h-5 rounded border flex-shrink-0 flex items-center justify-center mt-0.5 transition-all duration-200 ${
          isDone
            ? "border-transparent"
            : "border-border hover:border-primary/50"
        }`}
        style={
          isDone
            ? { backgroundColor: colors.checkboxDone, borderColor: colors.checkboxDone }
            : undefined
        }
      >
        {isDone && (
          <Check size={14} className="text-white animate-checkmark" />
        )}
      </div>

      {/* Content */}
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
              backgroundColor: isDone ? colors.border + "80" : colors.border,
            }}
          />
          <p
            className={`font-medium text-sm transition-all duration-200 flex-1 ${
              isDone ? "line-through text-text-secondary" : "text-text"
            }`}
          >
            {task.title}
          </p>
          {!isDone && (
            <span
              className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: colors.badge, color: colors.badgeText }}
            >
              {colors.label}
            </span>
          )}
        </div>
        {task.context && (
          <p className="text-xs text-text-secondary mt-1 ml-6">
            {task.context.replace(/\s*[·|]\s*/g, ". ")}
          </p>
        )}
        {task.timeEstimate && (
          <div className="flex items-center gap-1 mt-1.5 ml-6">
            <img src="/icons/timer.svg" alt="" className="w-3 h-3 opacity-40" />
            <span className="text-xs text-text-secondary">
              {task.timeEstimate}
            </span>
          </div>
        )}
      </div>

      {/* Focus mode chevron — all users, pending tasks only */}
      {!isDone && (
        <Link
          href={`/plan/${planId}/focus/${task.id}`}
          onClick={(e) => e.stopPropagation()}
          className="flex-shrink-0 self-center p-2 -mr-2 text-text-tertiary hover:text-primary transition-colors"
          aria-label={`Focus on ${task.title}`}
        >
          <ChevronRight size={18} />
        </Link>
      )}
    </div>
  );
}
