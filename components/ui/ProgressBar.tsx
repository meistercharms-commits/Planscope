interface ProgressBarProps {
  done: number;
  total: number;
}

export default function ProgressBar({ done, total }: ProgressBarProps) {
  const percentage = total > 0 ? Math.round((done / total) * 100) : 0;
  const remaining = total - done;

  return (
    <div className="bg-primary-light px-6 py-3 border-b border-border">
      <div className="max-w-2xl mx-auto">
        <p className="text-sm font-semibold text-primary text-center mb-2">
          {done} of {total} done{remaining > 0 ? ` | ${remaining} to go` : " - all done!"}
        </p>
        <div className="h-1 bg-border rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    </div>
  );
}
