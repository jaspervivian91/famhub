/**
 * Connection health display — shows relationship score with visual
 * indicator and insights for a member pair.
 * Brutalist direction: flat cards, monospace data, ruled-line bars.
 */
import type { PairScore } from "~/lib/types";
import { ScoreDot } from "~/components/ScoreIndicator";

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
  if (compact) {
    return (
      <div
        className={`flex items-center justify-between border border-[#1A1A1A]/20 bg-[#EDEDEA] p-3 ${className}`}
        style={{ borderRadius: 0 }}
      >
        <div className="flex items-center gap-2">
          <ScoreDot category={score.category} />
          <span className="font-[Inter] text-[13px] font-bold uppercase tracking-[0.04em] text-[#1A1A1A]">
            {nameA} &mdash; {nameB}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] tabular-nums text-[#1A1A1A]/70">
            {score.score}
          </span>
          <span className="font-mono text-[9px] uppercase tracking-[0.06em] text-[#1A1A1A]/50">
            {score.category === "dormant"
              ? "DORMANT"
              : score.category === "cooling"
                ? "COOLING"
                : score.category === "steady"
                  ? "STEADY"
                  : "THRIVING"}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`border border-[#1A1A1A]/20 bg-[#EDEDEA] p-5 ${className}`}
      style={{ borderRadius: 0 }}
      role="region"
      aria-label={`Connection health between ${nameA} and ${nameB}`}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <ScoreDot category={score.category} />
        <h3 className="font-[Inter] text-[13px] font-bold uppercase tracking-[0.06em] text-[#1A1A1A]">
          {nameA} &amp; {nameB}
        </h3>
        <span className="font-mono text-[11px] tabular-nums text-[#1A1A1A]/50 ml-auto">
          {score.score}
        </span>
      </div>

      {/* Ruled-line factor bars */}
      <div className="space-y-2">
        <FactorBar label="RECENCY" value={score.factors.recency} />
        <FactorBar label="FREQ" value={score.factors.frequency} />
        <FactorBar label="BALANCE" value={score.factors.initiationBalance} />
        <FactorBar label="TREND" value={score.factors.trend} />
      </div>
    </div>
  );
}

function FactorBar({ label, value }: { label: string; value: number }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-[9px] uppercase tracking-[0.06em] text-[#1A1A1A]/50 w-16 shrink-0">
        {label}
      </span>
      <div
        className="h-1 flex-1 bg-[#1A1A1A]/10"
        style={{ borderRadius: 0 }}
      >
        <div
          className="h-1 bg-[#1A1A1A]"
          style={{ width: `${pct}%`, borderRadius: 0 }}
        />
      </div>
      <span className="font-mono text-[9px] tabular-nums text-[#1A1A1A]/70 w-7 text-right">
        {value}
      </span>
    </div>
  );
}

/** Rough estimate of interaction count from frequency score. */
function estimateInteractionCount(score: PairScore): number {
  return Math.round((score.factors.frequency / 100) * 65);
}
