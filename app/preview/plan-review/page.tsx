"use client";

import { AlertTriangle, MessageCircle, ChevronDown } from "lucide-react";
import Button from "@/components/ui/Button";

export default function PlanReviewPreviewPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      {/* Headline */}
      <div className="animate-fade-in mb-6">
        <h1 className="text-[28px] font-bold text-text font-display leading-tight">
          This week's got potential
        </h1>
        <p className="text-sm text-text-secondary mt-1">Feb 24 – Mar 2</p>
      </div>

      {/* Burnout Alert */}
      <div className="animate-fade-in mb-6 bg-accent/5 border border-accent/20 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle size={20} className="text-accent flex-shrink-0 mt-0.5" />
          <p className="text-sm text-text leading-relaxed">
            You've got a full plate with 10 tasks. Consider parking 2-3 lower-priority items to stay focused.
          </p>
        </div>
      </div>

      <div className="h-px bg-border mb-6" />

      {/* Do First */}
      <section className="mb-8">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-text mb-4 font-display">
          <img src="/icons/do_first.svg" alt="" className="w-5 h-5" />
          Do First
        </h2>
        <div className="space-y-3">
          <div className="bg-bg-card rounded-lg p-4 shadow-card">
            <div className="flex items-center gap-2 mb-1">
              <img src="/icons/work.svg" alt="work" className="w-4 h-4 flex-shrink-0" />
              <p className="font-medium text-text">Finish Q1 project report</p>
            </div>
            <p className="text-xs text-text-secondary">30 mins • High effort</p>
          </div>
          <div className="bg-bg-card rounded-lg p-4 shadow-card">
            <div className="flex items-center gap-2 mb-1">
              <img src="/icons/work.svg" alt="work" className="w-4 h-4 flex-shrink-0" />
              <p className="font-medium text-text">Client call preparation</p>
            </div>
            <p className="text-xs text-text-secondary">15 mins • Medium effort</p>
          </div>
        </div>
      </section>

      <div className="h-px bg-border mb-6" />

      {/* This Week */}
      <section className="mb-8">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-text mb-4 font-display">
          <img src="/icons/this_week.svg" alt="" className="w-5 h-5" />
          This Week (7 tasks)
        </h2>

        <div className="mb-4">
          <h3 className="text-sm font-medium text-text mb-2 capitalize">work (4)</h3>
          <div className="space-y-3">
            <div className="bg-bg-card rounded-lg p-4 shadow-card">
              <div className="flex items-center gap-2 mb-1">
                <img src="/icons/work.svg" alt="work" className="w-4 h-4 flex-shrink-0" />
                <p className="font-medium text-text">Send proposal to client</p>
              </div>
              <p className="text-xs text-text-secondary">20 mins • Medium effort</p>
            </div>
            <div className="bg-bg-card rounded-lg p-4 shadow-card">
              <div className="flex items-center gap-2 mb-1">
                <img src="/icons/work.svg" alt="work" className="w-4 h-4 flex-shrink-0" />
                <p className="font-medium text-text">Review team feedback</p>
              </div>
              <p className="text-xs text-text-secondary">15 mins • Low effort</p>
            </div>
          </div>
        </div>

        <div className="mb-4">
          <h3 className="text-sm font-medium text-text mb-2 capitalize">health (2)</h3>
          <div className="space-y-3">
            <div className="bg-bg-card rounded-lg p-4 shadow-card">
              <div className="flex items-center gap-2 mb-1">
                <img src="/icons/health.svg" alt="health" className="w-4 h-4 flex-shrink-0" />
                <p className="font-medium text-text">Morning run 3x this week</p>
              </div>
              <p className="text-xs text-text-secondary">30 mins • Low effort</p>
            </div>
          </div>
        </div>
      </section>

      <div className="h-px bg-border mb-6" />

      {/* Not This Week */}
      <section className="mb-8">
        <div className="bg-bg-card rounded-lg shadow-card p-4">
          <button className="flex items-center gap-2 font-semibold text-text w-full text-left cursor-pointer">
            <ChevronDown size={18} />
            <img src="/icons/not_this_week.svg" alt="" className="w-5 h-5" />
            Not This Week (3 safely parked)
          </button>
          <p className="text-xs text-text-secondary italic mt-1 ml-[26px]">
            These matter, just not this week. You're not dropping them.
          </p>

          <div className="mt-3 pt-3 border-t border-border space-y-3">
            <div className="text-sm text-text-secondary pl-2">
              • Plan team offsite
            </div>
            <div className="text-sm text-text-secondary pl-2">
              • Deep dive into new tech
            </div>
            <div className="text-sm text-text-secondary pl-2">
              • Reorganize home office
            </div>
          </div>
        </div>
      </section>

      {/* Reality Check */}
      <section className="mb-8">
        <div className="bg-bg-card rounded-lg shadow-card p-4">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-text mb-2">
            <MessageCircle size={16} className="text-primary" />
            Reality check
          </h3>
          <p className="text-sm text-text-secondary leading-relaxed">
            You've got 2 of your strongest categories this week (work and health). The 7-item limit means you'll need to stay disciplined, but this is doable.
          </p>
        </div>
      </section>

      {/* Action Buttons */}
      <div className="flex gap-2 pt-4 pb-8">
        <Button fullWidth>
          Accept & Get going
        </Button>
      </div>
    </div>
  );
}
