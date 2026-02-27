"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { Plus, Pencil, Check } from "lucide-react";
import Button from "@/components/ui/Button";

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
  const [selectedId, setSelectedId] = useState(plans[0].id);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = plans.find((p) => p.id === selectedId) || plans[0];
  const percentage = selected.totalTasks > 0
    ? Math.round((selected.completedTasks / selected.totalTasks) * 100)
    : 0;

  function startRename() {
    setEditingId(selected.id);
    setEditValue(selected.label || "");
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  async function saveRename() {
    if (saving || !editingId) return;
    const trimmed = editValue.trim().slice(0, 50);
    setSaving(true);
    try {
      const res = await fetch(`/api/plans/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: trimmed }),
      });
      if (res.ok) {
        setPlans((prev) =>
          prev.map((p) => (p.id === editingId ? { ...p, label: trimmed || "Plan" } : p))
        );
      }
    } catch {
      // Silently fail — label stays as-is
    } finally {
      setEditingId(null);
      setSaving(false);
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

      {/* Plan tabs */}
      <div className="flex gap-2 mb-6">
        {plans.map((plan, i) => (
          <button
            key={plan.id}
            onClick={() => setSelectedId(plan.id)}
            className={`px-4 py-2 text-sm font-medium rounded-full border transition-all ${
              selectedId === plan.id
                ? "bg-primary-light text-primary border-primary shadow-sm"
                : "bg-white text-text-secondary border-border/60 hover:text-text hover:border-text-secondary"
            }`}
          >
            {plan.label || `Plan ${i + 1}`}
          </button>
        ))}
      </div>

      {/* Selected plan summary */}
      <div className="bg-bg-card rounded-lg shadow-card p-5">
        <div className="flex items-center justify-between mb-1">
          {editingId === selected.id ? (
            <form
              onSubmit={(e) => { e.preventDefault(); saveRename(); }}
              className="flex items-center gap-2 flex-1 mr-2"
            >
              <input
                ref={inputRef}
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={saveRename}
                maxLength={50}
                className="flex-1 text-lg font-semibold text-text font-display bg-transparent border-b-2 border-primary outline-none py-0"
                placeholder="Plan name"
              />
              <button
                type="submit"
                className="p-1 text-primary hover:bg-primary-light rounded transition-colors"
                aria-label="Save name"
              >
                <Check size={16} />
              </button>
            </form>
          ) : (
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-text font-display text-lg">
                {selected.label || "Plan"}
              </h2>
              <button
                onClick={startRename}
                className="p-1 text-text-tertiary hover:text-text-secondary transition-colors"
                aria-label="Rename plan"
              >
                <Pencil size={14} />
              </button>
            </div>
          )}
          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-bg-subtle text-text-secondary shrink-0">
            {selected.mode === "today" ? "Today" : "This Week"}
          </span>
        </div>

        <p className="text-sm text-text-secondary mb-3">
          {selected.status === "review"
            ? "Ready for review"
            : `${selected.completedTasks} of ${selected.totalTasks} done`}
        </p>

        {/* Inline progress bar */}
        <div className="h-1.5 bg-border rounded-full overflow-hidden mb-4">
          <div
            className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
            style={{ width: `${percentage}%` }}
          />
        </div>

        <Link
          href={
            selected.status === "review"
              ? `/plan/${selected.id}`
              : `/plan/${selected.id}/progress`
          }
        >
          <Button fullWidth>
            {selected.status === "review" ? "Review plan" : "Go to plan"}
          </Button>
        </Link>
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
