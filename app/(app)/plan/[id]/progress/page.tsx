"use client";

import { useEffect, useState, useRef, use } from "react";
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
  Target,
  Zap,
  Users,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import ProgressBar from "@/components/ui/ProgressBar";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/lib/useAuth";
import { getCategoryColors } from "@/lib/category-colors";
import { triggerCelebration, scheduleNudges, cancelNudges } from "@/lib/notifications";
import { SkeletonTaskCard } from "@/components/ui/Skeleton";
import { parseTimeEstimate } from "@/lib/parse-time-estimate";
import SharePlanModal from "@/components/plan/SharePlanModal";
import type { PlanTask } from "@/types";

interface PlanData {
  id: string;
  userId: string;
  mode: string;
  status: string;
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
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);

  // Compute "UP NEXT" task early so the auto-expand hook stays above early returns
  const nextTaskId = (() => {
    if (!plan) return null;
    const active = plan.tasks.filter((t) => t.section !== "not_this_week");
    const doneN = active.filter((t) => t.status === "done").length;
    if (doneN === 0) return null;
    const doFirstTasks = plan.tasks.filter((t) => t.section === "do_first");
    const thisWeekTasks = plan.tasks.filter((t) => t.section === "this_week");
    return [...doFirstTasks, ...thisWeekTasks].find((t) => t.status !== "done")?.id ?? null;
  })();

  useEffect(() => {
    fetchPlan();
    // Reset nudge timers when user opens their plan (re-schedules from now)
    cancelNudges(id).then(() => scheduleNudges(id)).catch((err) => console.error("[Progress] Nudge scheduling failed:", err));
  }, [id]);

  // Auto-expand the "UP NEXT" card after a completion
  useEffect(() => {
    if (nextTaskId && !expandedTaskId) {
      setExpandedTaskId(nextTaskId);
    }
  }, [nextTaskId]);

  async function fetchPlan() {
    try {
      const res = await fetch(`/api/plans/${id}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setPlan(data);
    } catch {
      showToast("Couldn't load this plan.", "error");
      router.push("/new-plan");
    } finally {
      setLoading(false);
    }
  }

  async function toggleTask(taskId: string, currentStatus: PlanTask["status"]) {
    if (!plan) return;

    const newStatus: PlanTask["status"] = currentStatus === "done" ? "pending" : "done";

    // Auto-collapse expanded card when marking done
    if (newStatus === "done" && expandedTaskId === taskId) {
      setExpandedTaskId(null);
    }

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

        if (completionPercent === 100) {
          msg = "All done. Great work.";
        } else if (totalActive - doneCount === 1) {
          msg = "Just one left. You\u2019ve got this.";
        } else if (completionPercent === 75) {
          msg = "Nearly done. You\u2019re in the home stretch.";
        } else if (completionPercent === 50) {
          msg = "Halfway there. Keep it going.";
        } else if (completionPercent >= 25 && Math.round(((doneCount - 1) / totalActive) * 100) < 25) {
          msg = "Quarter of the way. Nice pace.";
        } else if (doneCount === 1) {
          msg = "First one done. You\u2019re on your way.";
        }

        showToast(msg, "success", {
          label: "Undo",
          onClick: () => toggleTask(taskId, "done"),
        });
        triggerCelebration(doneCount, totalActive).catch((err) => console.error("[Progress] Celebration failed:", err));
      }
    } catch {
      // Revert on error
      setPlan((prev) =>
        prev
          ? {
              ...prev,
              tasks: prev.tasks.map((t) =>
                t.id === taskId ? { ...t, status: currentStatus } : t
              ),
            }
          : prev
      );
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
        setPlan((prev) =>
          prev
            ? {
                ...prev,
                tasks: prev.tasks.map((t) =>
                  t.id === taskId ? { ...t, section: "not_this_week" } : t
                ),
              }
            : prev
        );
        showToast("Your plan is full. Pick what matters.");
        return;
      }

      if (res.ok) {
        showToast("Moved to this week");
      }
    } catch {
      // Revert
      setPlan((prev) =>
        prev
          ? {
              ...prev,
              tasks: prev.tasks.map((t) =>
                t.id === taskId ? { ...t, section: "not_this_week" } : t
              ),
            }
          : prev
      );
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
  const [showArchiveModal, setShowArchiveModal] = useState(false);

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
      <div className="max-w-2xl lg:max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <div className="space-y-3">
          <SkeletonTaskCard />
          <SkeletonTaskCard />
          <SkeletonTaskCard />
          <SkeletonTaskCard />
        </div>
      </div>
    );
  }

  if (!plan) return null;

  const isOwner = user ? plan.userId === user.id : false;
  const isArchived = plan.status === "archived" || plan.status === "completed";

  const activeTasks = plan.tasks.filter(
    (t) => t.section !== "not_this_week"
  );
  const doneCount = activeTasks.filter((t) => t.status === "done").length;
  const totalActive = activeTasks.length;
  const overallPercent = totalActive > 0 ? Math.round((doneCount / totalActive) * 100) : 0;

  const encouragement =
    overallPercent === 0
      ? null
      : overallPercent === 100
        ? "All done. Take a breath."
        : overallPercent >= 75
          ? "Nearly there. Finish strong."
          : overallPercent >= 50
            ? "Over halfway. The end is in sight."
            : overallPercent >= 25
              ? "Solid progress. Keep going."
              : "You\u2019ve started. That\u2019s the hardest part.";

  const doFirst = plan.tasks.filter((t) => t.section === "do_first");
  const thisWeek = plan.tasks.filter((t) => t.section === "this_week");
  const notThisWeek = plan.tasks.filter((t) => t.section === "not_this_week");

  const categories = Array.from(
    new Set(thisWeek.map((t) => t.category || "other"))
  );

  const weekStart = new Date(plan.weekStart);

  // nextTaskId is computed above early returns (for hooks safety)

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
        @keyframes checkboxPop {
          0% { transform: scale(1); }
          50% { transform: scale(1.3); }
          100% { transform: scale(1); }
        }
        .animate-checkbox-pop {
          animation: checkboxPop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        @keyframes nextPulse {
          0%, 100% { border-left-color: var(--pulse-color); }
          50% { border-left-color: var(--pulse-color-dim); }
        }
        .animate-next-pulse {
          animation: nextPulse 2s ease-in-out infinite;
        }
        @keyframes expandFadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-expand-fade-in {
          animation: expandFadeIn 0.2s ease-out 0.15s both;
        }
        @keyframes cardCompletionFlash {
          0% { background-color: var(--flash-color); }
          100% { background-color: transparent; }
        }
        .animate-completion-flash {
          animation: cardCompletionFlash 0.6s ease-out forwards;
        }
        @keyframes strikethroughReveal {
          from { text-decoration-color: transparent; }
          to { text-decoration-color: currentColor; }
        }
        .animate-strikethrough {
          text-decoration: line-through;
          text-decoration-color: transparent;
          animation: strikethroughReveal 0.4s ease-out 0.15s forwards;
        }
      `}</style>
      {/* Progress Bar */}
      <ProgressBar done={doneCount} total={totalActive} />
      {encouragement && (
        <div className="max-w-2xl lg:max-w-3xl mx-auto px-4 sm:px-6">
          <p className="text-xs text-text-secondary text-center pt-2 italic">
            {encouragement}
          </p>
        </div>
      )}
      {overallPercent === 100 && !isArchived && isOwner && (
        <div className="max-w-2xl lg:max-w-3xl mx-auto px-4 sm:px-6 pt-4">
          <Link
            href="/new-plan"
            className="block text-center text-sm font-medium text-primary hover:text-primary/80 transition-colors"
          >
            Ready for a fresh plan? Start a new one →
          </Link>
        </div>
      )}

      <div className="max-w-2xl lg:max-w-3xl mx-auto px-4 sm:px-6 py-8">
        {/* Archived banner */}
        {isArchived && (
          <div className="bg-bg-subtle rounded-lg p-3 mb-4 text-center">
            <p className="text-sm text-text-secondary">
              This plan has been archived. You&apos;re viewing a snapshot.
            </p>
          </div>
        )}

        {/* Plan Header */}
        <div className="mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-[28px] font-bold text-text font-display">
                {plan.mode === "today"
                  ? "Today"
                  : `Week of ${weekStart.toLocaleDateString("en-GB", { month: "short", day: "numeric" })}`}
              </h1>
              <p className="text-sm text-text-secondary mt-1">
                {totalActive} {totalActive === 1 ? "task" : "tasks"}
              </p>
            </div>
            {user && user.tier === "pro_plus" && plan.userId === user.id && !isArchived && (
              <button
                onClick={() => setShowShareModal(true)}
                className="p-2 text-text-secondary hover:text-primary hover:bg-primary/5 rounded-lg transition-colors cursor-pointer"
                aria-label="Share plan"
              >
                <Users size={20} />
              </button>
            )}
          </div>
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
                  isNext={task.id === nextTaskId}
                  expanded={expandedTaskId === task.id}
                  onToggleExpand={() => setExpandedTaskId((prev) => prev === task.id ? null : task.id)}
                  isArchived={isArchived}
                  dimmed={expandedTaskId !== null && expandedTaskId !== task.id}
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
                      isNext={task.id === nextTaskId}
                      expanded={expandedTaskId === task.id}
                      onToggleExpand={() => setExpandedTaskId((prev) => prev === task.id ? null : task.id)}
                      isArchived={isArchived}
                      dimmed={expandedTaskId !== null && expandedTaskId !== task.id}
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
                      className="text-sm text-text-secondary pl-2 break-words"
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

        {/* Action Buttons — hidden for archived plans */}
        {!isArchived && <div className="space-y-3 pt-4 pb-8">
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
                  aria-label="New task title"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="What needs doing?"
                  maxLength={500}
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

          {/* Archive plan — owner only */}
          {isOwner && (
            <div className="pt-4 border-t border-border">
              <button
                onClick={() => setShowArchiveModal(true)}
                className="w-full flex items-center justify-center gap-2 py-3 text-sm text-text-secondary hover:text-text transition-colors cursor-pointer"
              >
                <Archive size={16} />
                Archive this plan
              </button>
              <p className="text-xs text-text-tertiary text-center mt-1">
                Moves this plan to your history so you can start fresh.
              </p>
            </div>
          )}
        </div>}

      {/* Archive confirmation modal */}
      <Modal
        open={showArchiveModal}
        onClose={() => setShowArchiveModal(false)}
        title="Archive this plan?"
      >
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">
            This will move your plan to history. You can still view it there, but
            you won&apos;t be able to make changes.
          </p>
          <div className="flex gap-2">
            <Button
              onClick={() => {
                setShowArchiveModal(false);
                archivePlan();
              }}
              loading={archiving}
            >
              Archive
            </Button>
            <Button
              variant="ghost"
              onClick={() => setShowArchiveModal(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>

      {/* Share modal */}
      <SharePlanModal
        open={showShareModal}
        onClose={() => setShowShareModal(false)}
        planId={id}
      />
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
  isNext,
  expanded,
  onToggleExpand,
  isArchived,
  dimmed,
}: {
  task: PlanTask;
  onToggle: () => void;
  hidden: boolean;
  planId: string;
  userTier?: string;
  isNext?: boolean;
  expanded: boolean;
  onToggleExpand: () => void;
  isArchived?: boolean;
  dimmed?: boolean;
}) {
  const isDone = task.status === "done";
  const isDimmed = !isArchived && !isDone && dimmed && !expanded;
  const colors = getCategoryColors(task.category);
  const [hovered, setHovered] = useState(false);
  const [popKey, setPopKey] = useState(0);

  // Detect when a task transitions to done for animation
  const [justCompleted, setJustCompleted] = useState(false);
  const prevDoneRef = useRef(isDone);
  useEffect(() => {
    if (isDone && !prevDoneRef.current) {
      setJustCompleted(true);
      const timer = setTimeout(() => setJustCompleted(false), 600);
      return () => clearTimeout(timer);
    }
    prevDoneRef.current = isDone;
  }, [isDone]);

  const isQuickWin = !isDone && task.timeEstimate !== null && parseTimeEstimate(task.timeEstimate) <= 300;

  if (hidden) return null;

  return (
    <div
      className={`rounded-lg transition-all duration-300 border-l-[3px] ${
        isArchived ? "" : "cursor-pointer"
      } ${
        isDone
          ? `bg-bg-subtle opacity-60${justCompleted ? " animate-completion-flash" : ""}`
          : isDimmed
            ? "opacity-40"
            : isNext && !isArchived
              ? "bg-bg-card shadow-md animate-next-pulse"
              : "bg-bg-card shadow-card"
      }`}
      style={{
        borderLeftColor: isDone ? colors.border + "80" : colors.border,
        backgroundColor: !isDone && !isArchived && hovered ? colors.hoverBg : undefined,
        ...(justCompleted ? { "--flash-color": colors.border + "26" } as React.CSSProperties : {}),
        ...(isNext && !isDone && !isArchived ? {
          "--pulse-color": colors.border,
          "--pulse-color-dim": colors.border + "40",
        } as React.CSSProperties : {}),
      }}
      onClick={isArchived ? undefined : (isDone ? onToggle : onToggleExpand)}
      onMouseEnter={() => !isArchived && setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Always-visible row: checkbox, icon, title, badge, expand indicator */}
      <div className="flex items-start gap-3 p-4">
        {/* Checkbox — larger touch target, stops propagation */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (isArchived) return;
            if (!isDone) setPopKey((k) => k + 1);
            onToggle();
          }}
          className={`flex-shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center -ml-2 -my-2 ${isArchived ? "" : "cursor-pointer"}`}
          aria-label={isDone ? `Mark "${task.title}" as not done` : `Mark "${task.title}" as done`}
          disabled={isArchived}
        >
          <div
            key={popKey}
            className={`w-5 h-5 rounded border flex items-center justify-center transition-all duration-200 ${
              isDone
                ? "border-transparent animate-checkbox-pop"
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
        </button>

        {/* Title row */}
        <div className="flex-1 min-w-0">
          {/* Badges row — above title */}
          {!isDone && (
            <div className="flex items-center gap-1.5 mb-1">
              <span
                className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-full"
                style={{ backgroundColor: colors.badge, color: colors.badgeText }}
              >
                {colors.label}
              </span>
              {isQuickWin && (
                <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-accent/10 text-accent">
                  <Zap size={10} className="fill-current" />
                  Quick win
                </span>
              )}
            </div>
          )}
          {/* Icon + title row */}
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
            <div className="flex-1">
              {isNext && !isDone && !isArchived && (
                <span
                  className="block text-[9px] font-bold uppercase tracking-widest mb-0.5"
                  style={{ color: colors.border }}
                >
                  Up next
                </span>
              )}
              <p
                className={`font-medium text-sm transition-all duration-200 break-words line-clamp-2 ${
                  isDone
                    ? justCompleted
                      ? "animate-strikethrough text-text-secondary"
                      : "line-through text-text-secondary"
                    : "text-text"
                }`}
              >
                {task.title}
              </p>
            </div>
          </div>
        </div>

        {/* Expand/collapse indicator for pending tasks */}
        {!isDone && !isArchived && (
          <ChevronDown
            size={16}
            className={`flex-shrink-0 self-center text-text-tertiary transition-transform duration-300 ${
              expanded ? "rotate-180" : ""
            }`}
          />
        )}
      </div>

      {/* Expandable detail area — context, time, Focus Mode button */}
      {!isDone && !isArchived && (
        <div
          className="grid transition-[grid-template-rows] duration-300 ease-out"
          style={{ gridTemplateRows: expanded ? "1fr" : "0fr" }}
        >
          <div className="overflow-hidden">
            <div className="px-4 pb-4 ml-8">
              {task.context && (
                <p className="text-xs text-text-secondary">
                  {task.context.replace(/\s*[·|]\s*/g, ". ")}
                </p>
              )}
              {task.timeEstimate && (
                <div className="flex items-center gap-1 mt-1.5">
                  <img src="/icons/timer.svg" alt="" className="w-3 h-3 opacity-40" />
                  <span className="text-xs text-text-secondary">
                    {task.timeEstimate}
                  </span>
                </div>
              )}
              <Link
                href={`/plan/${planId}/focus/${task.id}`}
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-2 mt-3 px-5 py-3 rounded-lg text-sm font-semibold text-white transition-all duration-200 hover:opacity-90 active:scale-[0.97] animate-expand-fade-in"
                style={{ backgroundColor: colors.border }}
              >
                <Target size={16} />
                Focus mode
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
