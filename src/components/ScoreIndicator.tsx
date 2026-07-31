/**
 * Visual indicators for relationship health scores.
 * Brutalist direction: square dots, monospace data, ruled-line bars.
 * No emoji, no rounded corners, no gradients.
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
  { color: string; bg: string; label: string }
> = {
  dormant: {
    color: "text-[#C8603A]",
    bg: "bg-[#F5F0EB]",
    label: "NEEDS ATTENTION",
  },
  cooling: {
    color: "text-[#C8603A]",
    bg: "bg-[#EDEDEA]",
    label: "COOLING",
  },
  steady: {
    color: "text-[#1A1A1A]",
    bg: "bg-[#EDEDEA]",
    label: "STEADY",
  },
  thriving: {
    color: "text-[#1A1A1A]",
    bg: "bg-[#EDEDEA]",
    label: "THRIVING",
  },
};

const SIZE_MAP = {
  sm: { bar: "h-1 w-16" },
  md: { bar: "h-1.5 w-24" },
  lg: { bar: "h-2 w-32" },
} as const;

/** A ruled-line bar indicator replacing the old ScoreRing SVG. */
export function ScoreRing({
  score,
  category,
  size = "md",
  showLabel = true,
  className = "",
}: ScoreIndicatorProps) {
  const config = CATEGORY_CONFIG[category];
  const dims = SIZE_MAP[size];
  const pct = Math.max(0, Math.min(100, score));

  return (
    <div
      className={`inline-flex flex-col gap-1 ${className}`}
      role="img"
      aria-label={`Connection health: ${score} out of 100 — ${config.label}`}
    >
      <div className="flex items-center gap-2">
        {/* Square status dot — no border-radius */}
        <span
          className={`inline-block h-2.5 w-2.5 shrink-0 ${
            category === "dormant"
              ? "bg-[#C8603A]"
              : category === "cooling"
                ? "bg-[#C8603A]/70"
                : "bg-[#1A1A1A]"
          }`}
          style={{ borderRadius: 0 }}
          aria-hidden="true"
        />
        {/* Monospace score */}
        <span className="font-mono text-[11px] font-normal text-[#1A1A1A] tabular-nums">
          {score}
        </span>
        {/* Ruled-line bar */}
        <div className={`${dims.bar} bg-[#EDEDEA]`} style={{ borderRadius: 0 }}>
          <div
            className="h-full bg-[#1A1A1A]"
            style={{ width: `${pct}%`, borderRadius: 0 }}
          />
        </div>
      </div>
      {showLabel && (
        <span className="font-mono text-[9px] font-normal uppercase tracking-[0.06em] text-[#1A1A1A]/50">
          {config.label}
        </span>
      )}
    </div>
  );
}

/** Simple square dot indicator for compact displays. No border-radius. */
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
      className={`inline-block h-3 w-3 shrink-0 ${
        category === "dormant"
          ? "bg-[#C8603A]"
          : category === "cooling"
            ? "bg-[#C8603A]/70"
            : "bg-[#1A1A1A]"
      } ${className}`}
      style={{ borderRadius: 0 }}
      role="img"
      aria-label={`Connection: ${config.label}`}
    />
  );
}

/** Trend indicator — text arrows, no emoji. */
export function TrendArrow({
  trend,
  className = "",
}: {
  trend: number;
  className?: string;
}) {
  if (trend >= 65) {
    return (
      <span
        className={`font-mono text-[11px] tabular-nums text-[#1A1A1A] ${className}`}
        aria-label="Trending up"
      >
        UP
      </span>
    );
  }
  if (trend <= 35) {
    return (
      <span
        className={`font-mono text-[11px] tabular-nums text-[#C8603A] ${className}`}
        aria-label="Trending down"
      >
        DOWN
      </span>
    );
  }
  return (
    <span
      className={`font-mono text-[11px] tabular-nums text-[#1A1A1A]/50 ${className}`}
      aria-label="Trending steady"
    >
      --
    </span>
  );
}

export { CATEGORY_CONFIG };
