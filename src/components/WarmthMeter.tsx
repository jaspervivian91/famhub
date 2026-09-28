/**
 * Warmth meter — the five-heart reading of a connection score
 * (relationship profile, "How we're doing").
 *
 * Filled hearts are terracotta (#D4845A — warmth/emotion only, per the warm
 * design system); the remaining hearts are soft umber outlines. The number
 * beside the meter carries the exact score, so the row is readable twice: one
 * clear sentence for screen readers instead of five unlabelled paths.
 */
const HEART_PATH =
  "M11 16 C 8.5 14.2 7.2 12.6 7.2 11.3 C 7.2 10.3 8 9.5 9 9.5 C 9.5 9.5 9.9 9.7 10.2 10.1 C 10.3 10.3 10.6 10.3 10.8 10.1 C 11.1 9.7 11.5 9.5 12 9.5 C 13 9.5 13.8 10.3 13.8 11.3 C 13.8 12.6 12.5 14.2 10 16 C 9.7 16.2 9.3 16.2 9 16 Z";

export function WarmthMeter({
  score,
  hearts = 5,
  className = "",
}: {
  score: number;
  hearts?: number;
  className?: string;
}) {
  const filled = Math.max(
    0,
    Math.min(hearts, Math.round((score / 100) * hearts)),
  );
  const opacity = [1, 0.9, 0.75, 0.62, 0.5];

  return (
    <span
      className={`inline-flex items-center gap-[8px] ${className}`}
      role="img"
      aria-label={`Connection warmth: ${filled} of ${hearts} hearts (${score} out of 100)`}
    >
      {Array.from({ length: hearts }).map((_, i) => (
        <svg
          key={i}
          width="14"
          height="14"
          viewBox="6.6 9 7.8 7.6"
          fill="none"
          aria-hidden="true"
          className="shrink-0"
        >
          <path
            d={HEART_PATH}
            fill={i < filled ? "#D4845A" : "none"}
            stroke={i < filled ? "none" : "#96785A"}
            strokeWidth={i < filled ? 0 : 1.8}
            strokeLinejoin="round"
            opacity={i < filled ? opacity[i % opacity.length] : 1}
          />
        </svg>
      ))}
    </span>
  );
}
