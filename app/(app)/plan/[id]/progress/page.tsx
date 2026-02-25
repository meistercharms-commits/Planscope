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
} from "lucide-react";
import Button from "@/components/ui/Button";
import ProgressBar from "@/components/ui/ProgressBar";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/lib/useAuth";

interface Task {
  id: string;
  title: string;
  section: string;
  timeEstimate: string | null;
  effort: string | null;
  category: string | null;
  context: string | null;
  status: string;
}

interface PlanData {
  id: string;
  mode: string;
  weekStart: string;
  weekEnd: string;
  tasks: Task[];
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

  async function toggleTask(taskId: string, currentStatus: string) {
    if (!plan) return;

    const newStatus = currentStatus === "done" ? "pending" : "done";

    // Optimistic update
    const updatedPlan = {
      ...plan,
      tasks: plan.tasks.map((t) =>
        t.id === taskId ? { ...t, status: newStatus } : t
      ),
    };
    setPlan(updatedPlan);

    if (newStatus === "done") {
      // Calculate completion percentage
      const activeTasks = updatedPlan.tasks.filter((t) => t.section !== "not_this_week");
      const doneCount = activeTasks.filter((t) => t.status === "done").length;
      const totalActive = activeTasks.length;
      const completionPercent = totalActive > 0
        ? Math.round((doneCount / totalActive) * 100)
        : 0;

      // Show milestone celebration or regular message
      let msg = celebMessages[Math.floor(Math.random() * celebMessages.length)];

      if (completionPercent === 50) {
        msg = "Halfway there. Keep it going.";
      } else if (completionPercent === 75) {
        msg = "Nearly done. You're in the home stretch.";
      } else if (completionPercent === 100) {
        msg = "All done. Great work.";
      }

      showToast(msg);
    }

    try {
      await fetch(`/api/plans/${id}/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
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
            {plan.mode === "today" ? "Today" : "This Week"} ({doFirst.length + thisWeek.length} tasks)
          </h2>

          {categories.map((cat) => {
            const tasks = thisWeek.filter(
              (t) => (t.category || "other") === cat
            );
            if (tasks.length === 0) return null;
            return (
              <div key={cat} className="mb-4">
                <h3 className="text-sm font-medium text-text mb-2 capitalize">
                  {cat} ({tasks.length})
                </h3>
                <div className="space-y-2">
                  {tasks.map((task) => (
                    <TaskProgressCard
                      key={task.id}
                      task={task}
                      onToggle={() => toggleTask(task.id, task.status)}
                      hidden={hideDone && task.status === "done"}
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
        </div>
      </div>
    </div>
  );
}

function TaskProgressCard({
  task,
  onToggle,
  hidden,
}: {
  task: Task;
  onToggle: () => void;
  hidden: boolean;
}) {
  const isDone = task.status === "done";

  if (hidden) return null;

  return (
    <div
      className={`flex items-start gap-3 p-4 rounded-lg cursor-pointer transition-all duration-200 ${
        isDone
          ? "bg-bg-subtle opacity-60"
          : "bg-bg-card shadow-card hover:shadow-sm"
      }`}
      onClick={onToggle}
    >
      {/* Checkbox */}
      <div
        className={`w-5 h-5 rounded border flex-shrink-0 flex items-center justify-center mt-0.5 transition-all duration-200 ${
          isDone
            ? "bg-primary border-primary"
            : "border-border hover:border-primary/50"
        }`}
      >
        {isDone && (
          <Check size={14} className="text-white animate-checkmark" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p
          className={`font-medium text-sm transition-all duration-200 ${
            isDone ? "line-through text-text-secondary" : "text-text"
          }`}
        >
          {task.title}
        </p>
        {task.timeEstimate && (
          <p className="text-xs text-text-secondary mt-0.5">
            {task.timeEstimate}
            {task.context && ` | ${task.context}`}
          </p>
        )}
      </div>
    </div>
  );
}
