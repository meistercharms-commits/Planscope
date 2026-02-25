"use client";

export default function HistoryEmptyPreviewPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 animate-fade-in">
      <h1 className="text-[28px] font-bold text-text font-display mb-2">
        Plan History
      </h1>
      <p className="text-sm text-text-secondary mb-6">
        0 plans created. 0 tasks completed.
      </p>

      {/* Empty state */}
      <div className="text-center py-16 bg-bg-card rounded-lg p-8">
        <img src="/icons/no_plans.svg" alt="" className="w-16 h-16 mx-auto mb-6 opacity-60" />
        <h2 className="text-lg font-semibold text-text mb-2 font-display">
          No plans yet
        </h2>
        <p className="text-sm text-text-secondary mb-6 max-w-sm mx-auto">
          Start by creating your first plan. Dump everything on your mind, and we'll help you turn it into a realistic plan you can actually complete.
        </p>
        <a href="/new-plan">
          <button className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white font-medium rounded-lg hover:bg-primary-dark transition-colors">
            Create your first plan
          </button>
        </a>
      </div>
    </div>
  );
}
