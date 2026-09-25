import type { JSX } from "react";

/**
 * Family Core logo — the heart-roof house ("mushroom heart house").
 *
 * The SHAPE is the one element kept from the previous brand direction and is
 * untouchable (path data below is unchanged). Only the colouring is warm:
 *   roof        #3A6B4A forest green
 *   house body  #1A1A1A 3px outline
 *   window      #D4845A terracotta — the warm light left on in the window
 *   base rule   #1A1A1A at 35% opacity
 * Wordmark: mixed-case "Family Core" in Fraunces 500.
 * See design-system-warm.md §7.
 */

export interface LogoProps {
  variant?: "full" | "icon" | "stacked" | "gp";
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const SIZES: Record<NonNullable<LogoProps["size"]>, string> = {
  sm: "h-6 w-6",
  md: "h-9 w-9",
  lg: "h-12 w-12",
  xl: "h-20 w-20",
};

const FULL_SIZES: Record<NonNullable<LogoProps["size"]>, string> = {
  sm: "h-6",
  md: "h-9",
  lg: "h-12",
  xl: "h-20",
};

const ROOF = "#3A6B4A";
const INK = "#1A1A1A";
const WINDOW = "#D4845A";
const HEADING_FONT = "Fraunces, Georgia, 'Times New Roman', serif";

/* The protected geometry — identical in every variant. */
const HOUSE_PATH =
  "M50 10 C 50 10, 25 28, 15 38 C 5 48, 5 58, 15 65 C 25 72, 35 68, 50 58 C 65 68, 75 72, 85 65 C 95 58, 95 48, 85 38 C 75 28, 50 10, 50 10Z";

function HouseMark({ strokeWidth = 3 }: { strokeWidth?: number }) {
  return (
    <>
      <path d={HOUSE_PATH} fill={ROOF} />
      <rect
        x="25"
        y="55"
        width="50"
        height="40"
        rx="0"
        ry="0"
        fill="transparent"
        stroke={INK}
        strokeWidth={strokeWidth}
      />
      <circle cx="50" cy="75" r="10" fill={WINDOW} />
      <line
        x1="25"
        y1="95"
        x2="75"
        y2="95"
        stroke={INK}
        strokeWidth="2"
        opacity="0.35"
      />
    </>
  );
}

export function Logo({
  variant = "icon",
  size = "md",
  className = "",
}: LogoProps): JSX.Element {
  // ── Icon only ─────────────────────────────────────────────
  if (variant === "icon") {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 100 100"
        fill="none"
        className={`${SIZES[size]} ${className}`}
        aria-label="Family Core"
        role="img"
      >
        <HouseMark />
      </svg>
    );
  }

  // ── Full (icon + wordmark, horizontal) ────────────────────
  if (variant === "full") {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 280 100"
        fill="none"
        className={`${FULL_SIZES[size]} ${className}`}
        style={{ width: "auto" }}
        aria-label="Family Core"
        role="img"
      >
        <g transform="translate(0, 5) scale(0.85)">
          <HouseMark />
        </g>
        {/* Wordmark — Fraunces, mixed case, warm palette */}
        <text
          x="112"
          y="60"
          fontFamily={HEADING_FONT}
          fontSize="30"
          fontWeight="500"
        >
          <tspan fill={INK}>Family </tspan>
          <tspan fill={ROOF}>Core</tspan>
        </text>
      </svg>
    );
  }

  // ── Stacked (icon above wordmark) ─────────────────────────
  if (variant === "stacked") {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 100 130"
        fill="none"
        className={`${SIZES[size]} ${className}`}
        style={{ width: "auto" }}
        aria-label="Family Core"
        role="img"
      >
        <g transform="translate(5, 5) scale(0.9)">
          <HouseMark />
        </g>
        <text
          x="50"
          y="118"
          fontFamily={HEADING_FONT}
          fontSize="17"
          fontWeight="500"
          textAnchor="middle"
        >
          <tspan fill={INK}>Family </tspan>
          <tspan fill={ROOF}>Core</tspan>
        </text>
      </svg>
    );
  }

  // ── Grandparent mode — icon + larger wordmark ─────────────
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 280 100"
      fill="none"
      className={`${FULL_SIZES[size]} ${className}`}
      style={{ width: "auto" }}
      aria-label="Family Core"
      role="img"
    >
      <g transform="translate(0, 5) scale(0.9)">
        <HouseMark strokeWidth={3} />
      </g>
      <text
        x="115"
        y="60"
        fontFamily={HEADING_FONT}
        fontSize="34"
        fontWeight="600"
      >
        <tspan fill={INK}>Family </tspan>
        <tspan fill={ROOF}>Core</tspan>
      </text>
    </svg>
  );
}
