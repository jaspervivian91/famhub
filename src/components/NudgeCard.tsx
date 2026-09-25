/**
 * Nudge card component — accessible, with proper heading hierarchy
 * and large tap targets (min 44px). Warm design system v4.
 */
import type { Nudge, PairScore, ConversationStarter } from "~/lib/types";
import { ScoreRing, ScoreDot, TrendArrow } from "~/components/ScoreIndicator";
import { Icon, type IconName } from "~/components/Icon";

const NUDGE_TYPE_CONFIG: Record<
  string,
  { icon: IconName; label: string }
> = {
  dormancy: { icon: "clock", label: "Time to reconnect" },
  cooling: { icon: "cooling", label: "Cooling a little" },
  celebration: { icon: "celebration", label: "Something to celebrate" },
  conversation_starter: { icon: "talk", label: "Conversation starter" },
};

const STARTER_ICON: Record<string, IconName> = {
  memory: "talk",
  photo: "warm",
  question: "idea",
  activity: "pin",
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
  const config =
    NUDGE_TYPE_CONFIG[nudge.nudge_type] ?? NUDGE_TYPE_CONFIG.dormancy;
  const displayFrom = fromName ?? "Someone";
  const displayTo = toName ?? "someone";

  return (
    <article
      className="fh-card fh-floating"
      style={{ borderRadius: "var(--radius-card-soft)" }}
      aria-label={`${config.label}: ${nudge.message_text}`}
    >
      {/* Header row */}
      <div className="flex items-center gap-3">
        <Icon name={config.icon} size={26} />
        <span className="fh-h3">{config.label}</span>
        {score && (
          <span className="ml-auto flex items-center gap-2">
            <ScoreDot category={score.category} />
            <span className="fh-caption tabular-nums">{score.score}</span>
          </span>
        )}
      </div>

      {/* Message */}
      <p className="fh-body mt-4">{nudge.message_text}</p>

      {/* Relationship context */}
      <p className="fh-caption mt-3">
        {displayFrom} ↔ {displayTo}
      </p>

      {/* Score details if available */}
      {score && (
        <div className="fh-nested mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 p-3">
          <ScoreRing
            score={score.score}
            category={score.category}
            size="sm"
            showLabel={false}
          />
          <div className="fh-caption flex flex-wrap gap-x-4 gap-y-1">
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
      <div className="mt-5 flex flex-wrap gap-3">
        <button
          onClick={() => onAcknowledge(nudge.id)}
          className="fh-btn fh-btn-primary"
          style={{ minHeight: 48 }}
          aria-label="Acknowledge this nudge"
        >
          <Icon name="thumbs" size={20} />
          Got it
        </button>
        <button
          onClick={() => onDismiss(nudge.id)}
          className="fh-btn fh-btn-secondary"
          style={{ minHeight: 48 }}
          aria-label="Dismiss this nudge"
        >
          Dismiss
        </button>
        {onGenerateStarters && (
          <button
            onClick={() => onGenerateStarters(nudge)}
            className="fh-btn fh-btn-sand"
            style={{ minHeight: 48 }}
            aria-label="Suggest something to talk about"
          >
            <Icon name="idea" size={20} />
            Idea
          </button>
        )}
      </div>
    </article>
  );
}

// ---------------------------------------------------------------------------
// Conversation Starter Panel (modal / bottom sheet)
// ---------------------------------------------------------------------------

export interface ConversationStarterPanelProps {
  starters: ConversationStarter[];
  memberName: string;
  onClose: () => void;
}

export function ConversationStarterPanel({
  starters,
  memberName,
  onClose,
}: ConversationStarterPanelProps) {
  return (
    <div
      className="fh-backdrop fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Things to talk about with ${memberName}`}
    >
      <div
        className="fh-sheet w-full max-w-md p-6 motion-safe:animate-[fh-sheet-rise_400ms_var(--ease-gentle)_both] sm:rounded-[var(--radius-card-soft)]"
        style={{
          backgroundColor: "var(--color-fh-bg)",
          borderRadius: "var(--radius-card-soft) var(--radius-card-soft) 0 0",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <h3 className="fh-h3 flex items-center gap-2.5">
            <Icon name="idea" size={24} />
            Things to talk about
          </h3>
          <button
            onClick={onClose}
            className="fh-btn fh-btn-quiet"
            style={{ minHeight: 44, minWidth: 44 }}
            aria-label="Close"
          >
            Close
          </button>
        </div>
        <p className="fh-body-sm mt-3" style={{ color: "var(--color-fh-muted)" }}>
          A few gentle ideas for reconnecting with{" "}
          <strong style={{ color: "var(--color-fh-body)" }}>{memberName}</strong>
          :
        </p>

        {/* Starter cards */}
        <ul className="mt-5 flex flex-col gap-3">
          {starters.map((starter) => (
            <li key={starter.id} className="fh-nested flex items-start gap-3 p-4">
              <Icon name={STARTER_ICON[starter.category] ?? "talk"} size={22} />
              <p className="fh-body-sm">{starter.text}</p>
            </li>
          ))}
        </ul>

        <button
          onClick={onClose}
          className="fh-btn fh-btn-primary mt-6 w-full"
        >
          Thanks, got it
        </button>
      </div>
    </div>
  );
}
