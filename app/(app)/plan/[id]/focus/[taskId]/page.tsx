"use client";

import { useEffect, useState, useRef, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Pause, Play, Check, Timer } from "lucide-react";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/lib/useAuth";
import { getCategoryColors } from "@/lib/category-colors";
import { parseTimeEstimate, formatTime } from "@/lib/parse-time-estimate";
import { scheduleFocusTimer, cancelFocusTimer } from "@/lib/notifications";

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

  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [presetMinutes, setPresetMinutes] = useState(0);
  const [selectedMinutes, setSelectedMinutes] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [totalTime, setTotalTime] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [markingDone, setMarkingDone] = useState(false);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeLeftRef = useRef(0);

  const isFree = !user || user.tier === "free";

  // Fetch task data
  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(`/api/plans/${id}`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        const foundTask = data.tasks.find((t: Task) => t.id === taskId);

        if (!foundTask || foundTask.status === "done") {
          router.push(`/plan/${id}/progress`);
          return;
        }

        setTask(foundTask);
        const seconds = parseTimeEstimate(foundTask.timeEstimate);
        const mins = Math.min(Math.round(seconds / 60), 60);
        setPresetMinutes(mins);
        setSelectedMinutes(mins);
        setTotalTime(mins * 60);
        setTimeLeft(mins * 60);
        timeLeftRef.current = mins * 60;
      } catch {
        router.push(`/plan/${id}/progress`);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [id, taskId, router]);

  // Timer interval
  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        timeLeftRef.current -= 1;
        if (timeLeftRef.current <= 0) {
          timeLeftRef.current = 0;
          setTimeLeft(0);
          setIsRunning(false);
          setIsComplete(true);
          if (intervalRef.current) clearInterval(intervalRef.current);
        } else {
          setTimeLeft(timeLeftRef.current);
        }
      }, 1000);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning]);

  function handleStart() {
    const seconds = selectedMinutes * 60;
    setTotalTime(seconds);
    setTimeLeft(seconds);
    timeLeftRef.current = seconds;
    setHasStarted(true);
    setIsRunning(true);
    // Schedule notification for when timer ends (in case user leaves app)
    scheduleFocusTimer(taskId, seconds).catch(() => {});
  }

  function togglePause() {
    if (isComplete) return;
    setIsRunning((prev) => !prev);
  }

  function selectTime(mins: number) {
    if (hasStarted) return;
    setSelectedMinutes(mins);
    const seconds = mins * 60;
    setTotalTime(seconds);
    setTimeLeft(seconds);
    timeLeftRef.current = seconds;
  }

  async function handleMarkDone() {
    setMarkingDone(true);
    // Cancel the scheduled "time's up" notification since user is done early or already here
    cancelFocusTimer(taskId).catch(() => {});
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
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-lg text-text-secondary">Loading...</div>
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
            <div className="flex flex-wrap justify-center gap-2 max-w-xs">
              {TIME_OPTIONS.map((mins) => (
                <button
                  key={mins}
                  onClick={() => selectTime(mins)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer ${
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
                onClick={() => router.push(`/plan/${id}/progress`)}
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
