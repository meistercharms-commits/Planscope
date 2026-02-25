"use client";

interface PlanscopeLogoProps {
  size?: number;
  progress?: number;
  variant?: "default" | "curved" | "nested" | "angled";
  className?: string;
}

function PlanscopeLogoVariation({
  size = 80,
  progress,
  variant = "default",
  className = "",
}: PlanscopeLogoProps) {
  const strokeWidth = Math.max(size * 0.04, 1.5); // Enforce minimum stroke
  const radius = (size - strokeWidth) / 2;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;

  const arrowSize = size * 0.28;
  const arrowStroke = Math.max(size * 0.04, 1.2);
  const arrowTop = center - arrowSize * 0.55;
  const arrowBottom = center + arrowSize * 0.55;
  const arrowWing = arrowSize * 0.45;

  const showProgress = progress !== undefined && progress >= 0;
  const dashOffset = showProgress
    ? circumference - (progress / 100) * circumference
    : 0;

  const renderArrow = () => {
    if (variant === "curved") {
      // Curved arrow - spiral/funnel inward
      const curves = Math.floor(size / 15); // More curves for larger sizes
      const cx = center;
      const cy = center;

      // Create a spiral path from top to center-bottom
      let pathData = `M ${cx} ${arrowTop}`;
      for (let i = 1; i <= curves; i++) {
        const progress = i / (curves + 1);
        const x = cx + (arrowWing * Math.sin(progress * Math.PI * 2)) * (1 - progress * 0.8);
        const y = arrowTop + (arrowSize * progress);
        pathData += ` Q ${x} ${y}, ${cx} ${y + arrowSize / (curves + 1)}`;
      }

      return (
        <>
          <path
            d={pathData}
            stroke="#2E8B6A"
            strokeWidth={arrowStroke}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Arrow head */}
          <line
            x1={center - arrowWing * 0.6}
            y1={arrowBottom - arrowWing * 0.6}
            x2={center}
            y2={arrowBottom}
            stroke="#2E8B6A"
            strokeWidth={arrowStroke}
            strokeLinecap="round"
          />
          <line
            x1={center + arrowWing * 0.6}
            y1={arrowBottom - arrowWing * 0.6}
            x2={center}
            y2={arrowBottom}
            stroke="#2E8B6A"
            strokeWidth={arrowStroke}
            strokeLinecap="round"
          />
        </>
      );
    }

    if (variant === "nested") {
      // Nested arrows - 2-3 concentric scales
      const scale1 = 1;
      const scale2 = 0.65;
      const scale3 = 0.35;

      const renderNestedArrow = (scale: number) => {
        const scaledSize = arrowSize * scale;
        const scaledTop = center - scaledSize * 0.55;
        const scaledBottom = center + scaledSize * 0.55;
        const scaledWing = scaledSize * 0.45;
        const opacity = 1 - (1 - scale) * 0.3; // Slightly fade inner arrows

        return (
          <g key={`nested-${scale}`} opacity={opacity}>
            <line
              x1={center}
              y1={scaledTop}
              x2={center}
              y2={scaledBottom}
              stroke="#2E8B6A"
              strokeWidth={arrowStroke * 0.8}
              strokeLinecap="round"
            />
            <line
              x1={center - scaledWing}
              y1={scaledBottom - scaledWing}
              x2={center}
              y2={scaledBottom}
              stroke="#2E8B6A"
              strokeWidth={arrowStroke * 0.8}
              strokeLinecap="round"
            />
            <line
              x1={center + scaledWing}
              y1={scaledBottom - scaledWing}
              x2={center}
              y2={scaledBottom}
              stroke="#2E8B6A"
              strokeWidth={arrowStroke * 0.8}
              strokeLinecap="round"
            />
          </g>
        );
      };

      return (
        <>
          {renderNestedArrow(scale1)}
          {renderNestedArrow(scale2)}
          {renderNestedArrow(scale3)}
        </>
      );
    }

    if (variant === "angled") {
      // Angled arrow - 45° down-right (forward momentum)
      const angle = Math.PI / 4; // 45 degrees
      const len = arrowSize;
      const endX = center + len * Math.cos(angle);
      const endY = center + len * Math.sin(angle);
      const wingLen = arrowWing;

      return (
        <>
          {/* Main stem */}
          <line
            x1={center}
            y1={center - arrowSize * 0.4}
            x2={endX}
            y2={endY}
            stroke="#2E8B6A"
            strokeWidth={arrowStroke}
            strokeLinecap="round"
          />
          {/* Left wing */}
          <line
            x1={endX - wingLen * Math.cos(angle + Math.PI / 4)}
            y1={endY - wingLen * Math.sin(angle + Math.PI / 4)}
            x2={endX}
            y2={endY}
            stroke="#2E8B6A"
            strokeWidth={arrowStroke}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Right wing */}
          <line
            x1={endX - wingLen * Math.cos(angle - Math.PI / 4)}
            y1={endY - wingLen * Math.sin(angle - Math.PI / 4)}
            x2={endX}
            y2={endY}
            stroke="#2E8B6A"
            strokeWidth={arrowStroke}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      );
    }

    // Default - straight down arrow
    return (
      <>
        <line
          x1={center}
          y1={arrowTop}
          x2={center}
          y2={arrowBottom}
          stroke="#2E8B6A"
          strokeWidth={arrowStroke}
          strokeLinecap="round"
        />
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
      </>
    );
  };

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

      {/* Arrow */}
      {renderArrow()}
    </svg>
  );
}

// Demo component showing all 3 variations
export function LogoVariationsDemo() {
  const sizes = [28, 48, 88];
  const variants: Array<"default" | "curved" | "nested" | "angled"> = [
    "default",
    "curved",
    "nested",
    "angled",
  ];

  const labels = {
    default: "Current (Straight Down)",
    curved: "Variation A: Curved (Funnel/Scope)",
    nested: "Variation B: Nested (Iteration)",
    angled: "Variation C: Angled (Forward Momentum)",
  };

  return (
    <div className="p-8 bg-white">
      <h1 className="text-2xl font-bold mb-8">Planscope Logo Variations</h1>

      {variants.map((variant) => (
        <div key={variant} className="mb-12">
          <h2 className="text-lg font-semibold mb-6 text-gray-800">
            {labels[variant]}
          </h2>
          <div className="grid grid-cols-3 gap-8">
            {sizes.map((size) => (
              <div
                key={`${variant}-${size}`}
                className="border border-gray-200 rounded-lg p-6 flex flex-col items-center bg-gray-50"
              >
                <div className="flex items-center gap-2 mb-4">
                  <PlanscopeLogoVariation
                    size={size}
                    variant={variant}
                  />
                  <span className="text-gray-700 font-medium">
                    {size}px
                  </span>
                </div>
                <p className="text-xs text-gray-500">
                  {size === 28
                    ? "Header usage"
                    : size === 48
                      ? "Loading splash"
                      : "Spinner animation"}
                </p>

                {/* Also show with animation at 88px */}
                {size === 88 && (
                  <div className="mt-4 pt-4 border-t border-gray-200 w-full">
                    <p className="text-xs text-gray-600 mb-3">
                      With progress animation:
                    </p>
                    <div className="flex justify-center">
                      <div className="relative w-24 h-24">
                        {[0, 25, 50, 75].map((prog) => (
                          <div
                            key={prog}
                            className="absolute inset-0"
                            style={{
                              opacity: prog === 50 ? 1 : 0.3,
                            }}
                          >
                            <PlanscopeLogoVariation
                              size={88}
                              variant={variant}
                              progress={prog}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="mt-12 p-6 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="font-semibold text-blue-900 mb-3">Next Step</h3>
        <p className="text-sm text-blue-800">
          Review these 4 variations (Current + 3 new ones) and let me know which visual direction you prefer.
          Once you decide, I'll finalize that design in the actual PlanscopeLogo.tsx component.
        </p>
      </div>
    </div>
  );
}

export default PlanscopeLogoVariation;
