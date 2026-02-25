"use client";

import { TrendingUp, AlertTriangle, RotateCcw } from "lucide-react";
import type { LearningsSummary } from "@/types";

interface LearningsInsightProps {
  learnings: LearningsSummary;
}

export default function LearningsInsight({ learnings }: LearningsInsightProps) {
  return (
    <div className="bg-primary/5 border border-primary/15 rounded-lg p-4">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-text mb-3">
        <TrendingUp size={16} className="text-primary" />
        What we&apos;ve learnt about your planning
      </h3>

      <div className="space-y-2">
        {/* Completion rate */}
        <p className="text-sm text-text-secondary">
          Across {learnings.weeksSampled} plans, you complete about{" "}
          <span className="font-medium text-text">
            {learnings.overallCompletionRate}%
          </span>{" "}
          of your tasks.
        </p>

        {/* Do-first success */}
        {learnings.doFirstSuccess >= 70 && (
          <p className="text-sm text-text-secondary">
            <span className="text-primary font-medium">
              {learnings.doFirstSuccess}% do-first success
            </span>{" "}
            &mdash; you&apos;re great at tackling priorities.
          </p>
        )}

        {/* Strong categories */}
        {learnings.strongCategories.length > 0 && (
          <p className="text-sm text-text-secondary">
            You&apos;re strongest in{" "}
            <span className="font-medium text-text">
              {learnings.strongCategories.join(", ")}
            </span>{" "}
            tasks.
          </p>
        )}

        {/* Weak categories */}
        {learnings.weakCategories.length > 0 && (
          <p className="text-sm text-text-secondary">
            <span className="capitalize font-medium text-text">
              {learnings.weakCategories.join(", ")}
            </span>{" "}
            tasks tend to slip &mdash; we&apos;ve adjusted your plan to start
            smaller there.
          </p>
        )}

        {/* Overcommitment warning */}
        {learnings.overcommitmentWarning && (
          <div className="flex items-start gap-2 mt-1">
            <AlertTriangle
              size={14}
              className="text-accent flex-shrink-0 mt-0.5"
            />
            <p className="text-sm text-text-secondary">
              You tend to plan more than you finish. This plan has been adjusted
              to be more realistic.
            </p>
          </div>
        )}

        {/* Recurring issues */}
        {learnings.recurringIssues.length > 0 && (
          <div className="flex items-start gap-2 mt-1">
            <RotateCcw
              size={14}
              className="text-text-tertiary flex-shrink-0 mt-0.5"
            />
            <p className="text-sm text-text-secondary">
              {learnings.recurringIssues.length === 1
                ? `"${learnings.recurringIssues[0].title}" keeps appearing (${learnings.recurringIssues[0].count} times). Is something blocking it?`
                : `${learnings.recurringIssues.length} tasks keep reappearing without getting done. Worth asking: are they really doable this week?`}
            </p>
          </div>
        )}

        {/* Top recommendation */}
        <p className="text-xs text-text-tertiary mt-2 italic">
          {learnings.topRecommendation}
        </p>
      </div>
    </div>
  );
}
