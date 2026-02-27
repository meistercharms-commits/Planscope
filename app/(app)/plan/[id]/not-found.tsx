import Link from "next/link";

export default function PlanNotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4">
      <div className="w-16 h-16 rounded-full bg-primary-light flex items-center justify-center mb-6">
        <span className="text-2xl">📋</span>
      </div>
      <h1 className="text-xl font-bold text-text font-display mb-2">
        Plan not found
      </h1>
      <p className="text-sm text-text-secondary text-center mb-6 max-w-sm">
        This plan may have been archived or doesn&apos;t exist. Check your dashboard for active plans.
      </p>
      <Link
        href="/dashboard"
        className="inline-flex items-center px-6 py-3 bg-primary text-white font-medium rounded-lg hover:bg-primary-dark transition-colors"
      >
        Back to dashboard
      </Link>
    </div>
  );
}
