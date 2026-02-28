"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Plus, Pencil, Palette } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

const PLAN_COLOURS = [
  { key: "work", label: "Blue", className: "bg-cat-work" },
  { key: "health", label: "Green", className: "bg-cat-health" },
  { key: "home", label: "Brown", className: "bg-cat-home" },
  { key: "money", label: "Purple", className: "bg-cat-money" },
  { key: "life", label: "Orange", className: "bg-cat-life" },
  { key: null, label: "Default", className: "bg-primary" },
] as const;

const COLOUR_BAR: Record<string, string> = {
  work: "bg-cat-work",
  health: "bg-cat-health",
  home: "bg-cat-home",
  money: "bg-cat-money",
  life: "bg-cat-life",
};

const COLOUR_BORDER: Record<string, string> = {
  work: "border-l-[3px] border-l-cat-work",
  health: "border-l-[3px] border-l-cat-health",
  home: "border-l-[3px] border-l-cat-home",
  money: "border-l-[3px] border-l-cat-money",
  life: "border-l-[3px] border-l-cat-life",
};

interface PlanSummary {
  id: string;
  label: string;
  colour?: string | null;
  mode: string;
  status: string;
  totalTasks: number;
  completedTasks: number;
}

export default function DashboardMultiPlan({
  plans: initialPlans,
  tier,
}: {
  plans: PlanSummary[];
  tier: string;
}) {
  const { showToast } = useToast();
  const [plans, setPlans] = useState(initialPlans);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [colourPickerId, setColourPickerId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isProPlus = tier === "pro_plus";

  useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingId]);

  function startRename(planId: string, currentLabel: string) {
    setEditingId(planId);
    setEditValue(currentLabel);
    setColourPickerId(null);
  }

  async function saveRename(planId: string) {
    const trimmed = editValue.trim();
    setEditingId(null);
    if (!trimmed) return;

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
      setPlans(initialPlans);
      showToast("Couldn't rename that plan. Try again.", "error");
    }
  }

  async function saveColour(planId: string, colour: string | null) {
    setColourPickerId(null);

    setPlans((prev) =>
      prev.map((p) => (p.id === planId ? { ...p, colour } : p))
    );

    try {
      await fetch(`/api/plans/${planId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ colour }),
      });
    } catch {
      setPlans(initialPlans);
      showToast("Couldn't update colour. Try again.", "error");
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
          const showPicker = colourPickerId === plan.id;
          const barClass = plan.colour && COLOUR_BAR[plan.colour] ? COLOUR_BAR[plan.colour] : "bg-primary";
          const borderClass = plan.colour && COLOUR_BORDER[plan.colour] ? COLOUR_BORDER[plan.colour] : "";

          return (
            <div key={plan.id} className="relative">
              <Link
                href={
                  plan.status === "review"
                    ? `/plan/${plan.id}`
                    : `/plan/${plan.id}/progress`
                }
                className={`block bg-bg-card rounded-lg shadow-card p-4 hover:shadow-sm transition-all ${borderClass}`}
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
                    {isProPlus && !isEditing && (
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          setColourPickerId(showPicker ? null : plan.id);
                        }}
                        className="p-1.5 -m-1 text-text-tertiary hover:text-text transition-colors cursor-pointer"
                        aria-label="Change plan colour"
                      >
                        <Palette size={14} />
                      </button>
                    )}
                    <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-bg-subtle text-text-secondary">
                      {plan.mode === "today" ? "Today" : "This Week"}
                    </span>
                  </div>
                </div>

                {/* Colour picker */}
                {showPicker && (
                  <div
                    className="flex items-center gap-2 mb-2 py-1.5"
                    onClick={(e) => e.preventDefault()}
                    onPointerDown={(e) => e.stopPropagation()}
                  >
                    <span className="text-xs text-text-secondary mr-1">Colour:</span>
                    {PLAN_COLOURS.map((c) => (
                      <button
                        key={c.key ?? "default"}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          saveColour(plan.id, c.key);
                        }}
                        className={`w-5 h-5 rounded-full ${c.className} transition-transform hover:scale-110 ${
                          (plan.colour ?? null) === c.key ? "ring-2 ring-offset-2 ring-text/30" : ""
                        }`}
                        aria-label={`Set colour to ${c.label}`}
                      />
                    ))}
                  </div>
                )}

                <p className="text-xs text-text-secondary mb-3">
                  {plan.status === "review"
                    ? "Ready for review"
                    : `${plan.completedTasks} of ${plan.totalTasks} done`}
                </p>
                <div className="h-1.5 bg-border rounded-full overflow-hidden">
                  <div
                    className={`h-full ${barClass} rounded-full transition-all duration-500 ease-out`}
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
