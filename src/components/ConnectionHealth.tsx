/**
 * Connection health display — shows relationship score with visual
 * indicator and insights for a member pair. Warm design system v4.
 */
import type { PairScore } from "~/lib/types";
import { ScoreRing, ScoreDot, TrendArrow } from "~/components/ScoreIndicator";

export interface ConnectionHealthProps {
  score: PairScore;
  nameA: string;
  nameB: string;
  compact?: boolean;
  className?: string;
}

/* Warm bar colours — forest green, sand-umber, terracotta, burnt sienna */
const BAR_COLOURS = {
  recency: "#3A6B4A",
  frequency: "#D4845A",
  balance: "#96785A",
};

export function ConnectionHealth({
  score,
  nameA,
  nameB,
  compact = false,
  className = "",
}: ConnectionHealthProps) {
  if (compact) {
    return (
      <div
        className={`fh-nested flex items-center justify-between gap-3 p-3 ${className}`}
      >
        <span className="flex items-center gap-2.5">
          <ScoreDot category={score.category} />
          <span className="fh-body-sm">
            {nameA} ↔ {nameB}
          </span>
        </span>
        <span className="flex items-center gap-2">
          <span className="fh-caption font-bold tabular-nums" style={{ color: "var(--color-fh-body)" }}>
            {score.score}
          </span>
          <TrendArrow trend={score.factors.trend} />
        </span>
      </div>
    );
  }

  return (
    <div
      className={`fh-card ${className}`}
      role="region"
      aria-label={`Connection health between ${nameA} and ${nameB}`}
    >
      <div className="flex items-center gap-4">
        <ScoreRing
          score={score.score}
          category={score.category}
          size="md"
          showLabel={false}
        />
        <div>
          <h3 className="fh-h4">
            {nameA} &amp; {nameB}
          </h3>
          <p className="fh-caption mt-0.5 capitalize">
            {score.score}/100 — {score.category}
          </p>
        </div>
      </div>

      {/* Insights */}
      <div className="fh-nested mt-4 flex flex-col gap-2.5 p-3">
        <FactorBar label="Recency" value={score.factors.recency} colour={BAR_COLOURS.recency} />
        <FactorBar label="Frequency" value={score.factors.frequency} colour={BAR_COLOURS.frequency} />
        <FactorBar
          label="Balance"
          value={score.factors.initiationBalance}
          colour={BAR_COLOURS.balance}
        />
        <div className="flex items-center gap-3">
          <span className="fh-caption w-20">Trend</span>
          <span className="flex-1">
            <TrendArrow trend={score.factors.trend} />
          </span>
          <span className="fh-caption w-10 text-right tabular-nums">
            {score.factors.trend}%
          </span>
        </div>
      </div>
    </div>
  );
}

function FactorBar({
  label,
  value,
  colour,
}: {
  label: string;
  value: number;
  colour: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="fh-caption w-20">{label}</span>
      <span
        className="h-2 flex-1 overflow-hidden rounded-full"
        style={{ backgroundColor: "var(--color-fh-surface)" }}
      >
        <span
          className="block h-2 rounded-full"
          style={{
            width: `${value}%`,
            backgroundColor: colour,
            transition: "width 420ms var(--ease-gentle)",
          }}
        />
      </span>
      <span className="fh-caption w-10 text-right tabular-nums">{value}%</span>
    </div>
  );
}
