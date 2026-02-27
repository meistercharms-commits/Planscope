export function SkeletonText({
  width = "100%",
  height = 14,
  className = "",
}: {
  width?: string | number;
  height?: number;
  className?: string;
}) {
  return (
    <div
      className={`animate-shimmer rounded ${className}`}
      style={{ width, height }}
    />
  );
}

export function SkeletonCircle({
  size = 40,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <div
      className={`animate-shimmer rounded-full ${className}`}
      style={{ width: size, height: size }}
    />
  );
}

export function SkeletonCard({
  lines = 3,
  className = "",
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div className={`bg-bg-card rounded-lg shadow-card p-5 sm:p-6 ${className}`}>
      <div className="flex items-center gap-3 mb-4">
        <SkeletonCircle size={20} />
        <SkeletonText width="40%" height={18} />
      </div>
      <div className="space-y-3">
        {Array.from({ length: lines }).map((_, i) => (
          <SkeletonText
            key={i}
            width={i === lines - 1 ? "60%" : "100%"}
            height={12}
          />
        ))}
      </div>
    </div>
  );
}

export function SkeletonTaskCard({ className = "" }: { className?: string }) {
  return (
    <div className={`bg-bg-card rounded-lg shadow-card p-4 ${className}`}>
      <div className="flex items-center gap-3">
        <SkeletonCircle size={22} />
        <div className="flex-1 space-y-2">
          <SkeletonText width="70%" height={14} />
          <SkeletonText width="30%" height={10} />
        </div>
      </div>
    </div>
  );
}
