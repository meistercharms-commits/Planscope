"use client";

import StatsCard from "@/components/ui/StatsCard";
import { Zap, Target } from "lucide-react";

export default function HistoryPreviewPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 animate-fade-in">
      <h1 className="text-[28px] font-bold text-text font-display mb-2">
        Plan History
      </h1>
      <p className="text-sm text-text-secondary mb-6">
        5 plans created. 32 tasks completed.
      </p>

      {/* Stats summary - Grid layout */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        {/* Average Completion - Ring */}
        <StatsCard
          variant="ring"
          label="Avg. Completion"
          value={68}
          ringValue={68}
          subtext="5 weeks"
        />

        {/* Total Tasks Completed */}
        <StatsCard
          label="Tasks Completed"
          value={32}
          subtext="of 42 planned"
          icon={<Zap size={24} />}
        />

        {/* Best Week */}
        <StatsCard
          label="Best Week"
          value="95%"
          subtext="Above average"
          icon={<Target size={24} />}
        />
      </div>

      <p className="text-xs text-text-secondary mt-12">
        This is a preview of the history page stats. Visit /history when logged in to see your actual data.
      </p>
    </div>
  );
}
