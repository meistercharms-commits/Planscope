"use client";

import { AlertTriangle } from "lucide-react";

export default function PlanError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4">
      <div className="w-16 h-16 rounded-full bg-primary-light flex items-center justify-center mb-6">
        <AlertTriangle size={28} className="text-primary" />
      </div>
      <h1 className="text-xl font-bold text-text font-display mb-2">
        Something went wrong
      </h1>
      <p className="text-sm text-text-secondary text-center mb-6 max-w-sm">
        There was an error loading your plan. Please try again.
      </p>
      <button
        onClick={reset}
        className="inline-flex items-center px-6 py-3 bg-primary text-white font-medium rounded-lg hover:bg-primary-dark transition-colors cursor-pointer"
      >
        Try again
      </button>
    </div>
  );
}
