/**
 * Nudge card component — accessible, with proper heading hierarchy
 * and large tap targets (min 44px).
 * Brutalist direction: flat cards, monospace metadata, sharp corners.
 */
import type { Nudge, PairScore, ConversationStarter } from "~/lib/types";
import { ScoreDot } from "~/components/ScoreIndicator";
import { useState } from "react";

const NUDGE_TYPE_CONFIG: Record<
  string,
  { label: string; accent: boolean }
> = {
  dormancy: { label: "RECONNECT", accent: true },
  cooling: { label: "COOLING", accent: false },
  celebration: { label: "CELEBRATION", accent: false },
  conversation_starter: { label: "CONVERSATION STARTER", accent: false },
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
      className="border border-[#1A1A1A]/20 bg-[#EDEDEA] p-4"
      style={{ borderRadius: 0 }}
      role="article"
      aria-label={`${config.label} nudge: ${nudge.message_text}`}
    >
      {/* Header row */}
      <div className="mb-3 flex items-center gap-2">
        {/* Accent left bar for dormancy */}
        {config.accent && (
          <span
            className="block h-5 w-0.5 shrink-0 bg-[#C8603A]"
            aria-hidden="true"
          />
        )}
        <span className="font-mono text-[9px] font-normal uppercase tracking-[0.06em] text-[#1A1A1A]/50">
          {config.label}
        </span>
        {score && (
          <span className="ml-auto flex items-center gap-1.5">
            <ScoreDot category={score.category} />
            <span className="font-mono text-[9px] tabular-nums text-[#1A1A1A]/50">
              {score.score}
            </span>
          </span>
        )}
      </div>

      {/* Message */}
      <h3 className="mb-3 text-[13px] font-normal leading-relaxed text-[#1A1A1A]">
        {nudge.message_text}
      </h3>

      {/* Relationship context */}
      <p className="mb-3 font-mono text-[9px] uppercase tracking-[0.03em] text-[#1A1A1A]/40">
        {displayFrom} &mdash; {displayTo}
      </p>

      {/* Score details if available */}
      {score && (
        <div className="mb-3 flex flex-wrap items-center gap-3 border border-[#1A1A1A]/10 bg-[#F5F0EB] p-2.5" style={{ borderRadius: 0 }}>
          <div className="flex flex-col gap-0.5">
            <span className="font-mono text-[11px] tabular-nums font-normal text-[#1A1A1A]">
              {score.score}
            </span>
            <span className="font-mono text-[9px] uppercase tracking-[0.06em] text-[#1A1A1A]/40">
              {score.category}
            </span>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 font-mono text-[9px] tabular-nums text-[#1A1A1A]/70">
            <span>
              RECENCY <span className="text-[#1A1A1A]">{score.factors.recency}%</span>
            </span>
            <span>
              FREQ <span className="text-[#1A1A1A]">{score.factors.frequency}%</span>
            </span>
            <span>
              BAL <span className="text-[#1A1A1A]">{score.factors.initiationBalance}%</span>
            </span>
            <span>
              TREND <span className="text-[#1A1A1A]">{score.factors.trend}%</span>
            </span>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => onAcknowledge(nudge.id)}
          className="min-h-[44px] min-w-[44px] border-2 border-[#1A1A1A] bg-[#C8603A] px-4 py-2 font-[Inter] text-[13px] font-bold uppercase tracking-[0.04em] text-[#F5F0EB] hover:bg-[#C8603A]/90 focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]"
          style={{ borderRadius: 0 }}
          aria-label="Acknowledge this nudge"
        >
          GOT IT
        </button>
        <button
          onClick={() => onDismiss(nudge.id)}
          className="min-h-[44px] min-w-[44px] border border-[#1A1A1A] bg-transparent px-4 py-2 font-[Inter] text-[13px] font-bold uppercase tracking-[0.04em] text-[#1A1A1A] hover:bg-[#EDEDEA] focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]"
          style={{ borderRadius: 0 }}
          aria-label="Dismiss this nudge"
        >
          DISMISS
        </button>
        {onGenerateStarters && (
          <button
            onClick={() => onGenerateStarters(nudge)}
            className="min-h-[44px] min-w-[44px] border border-[#1A1A1A] bg-transparent px-4 py-2 font-[Inter] text-[13px] font-bold uppercase tracking-[0.04em] text-[#1A1A1A] hover:bg-[#EDEDEA] focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]"
            style={{ borderRadius: 0 }}
            aria-label="Generate conversation starters"
          >
            GET IDEAS
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

const CATEGORY_LABEL: Record<string, string> = {
  memory: "MEMORY",
  photo: "PHOTO",
  question: "QUESTION",
  activity: "ACTIVITY",
};

export function ConversationStarterPanel({
  starters,
  memberName,
  onClose,
}: ConversationStarterPanelProps) {
  const [copiedIds, setCopiedIds] = useState<Set<string>>(new Set());

  function handleCopy(text: string, id: string) {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopiedIds((prev) => new Set(prev).add(id));
    setTimeout(() => {
      setCopiedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 2000);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[#1A1A1A]/30 sm:items-center"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Conversation starters for ${memberName}`}
    >
      <div
        className="w-full max-w-md border-2 border-[#1A1A1A] bg-[#F5F0EB] p-6 sm:max-w-md"
        style={{ borderRadius: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-[Inter] text-[16px] font-bold uppercase tracking-[0.06em] text-[#1A1A1A]">
            CONVERSATION STARTERS
          </h3>
          <button
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] font-mono text-[18px] text-[#1A1A1A]/50 hover:text-[#1A1A1A]"
            style={{ borderRadius: 0 }}
            aria-label="Close conversation starters"
          >
            X
          </button>
        </div>
        <p className="mb-4 font-mono text-[11px] text-[#1A1A1A]/50">
          Ideas to reconnect with{" "}
          <span className="text-[#1A1A1A]">{memberName}</span>:
        </p>

        {/* Starter cards */}
        <ul className="space-y-3">
          {starters.map((starter) => (
            <li
              key={starter.id}
              className="flex items-start gap-3 border border-[#1A1A1A]/20 bg-[#EDEDEA] p-4"
              style={{ borderRadius: 0 }}
            >
              <span className="shrink-0 pt-0.5 font-mono text-[9px] uppercase tracking-[0.06em] text-[#1A1A1A]/40">
                {CATEGORY_LABEL[starter.category] ?? "IDEA"}
              </span>
              <p className="text-[13px] leading-relaxed text-[#1A1A1A]">
                {starter.text}
              </p>
              <button
                onClick={() => handleCopy(starter.text, starter.id)}
                className="shrink-0 border border-[#1A1A1A] bg-transparent px-2 py-1 font-mono text-[9px] uppercase tracking-[0.06em] text-[#1A1A1A]/70 hover:bg-[#EDEDEA]"
                style={{ borderRadius: 0 }}
              >
                {copiedIds.has(starter.id) ? "COPIED" : "COPY"}
              </button>
            </li>
          ))}
        </ul>

        {/* Close button */}
        <button
          onClick={onClose}
          className="mt-4 w-full min-h-[44px] border-2 border-[#1A1A1A] bg-[#1A1A1A] px-4 py-2 font-[Inter] text-[13px] font-bold uppercase tracking-[0.04em] text-[#F5F0EB] hover:bg-[#1A1A1A]/90 focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]"
          style={{ borderRadius: 0 }}
        >
          GOT IT
        </button>
      </div>
    </div>
  );
}
