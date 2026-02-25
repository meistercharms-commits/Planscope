"use client";

import { Eye, EyeOff, Plus, ChevronDown, ChevronRight, Bookmark } from "lucide-react";
import Button from "@/components/ui/Button";
import ProgressBar from "@/components/ui/ProgressBar";

export default function PlanProgressPreviewPage() {
  return (
    <div>
      <style>{`
        @keyframes checkScaleAnimation {
          0% { transform: scale(0.5); opacity: 0; }
          50% { transform: scale(1.2); }
          100% { transform: scale(1); opacity: 1; }
        }
        .animate-checkmark {
          animation: checkScaleAnimation 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        @keyframes slideOutLeft {
          0% { opacity: 1; transform: translateX(0); }
          100% { opacity: 0; transform: translateX(-100px); }
        }
        .animate-task-complete {
          animation: slideOutLeft 0.5s ease-out forwards;
        }
      `}</style>

      {/* Progress Bar */}
      <ProgressBar done={5} total={7} />

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6">
        {/* Plan Header */}
        <div className="mb-6">
          <h1 className="text-[28px] font-bold text-text font-display">
            Week of Feb 24
          </h1>
        </div>

        {/* Do First */}
        <section className="mb-6">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-text mb-3 font-display">
            <img src="/icons/do_first.svg" alt="" className="w-5 h-5" />
            Do First
          </h2>
          <div className="space-y-2">
            <div className="flex items-start gap-3 p-4 rounded-lg bg-bg-card shadow-card cursor-pointer">
              <div className="w-5 h-5 rounded border border-border bg-primary flex-shrink-0 flex items-center justify-center mt-0.5">
                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm line-through text-text-secondary">Finish Q1 project report</p>
                <p className="text-xs text-text-secondary mt-0.5">30 mins</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 rounded-lg bg-bg-card shadow-card cursor-pointer hover:shadow-sm transition-all">
              <div className="w-5 h-5 rounded border border-border flex-shrink-0 flex items-center justify-center mt-0.5"></div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-text">Client call prep</p>
                <p className="text-xs text-text-secondary mt-0.5">15 mins</p>
              </div>
            </div>
          </div>
        </section>

        <div className="h-px bg-border mb-6" />

        {/* This Week */}
        <section className="mb-6">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-text mb-3 font-display">
            <img src="/icons/this_week.svg" alt="" className="w-5 h-5" />
            This Week (7 tasks)
          </h2>

          <div className="mb-4">
            <h3 className="text-sm font-medium text-text mb-2 capitalize">work (3)</h3>
            <div className="space-y-2">
              <div className="flex items-start gap-3 p-4 rounded-lg bg-bg-card shadow-card cursor-pointer hover:shadow-sm transition-all">
                <div className="w-5 h-5 rounded border border-border flex-shrink-0 flex items-center justify-center mt-0.5"></div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <img src="/icons/work.svg" alt="work" className="w-4 h-4 flex-shrink-0" />
                    <p className="font-medium text-sm text-text">Send proposal</p>
                  </div>
                  <p className="text-xs text-text-secondary mt-0.5">20 mins</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 rounded-lg bg-bg-subtle opacity-60 cursor-pointer">
                <div className="w-5 h-5 rounded border border-border bg-primary flex-shrink-0 flex items-center justify-center mt-0.5">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <img src="/icons/work.svg" alt="work" className="w-4 h-4 flex-shrink-0" />
                    <p className="font-medium text-sm line-through text-text-secondary">Review feedback</p>
                  </div>
                  <p className="text-xs text-text-secondary mt-0.5">15 mins</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mb-4">
            <h3 className="text-sm font-medium text-text mb-2 capitalize">health (2)</h3>
            <div className="space-y-2">
              <div className="flex items-start gap-3 p-4 rounded-lg bg-bg-card shadow-card cursor-pointer hover:shadow-sm transition-all">
                <div className="w-5 h-5 rounded border border-border flex-shrink-0 flex items-center justify-center mt-0.5"></div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <img src="/icons/health.svg" alt="health" className="w-4 h-4 flex-shrink-0" />
                    <p className="font-medium text-sm text-text">Morning run 3x</p>
                  </div>
                  <p className="text-xs text-text-secondary mt-0.5">30 mins</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="h-px bg-border mb-6" />

        {/* Not This Week */}
        <section className="mb-6">
          <div className="bg-bg-card rounded-lg shadow-card p-4">
            <button className="flex items-center gap-2 font-semibold text-text w-full text-left cursor-pointer">
              <ChevronDown size={18} />
              <img src="/icons/not_this_week.svg" alt="" className="w-5 h-5" />
              Not This Week (2 safely parked)
            </button>
            <p className="text-xs text-text-secondary italic mt-1 ml-[26px]">
              These matter, just not this week. You're not dropping them.
            </p>
            <div className="mt-3 pt-3 border-t border-border space-y-2">
              <div className="text-sm text-text-secondary pl-2">
                • Plan team offsite
              </div>
              <div className="text-sm text-text-secondary pl-2">
                • Reorganize home office
              </div>
            </div>
          </div>
        </section>

        {/* Action Buttons */}
        <div className="space-y-3 pt-4 pb-8">
          <Button variant="secondary" fullWidth>
            <EyeOff size={16} className="mr-2" /> Collapse done
          </Button>

          <Button variant="secondary" fullWidth>
            <Plus size={16} className="mr-2" /> Add task (1 slots left)
          </Button>
        </div>
      </div>
    </div>
  );
}
