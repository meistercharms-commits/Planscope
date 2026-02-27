"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowLeft, Pause, Play, Check } from "lucide-react";
import Button from "@/components/ui/Button";
import { getCategoryColors } from "@/lib/category-colors";
import { formatTime } from "@/lib/parse-time-estimate";

const TIME_OPTIONS = [5, 10, 15, 20, 25, 30, 45, 60];

export default function FocusPreviewPage() {
  const colors = getCategoryColors("money");
  const presetMinutes = 20;

  const [selectedMinutes, setSelectedMinutes] = useState(presetMinutes);
  const [timeLeft, setTimeLeft] = useState(presetMinutes * 60);
  const [totalTime, setTotalTime] = useState(presetMinutes * 60);
  const [hasStarted, setHasStarted] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeLeftRef = useRef(presetMinutes * 60);

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

  const radius = 90;
  const circumference = 2 * Math.PI * radius;
  const progress = totalTime > 0 ? timeLeft / totalTime : 0;
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <div className="min-h-[calc(100vh-56px)] flex flex-col">
      {/* Back button */}
      <div className="px-4 sm:px-6 pt-4">
        <Link
          href="/preview/plan-progress"
          className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-text transition-colors"
        >
          <ArrowLeft size={16} />
          Return to plan
        </Link>
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
          Review savings account options
        </h2>

        {/* Task context */}
        <p className="text-sm text-text-secondary text-center mb-6 max-w-sm">
          Compare rates before Thursday.
        </p>

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

          {/* Time display */}
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
            <div className="flex flex-wrap justify-center gap-2.5 max-w-sm">
              {TIME_OPTIONS.map((mins) => (
                <button
                  key={mins}
                  onClick={() => selectTime(mins)}
                  className={`px-4 py-2.5 rounded-full text-sm font-medium transition-colors cursor-pointer ${
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
            <Button variant="ghost">
              <Check size={16} className="mr-2" />
              Done early
            </Button>
          </div>
        ) : (
          <div className="text-center space-y-4">
            <p className="text-lg font-display font-semibold text-primary">
              Time&apos;s up. Nice work.
            </p>
            <Button size="lg">
              <Check size={16} className="mr-2" />
              Mark as done
            </Button>
            <div>
              <Link
                href="/preview/plan-progress"
                className="text-sm text-text-secondary hover:text-text transition-colors mt-2 inline-block"
              >
                Not done yet? Return to plan
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
