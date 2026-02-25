"use client";

interface StatsCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  icon?: React.ReactNode;
  variant?: "default" | "ring";
  ringValue?: number; // 0-100 for circular progress
}

export default function StatsCard({
  label,
  value,
  subtext,
  icon,
  variant = "default",
  ringValue = 0,
}: StatsCardProps) {
  if (variant === "ring") {
    const circumference = 2 * Math.PI * 45; // radius 45
    const strokeDashoffset = circumference - (ringValue / 100) * circumference;

    return (
      <div className="bg-bg-card rounded-lg shadow-card p-6 flex flex-col items-center justify-center text-center">
        <div className="relative w-28 h-28 mb-3 flex items-center justify-center">
          {/* Background circle */}
          <svg
            className="w-full h-full transform -rotate-90"
            viewBox="0 0 100 100"
          >
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              className="text-border"
            />
            {/* Progress circle */}
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className="text-primary transition-all duration-500"
            />
          </svg>
          {/* Center value */}
          <div className="absolute text-center">
            <p className="text-3xl font-bold text-text font-display">
              {value}%
            </p>
          </div>
        </div>
        <p className="text-sm font-medium text-text">{label}</p>
        {subtext && <p className="text-xs text-text-secondary mt-1">{subtext}</p>}
      </div>
    );
  }

  return (
    <div className="bg-bg-card rounded-lg shadow-card p-4">
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="text-xs text-text-secondary font-medium uppercase tracking-wide">
            {label}
          </p>
          <p className="text-3xl font-bold text-text font-display mt-1">
            {value}
          </p>
          {subtext && <p className="text-xs text-text-secondary mt-2">{subtext}</p>}
        </div>
        {icon && <div className="text-primary flex-shrink-0">{icon}</div>}
      </div>
    </div>
  );
}
