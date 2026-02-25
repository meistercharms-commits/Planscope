"use client";

interface Option {
  value: string;
  label: string;
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
      <div className="inline-flex gap-1 bg-bg-subtle rounded-lg p-1">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-150 cursor-pointer ${
              value === option.value
                ? "bg-primary-light text-primary shadow-card"
                : "text-text-secondary hover:text-text"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
