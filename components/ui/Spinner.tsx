"use client";

import { useEffect, useState, useRef } from "react";
import PlanscopeLogo from "./PlanscopeLogo";

const defaultMessages = [
  "Reading your brain dump...",
  "Understanding what matters...",
  "Scoring tasks realistically...",
  "Building your plan...",
  "Almost there...",
];

interface SpinnerProps {
  statusMessages?: string[];
  /** Expected duration in seconds — controls progress speed */
  duration?: number;
  onCancel?: () => void;
}

export default function Spinner({
  statusMessages = defaultMessages,
  duration = 40,
  onCancel,
}: SpinnerProps) {
  const [progress, setProgress] = useState(0);
  const [messageIndex, setMessageIndex] = useState(0);
  const startRef = useRef(Date.now());

  useEffect(() => {
    startRef.current = Date.now();

    const tick = () => {
      const elapsed = (Date.now() - startRef.current) / 1000;
      // Ease-out curve: fast start, slows down approaching 95%
      // Never reaches 100 — that happens on redirect
      const raw = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - raw, 2.5);
      setProgress(Math.min(eased * 95, 95));
    };

    const interval = setInterval(tick, 200);
    return () => clearInterval(interval);
  }, [duration]);

  useEffect(() => {
    // Advance messages based on progress
    const step = 95 / statusMessages.length;
    const idx = Math.min(
      Math.floor(progress / step),
      statusMessages.length - 1
    );
    setMessageIndex(idx);
  }, [progress, statusMessages]);

  return (
    <div className="flex flex-col items-center min-h-[60vh] gap-6 pt-32">
      <PlanscopeLogo size={88} progress={progress} />

      <div className="text-center space-y-2">
        <p className="text-base font-medium text-text font-display min-h-[1.5em]">
          {statusMessages[messageIndex]}
        </p>
        <p className="text-xs text-text-tertiary">
          This usually takes 30–40 seconds
        </p>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="text-xs text-text-secondary hover:text-text transition-colors mt-2 cursor-pointer"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
