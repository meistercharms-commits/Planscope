"use client";

import { useEffect, useState } from "react";

const messages = [
  "Parsing your brain...",
  "Scoring tasks...",
  "Building your plan...",
  "Almost there...",
];

interface SpinnerProps {
  statusMessages?: string[];
}

export default function Spinner({ statusMessages = messages }: SpinnerProps) {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % statusMessages.length);
    }, 2500);
    return () => clearInterval(interval);
  }, [statusMessages]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
      <div className="text-2xl font-semibold text-primary font-display">
        Planscope
      </div>

      <div className="w-[60px] h-[60px] border-4 border-border border-t-primary rounded-full animate-spin-slow" />

      <div className="text-center space-y-1">
        <p className="text-base text-text transition-opacity duration-300">
          {statusMessages[messageIndex]}
        </p>
        <p className="text-xs text-text-secondary">
          Usually takes 5 seconds
        </p>
      </div>
    </div>
  );
}
