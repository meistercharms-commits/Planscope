"use client";

import { useState } from "react";
import Link from "next/link";
import { Users, X, UserPlus, Plus, Loader2, Check, ChevronDown, Target, Zap, Pencil, Palette } from "lucide-react";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import ProgressBar from "@/components/ui/ProgressBar";
import { getCategoryColors } from "@/lib/category-colors";

const COLOUR_BAR: Record<string, string> = {
  work: "bg-cat-work",
  health: "bg-cat-health",
  home: "bg-cat-home",
  money: "bg-cat-money",
  life: "bg-cat-life",
};

export default function SharingPreviewPage() {
  const [showModal, setShowModal] = useState(false);
  const [view, setView] = useState<"progress" | "dashboard">("progress");

  return (
    <div className="min-h-screen bg-bg">
      {/* Toggle */}
      <div className="max-w-2xl mx-auto px-4 pt-6 pb-2">
        <div className="flex gap-2">
          <button
            onClick={() => setView("progress")}
            className={`px-4 py-2 text-sm rounded-lg font-medium cursor-pointer ${
              view === "progress" ? "bg-primary text-white" : "bg-bg-subtle text-text-secondary"
            }`}
          >
            Plan Progress (Owner)
          </button>
          <button
            onClick={() => setView("dashboard")}
            className={`px-4 py-2 text-sm rounded-lg font-medium cursor-pointer ${
              view === "dashboard" ? "bg-primary text-white" : "bg-bg-subtle text-text-secondary"
            }`}
          >
            Dashboard (Shared)
          </button>
        </div>
      </div>

      {view === "progress" ? (
        <ProgressPreview onOpenShare={() => setShowModal(true)} />
      ) : (
        <DashboardPreview />
      )}

      {/* Share Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title="Share plan">
        <div className="space-y-5">
          <div className="space-y-3">
            <p className="text-sm text-text-secondary">
              Share this plan with other Planscope users. They&apos;ll be able to
              view and complete tasks.
            </p>
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  placeholder="Email address"
                  type="email"
                  defaultValue=""
                />
              </div>
              <Button size="md">
                <UserPlus size={16} className="mr-1.5" />
                Share
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">
              Shared with (2/3)
            </p>
            {[
              { email: "sarah@example.com" },
              { email: "james@example.com" },
            ].map((m) => (
              <div
                key={m.email}
                className="flex items-center justify-between py-2 px-3 bg-bg-subtle rounded-lg"
              >
                <span className="text-sm text-text truncate">{m.email}</span>
                <button className="p-1 text-text-tertiary hover:text-text transition-colors flex-shrink-0 cursor-pointer">
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </Modal>
    </div>
  );
}

function ProgressPreview({ onOpenShare }: { onOpenShare: () => void }) {
  const workColors = getCategoryColors("work");
  const healthColors = getCategoryColors("health");

  return (
    <>
      <ProgressBar done={3} total={5} />
      <div className="max-w-2xl mx-auto px-4 sm:px-6">
        <p className="text-xs text-text-secondary text-center pt-2 italic">
          Over halfway. The end is in sight.
        </p>
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        {/* Plan Header with Share button */}
        <div className="mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-[28px] font-bold text-text font-display">
                Week of 3 Mar
              </h1>
              <p className="text-sm text-text-secondary mt-1">5 tasks</p>
            </div>
            <button
              onClick={onOpenShare}
              className="p-2 text-text-secondary hover:text-primary hover:bg-primary/5 rounded-lg transition-colors cursor-pointer"
              aria-label="Share plan"
            >
              <Users size={20} />
            </button>
          </div>
        </div>

        {/* Do First */}
        <section className="mb-6">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-text mb-3 font-display">
            <img src="/icons/do_first.svg" alt="" className="w-5 h-5" />
            Do First
          </h2>
          <div className="space-y-2">
            <MockTaskCard
              title="Submit quarterly report"
              category="work"
              isDone
            />
            <MockTaskCard
              title="Book dentist appointment"
              category="health"
              timeEstimate="15 min"
              isQuickWin
            />
          </div>
        </section>

        <div className="h-px bg-border mb-6" />

        {/* This Week */}
        <section className="mb-6">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-text mb-3 font-display">
            <img src="/icons/this_week.svg" alt="" className="w-5 h-5" />
            This Week
          </h2>
          <div className="space-y-2">
            <MockTaskCard
              title="Prepare presentation slides"
              category="work"
              isDone
            />
            <MockTaskCard
              title="Go for a run"
              category="health"
              isDone
            />
            <MockTaskCard
              title="Plan weekend grocery shop"
              category="home"
              timeEstimate="30 min"
            />
          </div>
        </section>
      </div>
    </>
  );
}

function DashboardPreview() {
  const plans = [
    { id: "1", label: "Work Focus", colour: "work", completedTasks: 4, totalTasks: 6 },
    { id: "2", label: "Home & Health", colour: "health", completedTasks: 2, totalTasks: 5 },
  ];

  const sharedPlans = [
    { id: "3", label: "Team Sprint Q1", colour: "money", completedTasks: 8, totalTasks: 12 },
    { id: "4", label: "Family Holiday Planning", colour: "life", completedTasks: 1, totalTasks: 4 },
  ];

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 animate-fade-in">
      <h1 className="text-[28px] font-bold text-text font-display mb-2">
        Your plans this week
      </h1>
      <p className="text-sm text-text-secondary mb-6">
        2 active plans. Pick what matters.
      </p>

      {/* Own plan cards */}
      <div className="space-y-3">
        {plans.map((plan) => {
          const pct = Math.round((plan.completedTasks / plan.totalTasks) * 100);
          const barClass = plan.colour && COLOUR_BAR[plan.colour] ? COLOUR_BAR[plan.colour] : "bg-primary";

          return (
            <div key={plan.id} className="relative">
              <div className={`block bg-bg-card rounded-lg shadow-card p-4 border-l-[3px] ${
                plan.colour === "work" ? "border-l-cat-work bg-cat-work/8" :
                plan.colour === "health" ? "border-l-cat-health bg-cat-health/8" :
                "border-l-primary"
              }`}>
                <div className="flex items-center justify-between mb-1">
                  <p className="font-semibold text-text font-display flex-1">
                    {plan.label}
                  </p>
                  <div className="flex items-center gap-2">
                    <button className="p-1.5 -m-1 text-text-tertiary hover:text-text transition-colors cursor-pointer">
                      <Pencil size={14} />
                    </button>
                    <button className="p-1.5 -m-1 text-text-tertiary hover:text-text transition-colors cursor-pointer">
                      <Palette size={14} />
                    </button>
                    <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-bg-subtle text-text-secondary">
                      This Week
                    </span>
                  </div>
                </div>
                <p className="text-xs text-text-secondary mb-3">
                  {plan.completedTasks} of {plan.totalTasks} done
                </p>
                <div className="h-1.5 bg-border rounded-full overflow-hidden">
                  <div
                    className={`h-full ${barClass} rounded-full transition-all duration-500 ease-out`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6">
        <div className="flex items-center justify-center gap-2 w-full py-3 text-sm font-medium text-primary border border-dashed border-primary/30 rounded-lg">
          <Plus size={18} />
          New plan for this week
        </div>
      </div>

      {/* Shared plans section */}
      <div className="mt-8 mb-4 flex items-center gap-2">
        <div className="h-px bg-border flex-1" />
        <span className="text-xs font-medium text-text-secondary uppercase tracking-wide px-2">
          Shared with you
        </span>
        <div className="h-px bg-border flex-1" />
      </div>
      <div className="space-y-3">
        {sharedPlans.map((plan) => {
          const pct = Math.round((plan.completedTasks / plan.totalTasks) * 100);
          const barClass = plan.colour && COLOUR_BAR[plan.colour] ? COLOUR_BAR[plan.colour] : "bg-primary";

          return (
            <div
              key={plan.id}
              className="block bg-bg-card rounded-lg shadow-card p-4 hover:shadow-sm transition-all"
            >
              <div className="flex items-center justify-between mb-1">
                <p className="font-semibold text-text font-display flex-1">
                  {plan.label}
                </p>
                <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-bg-subtle text-text-secondary">
                  This Week
                </span>
              </div>
              <p className="text-xs text-text-secondary mb-3">
                {plan.completedTasks} of {plan.totalTasks} done
              </p>
              <div className="h-1.5 bg-border rounded-full overflow-hidden">
                <div
                  className={`h-full ${barClass} rounded-full transition-all duration-500 ease-out`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MockTaskCard({
  title,
  category,
  isDone,
  timeEstimate,
  isQuickWin,
}: {
  title: string;
  category: string;
  isDone?: boolean;
  timeEstimate?: string;
  isQuickWin?: boolean;
}) {
  const colors = getCategoryColors(category);

  return (
    <div
      className={`rounded-lg border-l-[3px] ${
        isDone ? "bg-bg-subtle opacity-60" : "bg-bg-card shadow-card"
      }`}
      style={{ borderLeftColor: isDone ? colors.border + "80" : colors.border }}
    >
      <div className="flex items-start gap-3 p-4">
        <div className="flex-shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center -ml-2 -my-2">
          <div
            className={`w-5 h-5 rounded border flex items-center justify-center ${
              isDone ? "border-transparent" : "border-border"
            }`}
            style={
              isDone
                ? { backgroundColor: colors.checkboxDone, borderColor: colors.checkboxDone }
                : undefined
            }
          >
            {isDone && <Check size={14} className="text-white" />}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          {/* Badges row — above title */}
          {!isDone && (
            <div className="flex items-center gap-1.5 mb-1">
              <span
                className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-full"
                style={{ backgroundColor: colors.badge, color: colors.badgeText }}
              >
                {colors.label}
              </span>
              {isQuickWin && (
                <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-accent/10 text-accent">
                  <Zap size={10} className="fill-current" />
                  Quick win
                </span>
              )}
            </div>
          )}
          {/* Icon + title row */}
          <div className="flex items-center gap-2">
            <span
              className="w-4 h-4 flex-shrink-0 inline-block"
              style={{
                maskImage: `url(${colors.icon})`,
                maskSize: "contain",
                maskRepeat: "no-repeat",
                WebkitMaskImage: `url(${colors.icon})`,
                WebkitMaskSize: "contain",
                WebkitMaskRepeat: "no-repeat",
                backgroundColor: isDone ? colors.border + "80" : colors.border,
              }}
            />
            <p
              className={`font-medium text-sm ${
                isDone ? "line-through text-text-secondary" : "text-text"
              }`}
            >
              {title}
            </p>
          </div>
        </div>
        {!isDone && (
          <ChevronDown size={16} className="flex-shrink-0 self-center text-text-tertiary" />
        )}
      </div>
    </div>
  );
}
