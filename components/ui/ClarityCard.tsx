"use client";

import { forwardRef } from "react";

interface ClarityCardProps {
  thoughtsCount: number;
  prioritiesCount: number;
  totalTasks: number;
  parkedCount: number;
  weekLabel: string;
  mode: string;
}

const ClarityCard = forwardRef<HTMLDivElement, ClarityCardProps>(
  ({ thoughtsCount, prioritiesCount, totalTasks, parkedCount, weekLabel, mode }, ref) => {
    const periodLabel = mode === "today" ? "Day planned." : "Week planned.";

    return (
      <div
        ref={ref}
        style={{
          width: 400,
          borderRadius: 28,
          overflow: "hidden",
          background: "linear-gradient(150deg, #f8fdf9 0%, #edfcf3 30%, #dff6e8 60%, #d4f1e0 100%)",
          color: "#2a2a2a",
          position: "relative",
          fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
          boxShadow: "0 30px 60px rgba(46,139,106,0.15), 0 0 0 1.5px rgba(46,139,106,0.12)",
        }}
      >
        <div style={{ padding: "32px 28px 24px", position: "relative" }}>
          {/* Confetti dots */}
          {[
            { w: 8, bg: "#E8943D", top: 18, right: 50, opacity: 0.5 },
            { w: 6, bg: "#4A90B0", top: 45, right: 28, opacity: 0.4 },
            { w: 5, bg: "#2E8B6A", top: 12, right: 90, opacity: 0.35 },
            { w: 7, bg: "#E8943D", top: 60, left: 30, opacity: 0.3 },
            { w: 4, bg: "#4A90B0", top: 25, left: 60, opacity: 0.4 },
            { w: 6, bg: "#2E8B6A", top: 50, right: 70, opacity: 0.25 },
          ].map((dot, i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                borderRadius: "50%",
                width: dot.w,
                height: dot.w,
                background: dot.bg,
                top: dot.top,
                ...(dot.right !== undefined ? { right: dot.right } : {}),
                ...(dot.left !== undefined ? { left: dot.left } : {}),
                opacity: dot.opacity,
              }}
            />
          ))}

          {/* Header */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 24,
              position: "relative",
              zIndex: 1,
            }}
          >
            <span style={{ fontSize: 12, fontWeight: 600, color: "#808080", letterSpacing: 0.3 }}>
              {mode === "today" ? "Today" : `Week of ${weekLabel}`}
            </span>
            <span style={{ fontSize: 13, fontWeight: 800, color: "#2E8B6A", letterSpacing: 0.2 }}>
              planscope
            </span>
          </div>

          {/* Transformation */}
          <div style={{ textAlign: "center", marginBottom: 20, position: "relative", zIndex: 1 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 16,
                marginBottom: 16,
              }}
            >
              {/* Thoughts */}
              <div style={{ textAlign: "center" }}>
                <div
                  style={{
                    fontSize: 72,
                    fontWeight: 900,
                    lineHeight: 1,
                    letterSpacing: -4,
                    color: "#c8c8c8",
                  }}
                >
                  {thoughtsCount}
                </div>
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    textTransform: "uppercase" as const,
                    letterSpacing: 2,
                    marginTop: 4,
                    color: "#b0b0b0",
                  }}
                >
                  Thoughts
                </div>
              </div>

              {/* Arrow */}
              <div style={{ position: "relative", width: 40, height: 2 }}>
                <div
                  style={{
                    width: 40,
                    height: 2,
                    background: "linear-gradient(90deg, #c8c8c8, #2E8B6A)",
                    borderRadius: 1,
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    right: -1,
                    top: -4,
                    width: 0,
                    height: 0,
                    borderTop: "5px solid transparent",
                    borderBottom: "5px solid transparent",
                    borderLeft: "7px solid #2E8B6A",
                  }}
                />
              </div>

              {/* Priorities */}
              <div style={{ textAlign: "center" }}>
                <div
                  style={{
                    fontSize: 72,
                    fontWeight: 900,
                    lineHeight: 1,
                    letterSpacing: -4,
                    color: "#2E8B6A",
                  }}
                >
                  {prioritiesCount}
                </div>
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    textTransform: "uppercase" as const,
                    letterSpacing: 2,
                    marginTop: 4,
                    color: "#2E8B6A",
                  }}
                >
                  Priorities
                </div>
              </div>
            </div>

            {/* Headline */}
            <div style={{ fontSize: 22, fontWeight: 800, color: "#2a2a2a", lineHeight: 1.25, letterSpacing: -0.5 }}>
              Brain cleared. <span style={{ color: "#2E8B6A" }}>{periodLabel}</span>
            </div>

            {/* Achievement pill */}
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                background: "white",
                border: "1.5px solid rgba(46,139,106,0.15)",
                borderRadius: 100,
                padding: "6px 14px",
                marginTop: 12,
                boxShadow: "0 2px 8px rgba(46,139,106,0.08)",
              }}
            >
              <span style={{ fontSize: 14, lineHeight: 1 }}>&#10024;</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#2E8B6A", letterSpacing: 0.2 }}>
                Nothing forgotten
              </span>
            </div>
          </div>

          {/* Divider */}
          <div
            style={{
              height: 1.5,
              background: "linear-gradient(90deg, transparent, rgba(46,139,106,0.12), transparent)",
              margin: "20px 0",
            }}
          />

          {/* Stats */}
          <div style={{ display: "flex", justifyContent: "center", gap: 12, marginBottom: 20 }}>
            {[
              { value: String(totalTasks), label: "Tasks" },
              { value: String(parkedCount), label: "Parked" },
              { value: "100%", label: "Captured", highlight: true },
            ].map((stat) => (
              <div
                key={stat.label}
                style={{
                  background: "white",
                  borderRadius: 14,
                  padding: "10px 16px",
                  textAlign: "center",
                  flex: 1,
                  boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
                  border: "1px solid rgba(46,139,106,0.08)",
                }}
              >
                <div
                  style={{
                    fontSize: 20,
                    fontWeight: 800,
                    color: stat.highlight ? "#2E8B6A" : "#2a2a2a",
                    letterSpacing: -0.5,
                  }}
                >
                  {stat.value}
                </div>
                <div
                  style={{
                    fontSize: 9,
                    fontWeight: 600,
                    color: "#a0a0a0",
                    textTransform: "uppercase" as const,
                    letterSpacing: 1,
                    marginTop: 1,
                  }}
                >
                  {stat.label}
                </div>
              </div>
            ))}
          </div>

          {/* Bottom bar */}
          <div
            style={{
              background: "white",
              margin: "0 -28px -24px",
              padding: "14px 28px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              borderTop: "1px solid rgba(46,139,106,0.08)",
            }}
          >
            <span style={{ fontSize: 12, fontWeight: 700, color: "#2E8B6A" }}>
              Plan your {mode === "today" ? "day" : "week"} in 2 minutes
            </span>
            <span style={{ fontSize: 11, color: "#b0b0b0", fontWeight: 500 }}>planscope.app</span>
          </div>
        </div>
      </div>
    );
  }
);

ClarityCard.displayName = "ClarityCard";

export default ClarityCard;
