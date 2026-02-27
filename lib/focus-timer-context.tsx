"use client";

import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";

const STORAGE_KEY = "planscope_focus_timer";

interface FocusTimerState {
  planId: string;
  taskId: string;
  taskTitle: string;
  category: string;
  totalTime: number; // seconds
  startedAt: number; // timestamp ms
  pausedAt: number | null; // timestamp ms, null if running
  pausedDuration: number; // accumulated paused ms
}

interface FocusTimerContextValue {
  timer: FocusTimerState | null;
  timeLeft: number; // computed seconds remaining
  isRunning: boolean;
  isComplete: boolean;
  startTimer: (opts: {
    planId: string;
    taskId: string;
    taskTitle: string;
    category: string;
    totalTime: number;
  }) => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  clearTimer: () => void;
}

const FocusTimerContext = createContext<FocusTimerContextValue>({
  timer: null,
  timeLeft: 0,
  isRunning: false,
  isComplete: false,
  startTimer: () => {},
  pauseTimer: () => {},
  resumeTimer: () => {},
  clearTimer: () => {},
});

export function useFocusTimer() {
  return useContext(FocusTimerContext);
}

function loadFromStorage(): FocusTimerState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveToStorage(state: FocusTimerState | null) {
  if (state) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
}

function computeTimeLeft(state: FocusTimerState): number {
  const now = state.pausedAt ?? Date.now();
  const elapsed = (now - state.startedAt - state.pausedDuration) / 1000;
  return Math.max(0, Math.ceil(state.totalTime - elapsed));
}

export function FocusTimerProvider({ children }: { children: React.ReactNode }) {
  const [timer, setTimer] = useState<FocusTimerState | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load from localStorage on mount
  useEffect(() => {
    const stored = loadFromStorage();
    if (stored) {
      const remaining = computeTimeLeft(stored);
      if (remaining <= 0) {
        // Timer already expired — clear it
        saveToStorage(null);
      } else {
        setTimer(stored);
        setTimeLeft(remaining);
      }
    }
  }, []);

  // Tick every second when running
  useEffect(() => {
    if (tickRef.current) clearInterval(tickRef.current);

    if (timer && !timer.pausedAt) {
      const tick = () => {
        const remaining = computeTimeLeft(timer);
        setTimeLeft(remaining);
        if (remaining <= 0) {
          if (tickRef.current) clearInterval(tickRef.current);
        }
      };
      tick();
      tickRef.current = setInterval(tick, 1000);
    }

    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [timer]);

  const isRunning = !!timer && !timer.pausedAt && timeLeft > 0;
  const isComplete = !!timer && timeLeft <= 0 && !timer.pausedAt;

  const startTimer = useCallback(
    (opts: {
      planId: string;
      taskId: string;
      taskTitle: string;
      category: string;
      totalTime: number;
    }) => {
      const state: FocusTimerState = {
        planId: opts.planId,
        taskId: opts.taskId,
        taskTitle: opts.taskTitle,
        category: opts.category,
        totalTime: opts.totalTime,
        startedAt: Date.now(),
        pausedAt: null,
        pausedDuration: 0,
      };
      setTimer(state);
      setTimeLeft(opts.totalTime);
      saveToStorage(state);
    },
    [],
  );

  const pauseTimer = useCallback(() => {
    setTimer((prev) => {
      if (!prev || prev.pausedAt) return prev;
      const updated = { ...prev, pausedAt: Date.now() };
      saveToStorage(updated);
      return updated;
    });
  }, []);

  const resumeTimer = useCallback(() => {
    setTimer((prev) => {
      if (!prev || !prev.pausedAt) return prev;
      const pausedMs = Date.now() - prev.pausedAt;
      const updated = {
        ...prev,
        pausedAt: null,
        pausedDuration: prev.pausedDuration + pausedMs,
      };
      saveToStorage(updated);
      return updated;
    });
  }, []);

  const clearTimer = useCallback(() => {
    setTimer(null);
    setTimeLeft(0);
    saveToStorage(null);
  }, []);

  return (
    <FocusTimerContext.Provider
      value={{
        timer,
        timeLeft,
        isRunning,
        isComplete,
        startTimer,
        pauseTimer,
        resumeTimer,
        clearTimer,
      }}
    >
      {children}
    </FocusTimerContext.Provider>
  );
}
