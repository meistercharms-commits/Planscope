import Link from "next/link";

export default function DashboardEmpty() {
  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 animate-fade-in">
      <h1 className="text-[28px] font-bold text-text font-display mb-2">
        My Plans
      </h1>
      <p className="text-sm text-text-secondary mb-8">
        Your active plans will appear here.
      </p>

      <div className="text-center py-16 bg-bg-card rounded-lg p-8 shadow-card">
        <img
          src="/icons/no_plans.svg"
          alt=""
          className="w-20 h-20 mx-auto mb-6 opacity-80"
        />
        <h2 className="text-lg font-semibold text-text mb-2 font-display">
          Fresh start this week
        </h2>
        <p className="text-sm text-text-secondary mb-6 max-w-sm mx-auto leading-relaxed">
          Write down what&apos;s on your mind — big or small. We&apos;ll sort it
          into a plan that actually feels doable.
        </p>
        <Link
          href="/new-plan"
          className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white font-medium rounded-lg hover:bg-primary-dark transition-colors"
        >
          Create a new plan
        </Link>
      </div>
    </div>
  );
}
