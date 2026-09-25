/**
 * Visual indicators and helpers for relationship health scores.
 * Warm design system v4 — no emoji, warm palette only.
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
  {
    ring: string;
    dot: string;
    text: string;
    label: string;
  }
> = {
  dormant: {
    ring: "stroke-[#A63D2F]",
    dot: "#A63D2F",
    text: "#A63D2F",
    label: "Needs attention",
  },
  cooling: {
    ring: "stroke-[#A6633F]",
    dot: "#A6633F",
    text: "#A6633F",
    label: "Cooling down",
  },
  steady: {
    ring: "stroke-[#96785A]",
    dot: "#96785A",
    text: "#6E5D4D",
    label: "Steady",
  },
  thriving: {
    ring: "stroke-[#3A6B4A]",
    dot: "#3A6B4A",
    text: "#3A6B4A",
    label: "Thriving",
  },
};

// Smallest ring clears the spec's 13px caption minimum: the sm digit
// is 13px (was 11px, below the caption minimum and too small for the
// grandparent-friendly audience), with the ring nudged 32 → 34 so a
// three-digit score keeps clear of the stroke.
const SIZE_MAP = {
  sm: { ring: 34, stroke: 3, font: 13 },
  md: { ring: 48, stroke: 4, font: 15 },
  lg: { ring: 64, stroke: 5, font: 19 },
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
    <span
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
        {/* Background ring — warm sand, never grey */}
        <circle
          cx={dims.ring / 2}
          cy={dims.ring / 2}
          r={radius}
          fill="none"
          stroke="#D8C6AF"
          strokeWidth={dims.stroke}
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
          style={{ transition: "stroke-dashoffset 400ms ease-out" }}
        />
        {/* Score */}
        <text
          x={dims.ring / 2}
          y={dims.ring / 2}
          textAnchor="middle"
          dominantBaseline="central"
          fontFamily="var(--font-body)"
          fontWeight="700"
          fontSize={dims.font}
          fill="#1A1A1A"
        >
          {score}
        </text>
      </svg>
      {showLabel && (
        <span
          className="fh-body-sm"
          style={{ color: config.text, fontWeight: 700 }}
        >
          {config.label}
        </span>
      )}
    </span>
  );
}

/** Simple warm dot indicator for compact displays. */
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
      className={`inline-block h-3 w-3 shrink-0 rounded-full ${className}`}
      style={{
        backgroundColor: config.dot,
        border: `1.5px solid ${config.dot}`,
      }}
      role="img"
      aria-label={`Connection: ${config.label}`}
    />
  );
}

/** Trend indicator — hand-drawn arrows in the warm palette. */
export function TrendArrow({
  trend,
  className = "",
}: {
  trend: number;
  className?: string;
}) {
  if (trend >= 65) {
    return (
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        className={`inline-block ${className}`}
        role="img"
        aria-label="Trending up"
      >
        <path
          d="M3 12 C 6 9, 9 6.5, 13 3.5"
          stroke="#3A6B4A"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M9.5 3.2 L 13.2 3.2 L 13 6.8"
          stroke="#3A6B4A"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (trend <= 35) {
    return (
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        className={`inline-block ${className}`}
        role="img"
        aria-label="Trending down"
      >
        <path
          d="M3 3.5 C 6 6.5, 9 9, 13 12"
          stroke="#A6633F"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M9.5 12.8 L 13.2 12.8 L 13 9.2"
          stroke="#A6633F"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      className={`inline-block ${className}`}
      role="img"
      aria-label="Trending steady"
    >
      <path
        d="M2.5 9 C 5 7.5, 8 8.5, 10.5 7.5 C 12 6.9, 13.5 8, 13.5 8"
        stroke="#96785A"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export { CATEGORY_CONFIG };
