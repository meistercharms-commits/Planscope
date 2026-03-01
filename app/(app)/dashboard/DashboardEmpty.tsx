import EmptyState from "@/components/ui/EmptyState";

export default function DashboardEmpty() {
  return (
    <div className="max-w-2xl lg:max-w-3xl mx-auto px-4 sm:px-6 py-8 animate-fade-in">
      <h1 className="text-[28px] font-bold text-text font-display mb-2">
        My Plans
      </h1>
      <p className="text-sm text-text-secondary mb-8">
        Your active plans will appear here.
      </p>

      <EmptyState
        icon="/icons/no_plans.svg"
        title="Fresh start this week"
        description="Write down what's on your mind. We'll sort it into a plan that actually feels doable."
        actionLabel="Create a new plan"
        actionHref="/new-plan"
      />
    </div>
  );
}
