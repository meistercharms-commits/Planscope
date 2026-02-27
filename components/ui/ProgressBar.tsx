interface ProgressBarProps {
  done: number;
  total: number;
}

export default function ProgressBar({ done, total }: ProgressBarProps) {
  const percentage = total > 0 ? Math.round((done / total) * 100) : 0;
  const remaining = total - done;

  // Dynamic colour based on progress
  const barColor =
    percentage === 0
      ? "bg-border"
      : percentage < 40
        ? "bg-accent"
        : percentage < 75
          ? "bg-primary"
          : percentage < 100
            ? "bg-[#3CC88A]"
            : "bg-primary";

  return (
    <div className="bg-primary-light px-6 py-3 border-b border-border sticky top-14 z-30" style={{ boxShadow: "0 -56px 0 var(--color-bg-card)" }}>
      <div className="max-w-2xl mx-auto">
        <p className="text-sm font-semibold text-primary text-center mb-2">
          {done} of {total} done{remaining > 0 ? ` | ${remaining} to go` : " - all done!"}
        </p>
        <div className="bg-border rounded-full overflow-hidden" style={{ height: 10 }}>
          <div
            className={`h-full rounded-full transition-all duration-500 ease-out ${barColor}`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    </div>
  );
}
