"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Pause, Play, Check, Timer } from "lucide-react";
import Button from "@/components/ui/Button";
import { SkeletonText, SkeletonCircle } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/lib/useAuth";
import { useFocusTimer } from "@/lib/focus-timer-context";
import { getCategoryColors } from "@/lib/category-colors";
import { parseTimeEstimate, formatTime } from "@/lib/parse-time-estimate";
import { scheduleFocusTimer, cancelFocusTimer } from "@/lib/notifications";
import type { PlanTask } from "@/types";

const TIME_OPTIONS = [5, 10, 15, 20, 25, 30, 45, 60];

export default function FocusModePage({
  params,
}: {
  params: Promise<{ id: string; taskId: string }>;
}) {
  const { id, taskId } = use(params);
  const router = useRouter();
  const { showToast } = useToast();
  const { user } = useAuth();
  const focusTimer = useFocusTimer();

  const [task, setTask] = useState<PlanTask | null>(null);
  const [loading, setLoading] = useState(true);
  const [presetMinutes, setPresetMinutes] = useState(0);
  const [selectedMinutes, setSelectedMinutes] = useState(0);
  const [markingDone, setMarkingDone] = useState(false);
  const [showSwitchPrompt, setShowSwitchPrompt] = useState(false);

  const isFree = !user || user.tier === "free";

  // Derive timer state from context
  const isThisTask = focusTimer.timer?.taskId === taskId;
  const hasStarted = isThisTask && !!focusTimer.timer;
  const timeLeft = isThisTask ? focusTimer.timeLeft : selectedMinutes * 60;
  const totalTime = isThisTask ? focusTimer.timer!.totalTime : selectedMinutes * 60;
  const isRunning = isThisTask && focusTimer.isRunning;
  const isComplete = isThisTask && focusTimer.isComplete;

  // Fetch task data
  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(`/api/plans/${id}`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        const foundTask = data.tasks.find((t: PlanTask) => t.id === taskId);

        if (!foundTask || foundTask.status === "done") {
          router.push(`/plan/${id}/progress`);
          return;
        }

        setTask(foundTask);
        const seconds = parseTimeEstimate(foundTask.timeEstimate);
        const mins = Math.min(Math.round(seconds / 60), 60);
        setPresetMinutes(mins);
        if (!isThisTask) {
          setSelectedMinutes(mins);
        }
      } catch {
        router.push(`/plan/${id}/progress`);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [id, taskId, router, isThisTask]);

  function handleStart() {
    // Check if another task has an active timer
    if (focusTimer.timer && focusTimer.timer.taskId !== taskId) {
      setShowSwitchPrompt(true);
      return;
    }
    startTimerForThisTask();
  }

  function startTimerForThisTask() {
    if (!task) return;
    const seconds = selectedMinutes * 60;
    focusTimer.startTimer({
      planId: id,
      taskId,
      taskTitle: task.title,
      category: task.category || "other",
      totalTime: seconds,
    });
    scheduleFocusTimer(taskId, seconds).catch((err) =>
      console.error("[Focus] Timer schedule failed:", err),
    );
    setShowSwitchPrompt(false);
  }

  function togglePause() {
    if (isComplete) return;
    if (isRunning) focusTimer.pauseTimer();
    else focusTimer.resumeTimer();
  }

  function selectTime(mins: number) {
    if (hasStarted) return;
    setSelectedMinutes(mins);
  }

  async function handleMarkDone() {
    setMarkingDone(true);
    cancelFocusTimer(taskId).catch((err) =>
      console.error("[Focus] Timer cancel failed:", err),
    );
    focusTimer.clearTimer();
    try {
      const res = await fetch(`/api/plans/${id}/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "done" }),
      });
      if (!res.ok) throw new Error("Failed to update task");
      showToast("Task complete. Well done.");
      router.push(`/plan/${id}/progress`);
    } catch {
      showToast("Couldn't save that. Try again.", "error");
      setMarkingDone(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 px-4">
        <SkeletonText width="30%" height={12} />
        <SkeletonCircle size={220} />
        <SkeletonText width="50%" height={16} />
      </div>
    );
  }

  // Free user upsell
  if (isFree) {
    return (
      <div className="min-h-[calc(100vh-56px)] flex flex-col">
        <div className="px-4 sm:px-6 pt-4">
          <button
            onClick={() => router.push(`/plan/${id}/progress`)}
            className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-text transition-colors cursor-pointer"
          >
            <ArrowLeft size={16} />
            Return to plan
          </button>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 pb-8">
          <div className="w-16 h-16 rounded-full bg-primary-light flex items-center justify-center mb-6">
            <Timer size={28} className="text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-text font-display text-center mb-2">
            Focus Mode
          </h1>
          <p className="text-sm text-text-secondary text-center max-w-sm mb-2">
            Start a countdown timer for any task and stay focused until it&apos;s done. No distractions, just progress.
          </p>
          <p className="text-xs text-text-tertiary text-center max-w-xs mb-8">
            Available on Pro and Pro Plus.
          </p>
          <Link
            href="/settings"
            className="inline-flex items-center px-6 py-3 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-dark transition-colors"
          >
            See Pro options
          </Link>
        </div>
      </div>
    );
  }

  if (!task) return null;

  const colors = getCategoryColors(task.category);

  // Circular progress ring
  const radius = 90;
  const circumference = 2 * Math.PI * radius;
  const progress = totalTime > 0 ? timeLeft / totalTime : 0;
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <div className="min-h-[calc(100vh-56px)] flex flex-col">
      {/* Back button */}
      <div className="px-4 sm:px-6 pt-4">
        <button
          onClick={() => router.push(`/plan/${id}/progress`)}
          className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-text transition-colors cursor-pointer"
        >
          <ArrowLeft size={16} />
          Return to plan
        </button>
      </div>

      {/* Header */}
      <div className="text-center pt-6 pb-2 px-4">
        <h1 className="text-xl font-bold text-text font-display">Focus Mode</h1>
        <p className="text-xs text-text-tertiary mt-1">
          One task. One timer. Stay with it.
        </p>
      </div>

      {/* Centred content */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 pb-8 -mt-4">
        {/* Category badge */}
        <span
          className="text-[10px] font-semibold uppercase tracking-wide px-2 py-1 rounded-full mb-3"
          style={{ backgroundColor: colors.badge, color: colors.badgeText }}
        >
          {colors.label}
        </span>

        {/* Task title */}
        <h2 className="text-xl font-bold text-text font-display text-center mb-1.5 max-w-md">
          {task.title}
        </h2>

        {/* Task context */}
        {task.context && (
          <p className="text-sm text-text-secondary text-center mb-6 max-w-sm">
            {task.context.replace(/\s*[·|]\s*/g, ". ")}
          </p>
        )}
        {!task.context && <div className="mb-6" />}

        {/* Circular timer */}
        <div className="relative mb-6">
          <svg
            width="220"
            height="220"
            viewBox="0 0 220 220"
            className="transform -rotate-90"
            role="img"
            aria-label={`${formatTime(timeLeft)} remaining`}
          >
            {/* Background circle */}
            <circle
              cx="110"
              cy="110"
              r={radius}
              fill="none"
              stroke="var(--color-border)"
              strokeWidth="8"
            />
            {/* Progress circle */}
            <circle
              cx="110"
              cy="110"
              r={radius}
              fill="none"
              stroke={colors.border}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className="transition-[stroke-dashoffset] duration-1000 ease-linear"
            />
          </svg>

          {/* Time display overlaid in centre */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-5xl font-display font-bold text-text tabular-nums">
              {formatTime(timeLeft)}
            </span>
            <span className="text-xs text-text-secondary mt-1">
              {isComplete
                ? "Time\u2019s up!"
                : isRunning
                  ? "Focus time"
                  : hasStarted
                    ? "Paused"
                    : "Ready"}
            </span>
          </div>
        </div>

        {/* Time selection — only before starting */}
        {!hasStarted && (
          <div className="mb-6 text-center">
            <p className="text-xs text-text-secondary mb-2">
              {presetMinutes === selectedMinutes
                ? `${presetMinutes} min from your estimate`
                : `${selectedMinutes} min selected`}
            </p>
            <div className="flex flex-wrap justify-center gap-2 max-w-sm">
              {TIME_OPTIONS.map((mins) => (
                <button
                  key={mins}
                  onClick={() => selectTime(mins)}
                  className={`px-3 py-2.5 sm:px-4 rounded-full text-sm font-medium transition-colors cursor-pointer ${
                    selectedMinutes === mins
                      ? "text-white"
                      : "bg-bg-subtle text-text-secondary hover:bg-border"
                  }`}
                  style={
                    selectedMinutes === mins
                      ? { backgroundColor: colors.border }
                      : undefined
                  }
                >
                  {mins} min
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Switch task prompt */}
        {showSwitchPrompt && focusTimer.timer && (
          <div className="bg-accent/5 border border-accent/20 rounded-lg p-4 mb-4 max-w-sm text-center">
            <p className="text-sm text-text mb-3">
              You have a timer running for <span className="font-semibold">{focusTimer.timer.taskTitle}</span>. Switch to this task?
            </p>
            <div className="flex gap-2 justify-center">
              <Button size="sm" onClick={startTimerForThisTask}>
                Switch
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowSwitchPrompt(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Controls */}
        {!hasStarted ? (
          <Button onClick={handleStart} size="lg">
            <Play size={16} className="mr-2" />
            Start
          </Button>
        ) : !isComplete ? (
          <div className="flex gap-3">
            <Button variant="secondary" onClick={togglePause}>
              {isRunning ? (
                <>
                  <Pause size={16} className="mr-2" />
                  Pause
                </>
              ) : (
                <>
                  <Play size={16} className="mr-2" />
                  Resume
                </>
              )}
            </Button>
            <Button
              variant="ghost"
              onClick={handleMarkDone}
              loading={markingDone}
            >
              <Check size={16} className="mr-2" />
              Done early
            </Button>
          </div>
        ) : (
          <div className="text-center space-y-4">
            <p className="text-lg font-display font-semibold text-primary">
              Time&apos;s up. Nice work.
            </p>
            <Button onClick={handleMarkDone} loading={markingDone} size="lg">
              <Check size={16} className="mr-2" />
              Mark as done
            </Button>
            <div>
              <button
                onClick={() => {
                  focusTimer.clearTimer();
                  router.push(`/plan/${id}/progress`);
                }}
                className="text-sm text-text-secondary hover:text-text transition-colors mt-2 cursor-pointer"
              >
                Not done yet? Return to plan
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
