"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import SegmentedControl from "@/components/ui/SegmentedControl";
import Spinner from "@/components/ui/Spinner";

export default function NewPlanPage() {
  const router = useRouter();
  const [dump, setDump] = useState("");
  const [mode, setMode] = useState("week");
  const [timeAvailable, setTimeAvailable] = useState("medium");
  const [energyLevel, setEnergyLevel] = useState("ok");
  const [focusArea, setFocusArea] = useState("work");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/generate-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dump,
          mode,
          time_available: timeAvailable,
          energy_level: energyLevel,
          focus_area: focusArea,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to generate plan");
      }

      const { id } = await res.json();
      router.push(`/plan/${id}`);
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  }

  if (loading) {
    return <Spinner />;
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      <div className="animate-fade-in">
        <h1 className="text-[28px] font-bold text-text font-display mb-2">
          What&apos;s on your mind?
        </h1>
        <p className="text-sm text-text-secondary mb-8">
          Dump everything. We&apos;ll make sense of it.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Mode Toggle */}
          <SegmentedControl
            label="Mode"
            options={[
              { value: "today", label: "Today" },
              { value: "week", label: "This Week" },
            ]}
            value={mode}
            onChange={setMode}
          />

          {/* Brain Dump */}
          <div>
            <Textarea
              placeholder="Finish Q2 proposal. Call client about scope change. Code review for team backend. Update project docs. Prep for 1:1s. Should really exercise this week..."
              value={dump}
              onChange={(e) => setDump(e.target.value)}
              className="min-h-[180px] sm:min-h-[220px]"
              required
            />
            <p className="text-xs text-text-tertiary mt-1.5 text-right">
              {dump.length} characters {dump.length < 20 && dump.length > 0 && "(need at least 20)"}
            </p>
          </div>

          {/* Constraints */}
          <SegmentedControl
            label={`Time ${mode === "today" ? "today" : "this week"}`}
            options={[
              { value: "low", label: "Low" },
              { value: "medium", label: "Medium" },
              { value: "high", label: "High" },
            ]}
            value={timeAvailable}
            onChange={setTimeAvailable}
          />

          <SegmentedControl
            label="Energy level"
            options={[
              { value: "drained", label: "Drained" },
              { value: "ok", label: "OK" },
              { value: "fired_up", label: "Fired up" },
            ]}
            value={energyLevel}
            onChange={setEnergyLevel}
          />

          <SegmentedControl
            label="Main focus"
            options={[
              { value: "work", label: "Work" },
              { value: "health", label: "Health" },
              { value: "home", label: "Home" },
              { value: "money", label: "Money" },
              { value: "other", label: "Other" },
            ]}
            value={focusArea}
            onChange={setFocusArea}
          />

          <p className="text-xs text-text-secondary">
            This helps Planscope pick realistic tasks for you.
          </p>

          {/* Error */}
          {error && (
            <div className="px-4 py-3 bg-error/5 border border-error/20 rounded-md text-sm text-error">
              {error}
            </div>
          )}

          {/* Submit */}
          <Button
            type="submit"
            fullWidth
            size="lg"
            disabled={dump.length < 20}
          >
            Make me a plan
          </Button>
        </form>
      </div>
    </div>
  );
}
