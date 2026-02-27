"use client";

import Link from "next/link";
import { Eye, EyeOff, Plus, ChevronDown, ChevronRight, Check, Bookmark, Archive, Zap } from "lucide-react";
import Button from "@/components/ui/Button";
import ProgressBar from "@/components/ui/ProgressBar";
import { getCategoryColors, type CategoryColorScheme } from "@/lib/category-colors";

function CategoryIcon({ colors, done }: { colors: CategoryColorScheme; done?: boolean }) {
  return (
    <span
      className="w-4 h-4 flex-shrink-0 inline-block"
      style={{
        maskImage: `url(${colors.icon})`,
        maskSize: "contain",
        maskRepeat: "no-repeat",
        WebkitMaskImage: `url(${colors.icon})`,
        WebkitMaskSize: "contain",
        WebkitMaskRepeat: "no-repeat",
        backgroundColor: done ? colors.border + "80" : colors.border,
      }}
    />
  );
}

export default function PlanProgressPreviewPage() {
  // Day mode preview
  const workColors = getCategoryColors("work");
  const healthColors = getCategoryColors("health");
  const homeColors = getCategoryColors("home");
  const moneyColors = getCategoryColors("money");
  const lifeColors = getCategoryColors("life");

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
      `}</style>

      {/* Progress Bar */}
      <ProgressBar done={2} total={5} />

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6">
        {/* Plan Header */}
        <div className="mb-6">
          <h1 className="text-[28px] font-bold text-text font-display">
            Today
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            5 tasks
          </p>
        </div>

        {/* Do First */}
        <section className="mb-6">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-text mb-3 font-display">
            <img src="/icons/do_first.svg" alt="" className="w-5 h-5" />
            Do First
          </h2>
          <div className="space-y-2">
            {/* Done task — no chevron */}
            <div
              className="flex items-start gap-3 p-4 rounded-lg cursor-pointer transition-all duration-200 border-l-[3px] bg-bg-subtle opacity-60"
              style={{ borderLeftColor: workColors.border + "80" }}
            >
              <div
                className="w-5 h-5 rounded border-transparent flex-shrink-0 flex items-center justify-center mt-0.5"
                style={{ backgroundColor: workColors.checkboxDone, borderColor: workColors.checkboxDone }}
              >
                <Check size={14} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <CategoryIcon colors={workColors} done />
                  <p className="font-medium text-sm line-through text-text-secondary flex-1">
                    Send invoice to client
                  </p>
                </div>
                <p className="text-xs text-text-secondary mt-1 ml-6">
                  Check amounts match the quote.
                </p>
                <div className="flex items-center gap-1 mt-1.5 ml-6">
                  <img src="/icons/timer.svg" alt="" className="w-3 h-3 opacity-40" />
                  <span className="text-xs text-text-secondary">15 mins</span>
                </div>
              </div>
            </div>

            {/* Pending task — with focus chevron */}
            <div
              className="flex items-start gap-3 p-4 rounded-lg cursor-pointer transition-all duration-200 border-l-[3px] bg-bg-card shadow-card"
              style={{ borderLeftColor: moneyColors.border }}
            >
              <div className="w-5 h-5 rounded border border-border flex-shrink-0 flex items-center justify-center mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <CategoryIcon colors={moneyColors} />
                  <p className="font-medium text-sm text-text flex-1">
                    Review savings account options
                  </p>
                  <span
                    className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: moneyColors.badge, color: moneyColors.badgeText }}
                  >
                    {moneyColors.label}
                  </span>
                </div>
                <p className="text-xs text-text-secondary mt-1 ml-6">
                  Compare rates before Thursday.
                </p>
                <div className="flex items-center gap-1 mt-1.5 ml-6">
                  <img src="/icons/timer.svg" alt="" className="w-3 h-3 opacity-40" />
                  <span className="text-xs text-text-secondary">20 mins</span>
                </div>
              </div>
              <Link
                href="/preview/focus"
                className="flex-shrink-0 self-center p-2 -mr-2 text-text-tertiary hover:text-primary transition-colors"
              >
                <ChevronRight size={18} />
              </Link>
            </div>
          </div>
        </section>

        <div className="h-px bg-border mb-6" />

        {/* Today */}
        <section className="mb-6">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-text mb-3 font-display">
            <img src="/icons/timer.svg" alt="" className="w-5 h-5" />
            Today
          </h2>

          {/* Health category */}
          <div className="mb-4">
            <h3 className="text-sm font-medium text-text mb-2 flex items-center gap-2">
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: healthColors.border }}
              />
              {healthColors.label}
              <span className="text-text-secondary font-normal">(1)</span>
            </h3>
            <div className="space-y-2">
              <div
                className="flex items-start gap-3 p-4 rounded-lg cursor-pointer transition-all duration-200 border-l-[3px] bg-bg-card shadow-card"
                style={{ borderLeftColor: healthColors.border }}
              >
                <div className="w-5 h-5 rounded border border-border flex-shrink-0 flex items-center justify-center mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <CategoryIcon colors={healthColors} />
                    <p className="font-medium text-sm text-text flex-1">
                      30-minute walk after lunch
                    </p>
                    <span
                      className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: healthColors.badge, color: healthColors.badgeText }}
                    >
                      {healthColors.label}
                    </span>
                  </div>
                  <p className="text-xs text-text-secondary mt-1 ml-6">
                    Fresh air helps with afternoon focus.
                  </p>
                  <div className="flex items-center gap-1 mt-1.5 ml-6">
                    <img src="/icons/timer.svg" alt="" className="w-3 h-3 opacity-40" />
                    <span className="text-xs text-text-secondary">30 mins</span>
                  </div>
                </div>
                <Link
                  href="/preview/focus"
                  className="flex-shrink-0 self-center p-2 -mr-2 text-text-tertiary hover:text-primary transition-colors"
                >
                  <ChevronRight size={18} />
                </Link>
              </div>
            </div>
          </div>

          {/* Home category */}
          <div className="mb-4">
            <h3 className="text-sm font-medium text-text mb-2 flex items-center gap-2">
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: homeColors.border }}
              />
              {homeColors.label}
              <span className="text-text-secondary font-normal">(1)</span>
            </h3>
            <div className="space-y-2">
              {/* Done task — no chevron */}
              <div
                className="flex items-start gap-3 p-4 rounded-lg cursor-pointer transition-all duration-200 border-l-[3px] bg-bg-subtle opacity-60"
                style={{ borderLeftColor: homeColors.border + "80" }}
              >
                <div
                  className="w-5 h-5 rounded border-transparent flex-shrink-0 flex items-center justify-center mt-0.5"
                  style={{ backgroundColor: homeColors.checkboxDone, borderColor: homeColors.checkboxDone }}
                >
                  <Check size={14} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <CategoryIcon colors={homeColors} done />
                    <p className="font-medium text-sm line-through text-text-secondary flex-1">
                      Call electrician about kitchen light
                    </p>
                  </div>
                  <div className="flex items-center gap-1 mt-1.5 ml-6">
                    <img src="/icons/timer.svg" alt="" className="w-3 h-3 opacity-40" />
                    <span className="text-xs text-text-secondary">10 mins</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Life category */}
          <div className="mb-4">
            <h3 className="text-sm font-medium text-text mb-2 flex items-center gap-2">
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: lifeColors.border }}
              />
              {lifeColors.label}
              <span className="text-text-secondary font-normal">(1)</span>
            </h3>
            <div className="space-y-2">
              <div
                className="flex items-start gap-3 p-4 rounded-lg cursor-pointer transition-all duration-200 border-l-[3px] bg-bg-card shadow-card"
                style={{ borderLeftColor: lifeColors.border }}
              >
                <div className="w-5 h-5 rounded border border-border flex-shrink-0 flex items-center justify-center mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <CategoryIcon colors={lifeColors} />
                    <p className="font-medium text-sm text-text flex-1">
                      Reply to Mum about weekend plans
                    </p>
                    <span
                      className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: lifeColors.badge, color: lifeColors.badgeText }}
                    >
                      {lifeColors.label}
                    </span>
                    <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-full flex-shrink-0 bg-accent/10 text-accent">
                      <Zap size={10} className="fill-current" />
                      Quick win
                    </span>
                  </div>
                  <div className="flex items-center gap-1 mt-1.5 ml-6">
                    <img src="/icons/timer.svg" alt="" className="w-3 h-3 opacity-40" />
                    <span className="text-xs text-text-secondary">5 mins</span>
                  </div>
                </div>
                <Link
                  href="/preview/focus"
                  className="flex-shrink-0 self-center p-2 -mr-2 text-text-tertiary hover:text-primary transition-colors"
                >
                  <ChevronRight size={18} />
                </Link>
              </div>
            </div>
          </div>
        </section>

        <div className="h-px bg-border mb-6" />

        {/* Not Today */}
        <section className="mb-6">
          <div className="bg-bg-card rounded-lg shadow-card p-4">
            <button className="flex items-center gap-2 font-semibold text-text w-full text-left cursor-pointer">
              <ChevronDown size={18} />
              <img src="/icons/not_this_week.svg" alt="" className="w-5 h-5" />
              Not Today (2 safely parked)
            </button>
            <p className="text-xs text-text-secondary italic mt-1 ml-[26px]">
              These matter, just not today. You&apos;re not dropping them.
            </p>
            <div className="mt-3 pt-3 border-t border-border space-y-2">
              <div className="text-sm text-text-secondary pl-2">
                &bull; Deep clean the bathroom
              </div>
              <div className="text-sm text-text-secondary pl-2">
                &bull; Research holiday flights
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
            <Plus size={16} className="mr-2" /> Add task (2 slots left)
          </Button>

          {/* Archive plan */}
          <div className="pt-4 border-t border-border">
            <button className="w-full flex items-center justify-center gap-2 py-3 text-sm text-text-secondary hover:text-text transition-colors cursor-pointer">
              <Archive size={16} />
              Archive this plan
            </button>
            <p className="text-xs text-text-tertiary text-center mt-1">
              Moves this plan to your history so you can start fresh.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
