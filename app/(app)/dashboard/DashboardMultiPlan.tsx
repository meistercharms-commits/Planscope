"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Plus, Pencil } from "lucide-react";

interface PlanSummary {
  id: string;
  label: string;
  mode: string;
  status: string;
  totalTasks: number;
  completedTasks: number;
}

export default function DashboardMultiPlan({
  plans: initialPlans,
}: {
  plans: PlanSummary[];
  tier: string;
}) {
  const [plans, setPlans] = useState(initialPlans);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingId]);

  function startRename(planId: string, currentLabel: string) {
    setEditingId(planId);
    setEditValue(currentLabel);
  }

  async function saveRename(planId: string) {
    const trimmed = editValue.trim();
    setEditingId(null);
    if (!trimmed) return;

    // Optimistic update
    setPlans((prev) =>
      prev.map((p) => (p.id === planId ? { ...p, label: trimmed } : p))
    );

    try {
      await fetch(`/api/plans/${planId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: trimmed }),
      });
    } catch {
      // Revert on error
      setPlans(initialPlans);
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 animate-fade-in">
      <h1 className="text-[28px] font-bold text-text font-display mb-2">
        Your plans this week
      </h1>
      <p className="text-sm text-text-secondary mb-6">
        {plans.length} active plans. Pick what matters.
      </p>

      {/* Plan cards */}
      <div className="space-y-3">
        {plans.map((plan) => {
          const pct =
            plan.totalTasks > 0
              ? Math.round((plan.completedTasks / plan.totalTasks) * 100)
              : 0;
          const isEditing = editingId === plan.id;

          return (
            <div key={plan.id} className="relative">
              <Link
                href={
                  plan.status === "review"
                    ? `/plan/${plan.id}`
                    : `/plan/${plan.id}/progress`
                }
                className="block bg-bg-card rounded-lg shadow-card p-4 hover:shadow-sm transition-all"
              >
                <div className="flex items-center justify-between mb-1">
                  {isEditing ? (
                    <div className="flex-1 mr-2" onClick={(e) => e.preventDefault()} onPointerDown={(e) => e.stopPropagation()}>
                      <input
                        ref={inputRef}
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={() => saveRename(plan.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveRename(plan.id);
                          if (e.key === "Escape") setEditingId(null);
                        }}
                        onClick={(e) => e.preventDefault()}
                        onPointerDown={(e) => e.stopPropagation()}
                        maxLength={50}
                        className="w-full font-semibold text-text font-display bg-transparent border-b border-primary outline-none py-0.5"
                      />
                    </div>
                  ) : (
                    <p className="font-semibold text-text font-display flex-1">
                      {plan.label || "Plan"}
                    </p>
                  )}
                  <div className="flex items-center gap-2">
                    {!isEditing && (
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          startRename(plan.id, plan.label || "Plan");
                        }}
                        className="p-1.5 -m-1 text-text-tertiary hover:text-text transition-colors cursor-pointer"
                        aria-label="Rename plan"
                      >
                        <Pencil size={14} />
                      </button>
                    )}
                    <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-bg-subtle text-text-secondary">
                      {plan.mode === "today" ? "Today" : "This Week"}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-text-secondary mb-3">
                  {plan.status === "review"
                    ? "Ready for review"
                    : `${plan.completedTasks} of ${plan.totalTasks} done`}
                </p>
                <div className="h-1.5 bg-border rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </Link>
            </div>
          );
        })}
      </div>

      <div className="mt-6">
        <Link
          href="/new-plan"
          className="flex items-center justify-center gap-2 w-full py-3 text-sm font-medium text-primary border border-dashed border-primary/30 rounded-lg hover:bg-primary/5 transition-colors"
        >
          <Plus size={18} />
          New plan for this week
        </Link>
      </div>
    </div>
  );
}
