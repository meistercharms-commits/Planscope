"use client";

interface PlanscopeLogoProps {
  size?: number;
  progress?: number; // 0-100, if set shows progress ring
  className?: string;
}

export default function PlanscopeLogo({
  size = 80,
  progress,
  className = "",
}: PlanscopeLogoProps) {
  const strokeWidth = size * 0.04;
  const radius = (size - strokeWidth) / 2;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;

  // Arrow sizing relative to container
  const arrowSize = size * 0.28;
  const arrowStroke = size * 0.04;
  const arrowTop = center - arrowSize * 0.55;
  const arrowBottom = center + arrowSize * 0.55;
  const arrowWing = arrowSize * 0.45;

  const showProgress = progress !== undefined && progress >= 0;
  const dashOffset = showProgress
    ? circumference - (progress / 100) * circumference
    : 0;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      fill="none"
      className={className}
    >
      {/* Background circle (track) */}
      <circle
        cx={center}
        cy={center}
        r={radius}
        stroke={showProgress ? "#E8E8E6" : "#2E8B6A"}
        strokeWidth={strokeWidth}
        fill="none"
      />

      {/* Progress ring */}
      {showProgress && (
        <circle
          cx={center}
          cy={center}
          r={radius}
          stroke="#2E8B6A"
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

      {/* Down arrow - stem */}
      <line
        x1={center}
        y1={arrowTop}
        x2={center}
        y2={arrowBottom}
        stroke="#2E8B6A"
        strokeWidth={arrowStroke}
        strokeLinecap="round"
      />

      {/* Down arrow - left wing */}
      <line
        x1={center - arrowWing}
        y1={arrowBottom - arrowWing}
        x2={center}
        y2={arrowBottom}
        stroke="#2E8B6A"
        strokeWidth={arrowStroke}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Down arrow - right wing */}
      <line
        x1={center + arrowWing}
        y1={arrowBottom - arrowWing}
        x2={center}
        y2={arrowBottom}
        stroke="#2E8B6A"
        strokeWidth={arrowStroke}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
