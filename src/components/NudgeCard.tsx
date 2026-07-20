/**
 * Nudge card component — accessible, with proper heading hierarchy
 * and large tap targets (min 44px).
 */
import type { Nudge, PairScore, ConversationStarter } from "~/lib/types";
import { ScoreRing, ScoreDot, TrendArrow } from "~/components/ScoreIndicator";
import { useState } from "react";

const NUDGE_TYPE_CONFIG: Record<
  string,
  { icon: string; label: string; color: string }
> = {
  dormancy: { icon: "⏰", label: "Reconnect", color: "border-rose-200 bg-rose-50" },
  cooling: { icon: "🌡️", label: "Cooling", color: "border-amber-200 bg-amber-50" },
  celebration: { icon: "🎉", label: "Celebration", color: "border-emerald-200 bg-emerald-50" },
  conversation_starter: { icon: "💬", label: "Conversation Starter", color: "border-teal-200 bg-teal-50" },
};

export interface NudgeCardProps {
  nudge: Nudge;
  score?: PairScore;
  fromName?: string;
  toName?: string;
  onAcknowledge: (nudgeId: string) => void;
  onDismiss: (nudgeId: string) => void;
  onGenerateStarters?: (nudge: Nudge) => void;
}

export function NudgeCard({
  nudge,
  score,
  fromName,
  toName,
  onAcknowledge,
  onDismiss,
  onGenerateStarters,
}: NudgeCardProps) {
  const config = NUDGE_TYPE_CONFIG[nudge.nudge_type] ?? NUDGE_TYPE_CONFIG.dormancy;
  const displayFrom = fromName ?? "Someone";
  const displayTo = toName ?? "someone";

  return (
    <li
      className={`rounded-xl border p-4 ${config.color} shadow-sm`}
      role="article"
      aria-label={`${config.label} nudge: ${nudge.message_text}`}
    >
      {/* Header row */}
      <div className="mb-3 flex items-center gap-2">
        <span className="text-lg" aria-hidden="true">
          {config.icon}
        </span>
        <span className="text-xs font-semibold uppercase tracking-wide text-stone-500">
          {config.label}
        </span>
        {score && (
          <span className="ml-auto flex items-center gap-1">
            <ScoreDot category={score.category} />
            <span className="text-xs text-stone-400">Score: {score.score}</span>
          </span>
        )}
      </div>

      {/* Message */}
      <h3 className="mb-3 text-sm leading-relaxed text-stone-700">
        {nudge.message_text}
      </h3>

      {/* Relationship context */}
      <p className="mb-3 text-xs text-stone-400">
        {displayFrom} ↔ {displayTo}
      </p>

      {/* Score details if available */}
      {score && (
        <div className="mb-3 flex flex-wrap items-center gap-3 rounded-lg bg-white/60 p-2 text-xs">
          <ScoreRing score={score.score} category={score.category} size="sm" showLabel={false} />
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-stone-500">
            <span>
              Recency: <strong>{score.factors.recency}%</strong>
            </span>
            <span>
              Frequency: <strong>{score.factors.frequency}%</strong>
            </span>
            <span>
              Balance: <strong>{score.factors.initiationBalance}%</strong>
            </span>
            <span className="inline-flex items-center gap-1">
              Trend: <strong>{score.factors.trend}%</strong>
              <TrendArrow trend={score.factors.trend} />
            </span>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => onAcknowledge(nudge.id)}
          className="min-h-[44px] min-w-[44px] rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-300"
          aria-label="Acknowledge this nudge"
        >
          👍 Got it!
        </button>
        <button
          onClick={() => onDismiss(nudge.id)}
          className="min-h-[44px] min-w-[44px] rounded-lg border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-stone-500 hover:bg-stone-50 focus:outline-none focus:ring-2 focus:ring-stone-300"
          aria-label="Dismiss this nudge"
        >
          Dismiss
        </button>
        {onGenerateStarters && (
          <button
            onClick={() => onGenerateStarters(nudge)}
            className="min-h-[44px] min-w-[44px] rounded-lg border border-teal-200 bg-white px-4 py-2 text-sm font-medium text-teal-700 hover:bg-teal-50 focus:outline-none focus:ring-2 focus:ring-teal-300"
            aria-label="Generate conversation starters"
          >
            💡 Get ideas
          </button>
        )}
      </div>
    </li>
  );
}

// ---------------------------------------------------------------------------
// Conversation Starter Panel (modal / expandable)
// ---------------------------------------------------------------------------

export interface ConversationStarterPanelProps {
  starters: ConversationStarter[];
  memberName: string;
  onClose: () => void;
}

const CATEGORY_EMOJI: Record<string, string> = {
  memory: "📖",
  photo: "📸",
  question: "💭",
  activity: "🎯",
};

export function ConversationStarterPanel({
  starters,
  memberName,
  onClose,
}: ConversationStarterPanelProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 sm:items-center"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Conversation starters for ${memberName}`}
    >
      <div
        className="w-full max-w-md rounded-t-2xl bg-white p-6 shadow-xl sm:rounded-2xl motion-safe:animate-[slideUp_0.2s_ease-out]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-stone-800">
            💡 Conversation Starters
          </h3>
          <button
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] rounded-lg text-stone-400 hover:bg-stone-100 hover:text-stone-600"
            aria-label="Close conversation starters"
          >
            ✕
          </button>
        </div>
        <p className="mb-4 text-sm text-stone-500">
          Ideas to reconnect with <strong>{memberName}</strong>:
        </p>

        {/* Starter cards */}
        <ul className="space-y-3">
          {starters.map((starter) => (
            <li
              key={starter.id}
              className="flex items-start gap-3 rounded-xl border border-teal-100 bg-teal-50/50 p-4"
            >
              <span className="shrink-0 pt-0.5 text-xl" aria-hidden="true">
                {CATEGORY_EMOJI[starter.category] ?? "💬"}
              </span>
              <p className="text-sm leading-relaxed text-stone-700">
                {starter.text}
              </p>
            </li>
          ))}
        </ul>

        {/* Close button */}
        <button
          onClick={onClose}
          className="mt-4 w-full min-h-[44px] rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-300"
        >
          Got it, thanks!
        </button>
      </div>
    </div>
  );
}
