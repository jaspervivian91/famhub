/**
 * Small warm-design-system primitives shared across screens.
 * See /home/team/shared/design/design-system-warm.md §4.4 (dividers), §5 (motion).
 */
import type { ReactNode } from "react";

/**
 * Hand-drawn divider — a softly sketched stroke with an optional terracotta
 * "ink stop" dot. Replaces every ruled technical line.
 */
export function HandDivider({
  className = "",
  dot = false,
  color = "var(--color-fh-border)",
}: {
  className?: string;
  dot?: boolean;
  color?: string;
}) {
  return (
    <svg
      className={`block w-full ${className}`}
      height="12"
      viewBox="0 0 320 12"
      preserveAspectRatio="none"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M2 6 C 60 2, 120 10, 180 6 S 280 2, 318 6"
        stroke={color}
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      {dot && <circle cx="318" cy="6" r="2.6" fill="var(--color-fh-highlight)" />}
    </svg>
  );
}

/** Short sketched underline that sits beneath a section heading. */
export function SketchUnderline({
  className = "",
  color = "var(--color-fh-border)",
}: {
  className?: string;
  color?: string;
}) {
  // The two rules are slightly offset by hand — deliberately not snapped.
  return (
    <svg
      className={`fh-underline-sketch ${className}`}
      viewBox="0 0 56 10"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M1.5 5.5 C 16 2.5, 34 3.5, 54.5 4.5"
        stroke={color}
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M4 8.2 C 18 6.4, 32 6.9, 44 7.4"
        stroke={color}
        strokeWidth="1.4"
        strokeLinecap="round"
        opacity="0.5"
      />
    </svg>
  );
}

/** A soft crumb of warmth — a tiny hand-drawn sprig for screen corners. */
export function Sprig({ className = "" }: { className?: string }) {
  return (
    <svg
      width="34"
      height="26"
      viewBox="0 0 34 26"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <path
        d="M3 22 C 10 18, 16 12, 30 4"
        stroke="var(--color-fh-line)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M13 17 C 15 13, 19 12, 22 13"
        stroke="var(--color-fh-line)"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path
        d="M20 11 C 20 7, 23 5, 27 6"
        stroke="var(--color-fh-line)"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Section heading with a sketched underline under one word. */
export function SectionHeading({
  children,
  underline = true,
  className = "",
  id,
}: {
  children: ReactNode;
  underline?: boolean;
  className?: string;
  id?: string;
}) {
  return (
    <div className={className}>
      <h2 id={id} className="fh-h2">
        {children}
      </h2>
      {underline && <SketchUnderline className="mt-1.5" />}
    </div>
  );
}

/**
 * Gentle "turning a page" wrapper for a route's content.
 * Motion is declared in app.css and collapses to a fade under
 * prefers-reduced-motion.
 */
export function PageTurn({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`fh-page-turn ${className}`}>{children}</div>;
}
