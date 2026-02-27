"use client";

import { ReactNode } from "react";

interface Option {
  value: string;
  label: string;
  icon?: ReactNode;
}

interface SegmentedControlProps {
  label?: string;
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  error?: boolean;
}

export default function SegmentedControl({
  label,
  options,
  value,
  onChange,
  required,
  error,
}: SegmentedControlProps) {
  const compact = options.length >= 5;

  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-medium text-text">
          {label}{required && <span className="text-accent ml-0.5">*</span>}
        </label>
      )}
      <div className={`${compact ? "grid grid-cols-5 gap-1.5" : "flex gap-2"} ${error ? "ring-1 ring-accent/40 rounded-full p-0.5" : ""}`}>
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`${compact ? "" : "flex-1"} flex items-center justify-center gap-2 ${compact ? "px-1 py-2.5 text-xs" : "px-2 py-2.5 text-sm"} rounded-full font-medium transition-all duration-200 cursor-pointer border ${
              value === option.value
                ? "bg-primary-light text-primary border-primary shadow-sm"
                : "bg-white text-text-secondary border-border/60 shadow-sm hover:text-text hover:border-text-secondary hover:shadow"
            }`}
          >
            {option.icon && !compact && (
              <span className="flex-shrink-0 w-4 h-4">
                {typeof option.icon === 'string' ? (
                  <img src={option.icon} alt="" className="w-full h-full" />
                ) : (
                  option.icon
                )}
              </span>
            )}
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
