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
}

export default function SegmentedControl({
  label,
  options,
  value,
  onChange,
}: SegmentedControlProps) {
  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-medium text-text">{label}</label>
      )}
      <div className="flex gap-2 flex-wrap">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-150 cursor-pointer border ${
              value === option.value
                ? "bg-primary-light text-primary border-primary"
                : "bg-white text-text-secondary border-border hover:text-text hover:border-text-secondary"
            }`}
          >
            {option.icon && (
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
