import Link from "next/link";

export default function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  actionHref,
}: {
  icon: string | React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
}) {
  return (
    <div className="text-center py-16 bg-bg-card rounded-lg p-8 shadow-card">
      <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-primary-light flex items-center justify-center">
        {typeof icon === "string" ? (
          <img src={icon} alt="" className="w-10 h-10 opacity-80" />
        ) : (
          icon
        )}
      </div>
      <h2 className="text-lg font-semibold text-text mb-2 font-display">
        {title}
      </h2>
      <p className="text-sm text-text-secondary mb-6 max-w-sm mx-auto leading-relaxed">
        {description}
      </p>
      {actionLabel && actionHref && (
        <Link
          href={actionHref}
          className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white font-medium rounded-lg hover:bg-primary-dark transition-colors"
        >
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
