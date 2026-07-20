/**
 * Connection health display — shows relationship score with visual
 * indicator and insights for a member pair.
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

export function ConnectionHealth({
  score,
  nameA,
  nameB,
  compact = false,
  className = "",
}: ConnectionHealthProps) {
  const interactionCount = estimateInteractionCount(score);

  if (compact) {
    return (
      <div
        className={`flex items-center justify-between rounded-lg bg-stone-50 p-3 ${className}`}
      >
        <div className="flex items-center gap-2">
          <ScoreDot category={score.category} />
          <span className="text-sm font-medium text-stone-700">
            {nameA} ↔ {nameB}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-stone-500">{score.score}</span>
          <TrendArrow trend={score.factors.trend} />
        </div>
      </div>
    );
  }

  return (
    <div
      className={`rounded-xl border border-stone-200 bg-white p-4 shadow-sm ${className}`}
      role="region"
      aria-label={`Connection health between ${nameA} and ${nameB}`}
    >
      <div className="flex items-center gap-3">
        <ScoreRing score={score.score} category={score.category} size="md" showLabel={false} />
        <div>
          <h3 className="font-semibold text-stone-800">
            {nameA} & {nameB}
          </h3>
          <p className="text-sm text-stone-500">
            {score.score}/100 — {score.category}
          </p>
        </div>
      </div>

      {/* Insights */}
      <div className="mt-3 space-y-1.5 rounded-lg bg-stone-50 p-3 text-xs text-stone-600">
        <div className="flex items-center gap-2">
          <span className="w-16 font-medium text-stone-500">Recency</span>
          <div className="h-1.5 flex-1 rounded-full bg-stone-200">
            <div
              className="h-1.5 rounded-full bg-teal-500"
              style={{ width: `${score.factors.recency}%` }}
            />
          </div>
          <span className="w-8 text-right tabular-nums">
            {score.factors.recency}%
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-16 font-medium text-stone-500">Freq</span>
          <div className="h-1.5 flex-1 rounded-full bg-stone-200">
            <div
              className="h-1.5 rounded-full bg-amber-500"
              style={{ width: `${score.factors.frequency}%` }}
            />
          </div>
          <span className="w-8 text-right tabular-nums">
            {score.factors.frequency}%
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-16 font-medium text-stone-500">Balance</span>
          <div className="h-1.5 flex-1 rounded-full bg-stone-200">
            <div
              className="h-1.5 rounded-full bg-violet-500"
              style={{ width: `${score.factors.initiationBalance}%` }}
            />
          </div>
          <span className="w-8 text-right tabular-nums">
            {score.factors.initiationBalance}%
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-16 font-medium text-stone-500">Trend</span>
          <span className="flex-1">
            <TrendArrow trend={score.factors.trend} />
          </span>
          <span className="w-8 text-right tabular-nums">
            {score.factors.trend}%
          </span>
        </div>
      </div>
    </div>
  );
}

/** Rough estimate of interaction count from frequency score. */
function estimateInteractionCount(score: PairScore): number {
  // frequency is 0-100 mapped from 0-5 per week → ~0-65 over 90 days
  return Math.round((score.factors.frequency / 100) * 65);
}
