"use client";

interface PlanscopeLogoProps {
  size?: number;
  progress?: number; // 0-100, if set shows progress ring
  color?: string;
  variant?: "default" | "inverted" | "mono";
  showCircle?: boolean; // true = circle container (loading/header), false = icon only
  className?: string;
}

export default function PlanscopeLogo({
  size = 80,
  progress,
  color,
  variant = "default",
  showCircle = true,
  className = "",
}: PlanscopeLogoProps) {
  const strokeWidth = Math.max(size * 0.04, 1.5);
  const radius = (size - strokeWidth) / 2;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;

  const showProgress = progress !== undefined && progress >= 0;
  const dashOffset = showProgress
    ? circumference - (progress / 100) * circumference
    : 0;

  // Resolve arrow color based on variant
  const arrowColor =
    color ??
    (variant === "inverted"
      ? "#FFFFFF"
      : variant === "mono"
        ? "#000000"
        : "#2E8B6A");

  // Arrow stroke: scaled from 2px on 100px artboard
  const arrowStroke = Math.max((size / 100) * 2, 1.2);

  // Scale factor from 100px artboard to current size
  const s = size / 100;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      fill="none"
      className={className}
    >
      {/* Circle container (track) */}
      {showCircle && (
        <circle
          cx={center}
          cy={center}
          r={radius}
          stroke={showProgress ? "#E8E8E6" : arrowColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
      )}

      {/* Progress ring */}
      {showProgress && (
        <circle
          cx={center}
          cy={center}
          r={radius}
          stroke={arrowColor}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          style={{
            transform: "rotate(-90deg)",
            transformOrigin: "center",
            transition: "stroke-dashoffset 0.6s ease-out",
          }}
        />
      )}

      {/* Outer arrow (100% opacity) */}
      <path
        d={`M${38 * s} ${55 * s}L${50 * s} ${70 * s}M${50 * s} ${70 * s}L${62 * s} ${55 * s}M${50 * s} ${70 * s}V${30 * s}`}
        stroke={arrowColor}
        strokeWidth={arrowStroke}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Middle arrow (75% opacity) */}
      <g opacity="0.75">
        <path
          d={`M${42 * s} ${52 * s}L${50 * s} ${62 * s}M${50 * s} ${62 * s}L${58 * s} ${52 * s}M${50 * s} ${62 * s}V${38 * s}`}
          stroke={arrowColor}
          strokeWidth={arrowStroke}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>

      {/* Inner arrow (50% opacity) */}
      <g opacity="0.5">
        <path
          d={`M${45 * s} ${50 * s}L${50 * s} ${55 * s}M${50 * s} ${55 * s}L${55 * s} ${50 * s}M${50 * s} ${55 * s}V${45 * s}`}
          stroke={arrowColor}
          strokeWidth={arrowStroke}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
}
