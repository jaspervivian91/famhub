/**
 * Visual indicators and helpers for relationship health scores.
 */
import type { ScoreCategory } from "~/lib/types";

export interface ScoreIndicatorProps {
  score: number;
  category: ScoreCategory;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
}

const CATEGORY_CONFIG: Record<
  ScoreCategory,
  { color: string; ring: string; bg: string; label: string; emoji: string }
> = {
  dormant: {
    color: "text-rose-600",
    ring: "stroke-rose-500",
    bg: "bg-rose-100",
    label: "Needs attention",
    emoji: "🔴",
  },
  cooling: {
    color: "text-amber-600",
    ring: "stroke-amber-500",
    bg: "bg-amber-100",
    label: "Cooling down",
    emoji: "🟡",
  },
  steady: {
    color: "text-teal-600",
    ring: "stroke-teal-500",
    bg: "bg-teal-100",
    label: "Steady",
    emoji: "🟢",
  },
  thriving: {
    color: "text-emerald-600",
    ring: "stroke-emerald-500",
    bg: "bg-emerald-100",
    label: "Thriving",
    emoji: "💚",
  },
};

const SIZE_MAP = {
  sm: { ring: 32, stroke: 3, text: "text-xs" },
  md: { ring: 48, stroke: 4, text: "text-sm" },
  lg: { ring: 64, stroke: 5, text: "text-base" },
} as const;

export function ScoreRing({
  score,
  category,
  size = "md",
  showLabel = true,
  className = "",
}: ScoreIndicatorProps) {
  const config = CATEGORY_CONFIG[category];
  const dims = SIZE_MAP[size];
  const radius = (dims.ring - dims.stroke * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - score / 100);

  return (
    <div
      className={`inline-flex items-center gap-2 ${className}`}
      role="img"
      aria-label={`Connection health: ${score} out of 100 — ${config.label}`}
    >
      <svg
        width={dims.ring}
        height={dims.ring}
        viewBox={`0 0 ${dims.ring} ${dims.ring}`}
        className="shrink-0"
        aria-hidden="true"
      >
        {/* Background ring */}
        <circle
          cx={dims.ring / 2}
          cy={dims.ring / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={dims.stroke}
          className="text-stone-200"
        />
        {/* Score ring */}
        <circle
          cx={dims.ring / 2}
          cy={dims.ring / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={dims.stroke}
          strokeLinecap="round"
          className={config.ring}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${dims.ring / 2} ${dims.ring / 2})`}
          style={{
            transition: "stroke-dashoffset 0.6s ease",
          }}
        />
        {/* Center text */}
        <text
          x={dims.ring / 2}
          y={dims.ring / 2}
          textAnchor="middle"
          dominantBaseline="central"
          className={`fill-stone-700 font-semibold ${dims.text}`}
        >
          {score}
        </text>
      </svg>
      {showLabel && (
        <span className={`font-medium ${config.color} text-sm`}>
          {config.emoji} {config.label}
        </span>
      )}
    </div>
  );
}

/** Simple colored dot indicator for compact displays. */
export function ScoreDot({
  category,
  className = "",
}: {
  category: ScoreCategory;
  className?: string;
}) {
  const config = CATEGORY_CONFIG[category];
  return (
    <span
      className={`inline-block h-3 w-3 rounded-full ${config.bg} border-2 ${config.ring.replace("stroke", "border")} ${className}`}
      role="img"
      aria-label={`Connection: ${config.label}`}
    />
  );
}

/** Trend arrow indicator. */
export function TrendArrow({
  trend,
  className = "",
}: {
  trend: number;
  className?: string;
}) {
  if (trend >= 65) {
    return (
      <span className={`text-emerald-600 ${className}`} aria-label="Trending up">
        ↗
      </span>
    );
  }
  if (trend <= 35) {
    return (
      <span className={`text-rose-600 ${className}`} aria-label="Trending down">
        ↘
      </span>
    );
  }
  return (
    <span className={`text-stone-400 ${className}`} aria-label="Trending steady">
      →
    </span>
  );
}

export { CATEGORY_CONFIG };
