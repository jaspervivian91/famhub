import type { JSX } from "react";

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
      >
        {/* Heart-roof */}
        <path
          d="M50 10
             C 50 10, 25 28, 15 38
             C 5 48, 5 58, 15 65
             C 25 72, 35 68, 50 58
             C 65 68, 75 72, 85 65
             C 95 58, 95 48, 85 38
             C 75 28, 50 10, 50 10Z"
          fill="#1A1A1A"
        />
        {/* House body — sharp corners */}
        <rect
          x="25" y="55"
          width="50" height="40"
          rx="0" ry="0"
          fill="transparent"
          stroke="#1A1A1A"
          strokeWidth="3"
        />
        {/* Window — accent */}
        <circle cx="50" cy="75" r="10" fill="#3A6B4A" />
        {/* Structural ruled line at base */}
        <line
          x1="25" y1="95"
          x2="75" y2="95"
          stroke="#1A1A1A"
          strokeWidth="2"
        />
      </svg>
    );
  }

  // ── Full (icon + wordmark horizontal) ─────────────────────
  if (variant === "full") {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 280 100"
        fill="none"
        className={`${FULL_SIZES[size]} ${className}`}
        style={{ width: "auto" }}
        aria-label="Family Core"
      >
        <g transform="translate(0, 5) scale(0.85)">
          <path
            d="M50 10
               C 50 10, 25 28, 15 38
               C 5 48, 5 58, 15 65
               C 25 72, 35 68, 50 58
               C 65 68, 75 72, 85 65
               C 95 58, 95 48, 85 38
               C 75 28, 50 10, 50 10Z"
            fill="#1A1A1A"
          />
          <rect
            x="25" y="55" width="50" height="40"
            rx="0" ry="0"
            fill="transparent" stroke="#1A1A1A" strokeWidth="3"
          />
          <circle cx="50" cy="75" r="10" fill="#3A6B4A" />
          <line x1="25" y1="95" x2="75" y2="95" stroke="#1A1A1A" strokeWidth="2" />
        </g>
        {/* Vertical ruled divider */}
        <line x1="90" y1="20" x2="90" y2="80" stroke="#1A1A1A" strokeWidth="1.5" opacity="0.3" />
        {/* "FAMILY" — Inter Bold uppercase, heavy letter-spacing */}
        <text
          x="110" y="48"
          fontFamily="Inter, 'SF Pro Display', 'Helvetica Neue', Arial, sans-serif"
          fontSize="28"
          fontWeight="700"
          fill="#1A1A1A"
          letterSpacing="0.2em"
        >
          FAMILY
        </text>
        {/* "CORE" — Inter Bold uppercase, accent color */}
        <text
          x="110" y="78"
          fontFamily="Inter, 'SF Pro Display', 'Helvetica Neue', Arial, sans-serif"
          fontSize="28"
          fontWeight="700"
          fill="#3A6B4A"
          letterSpacing="0.2em"
        >
          CORE
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
      >
        <g transform="translate(5, 5) scale(0.9)">
          <path
            d="M50 10
               C 50 10, 25 28, 15 38
               C 5 48, 5 58, 15 65
               C 25 72, 35 68, 50 58
               C 65 68, 75 72, 85 65
               C 95 58, 95 48, 85 38
               C 75 28, 50 10, 50 10Z"
            fill="#1A1A1A"
          />
          <rect x="25" y="55" width="50" height="40" rx="0" ry="0" fill="transparent" stroke="#1A1A1A" strokeWidth="3" />
          <circle cx="50" cy="75" r="10" fill="#3A6B4A" />
          <line x1="25" y1="95" x2="75" y2="95" stroke="#1A1A1A" strokeWidth="2" />
        </g>
        {/* "FAMILY" — Inter Bold uppercase, centered */}
        <text
          x="50" y="108"
          fontFamily="Inter, 'SF Pro Display', 'Helvetica Neue', Arial, sans-serif"
          fontSize="14"
          fontWeight="700"
          fill="#1A1A1A"
          letterSpacing="0.2em"
          textAnchor="middle"
        >
          FAMILY
        </text>
        {/* "CORE" — Inter Bold uppercase, accent color */}
        <text
          x="50" y="126"
          fontFamily="Inter, 'SF Pro Display', 'Helvetica Neue', Arial, sans-serif"
          fontSize="14"
          fontWeight="700"
          fill="#3A6B4A"
          letterSpacing="0.2em"
          textAnchor="middle"
        >
          CORE
        </text>
      </svg>
    );
  }

  // ── Grandparent mode ──────────────────────────────────────
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 280 100"
      fill="none"
      className={`${FULL_SIZES[size]} ${className}`}
      style={{ width: "auto" }}
      aria-label="Family Core"
    >
      <g transform="translate(0, 5) scale(0.9)">
        <path
          d="M50 10
             C 50 10, 25 28, 15 38
             C 5 48, 5 58, 15 65
             C 25 72, 35 68, 50 58
             C 65 68, 75 72, 85 65
             C 95 58, 95 48, 85 38
             C 75 28, 50 10, 50 10Z"
          fill="#1A1A1A"
        />
        <rect x="25" y="55" width="50" height="40" rx="0" ry="0" fill="#FFFFFF" stroke="#1A1A1A" strokeWidth="4" />
        <circle cx="50" cy="75" r="10" fill="#3A6B4A" />
      </g>
      <text x="115" y="55" fontFamily="Inter, 'Helvetica Neue', Arial, sans-serif" fontSize="38" fontWeight="700" fill="#1A1A1A" letterSpacing="0.08em">FAMILY</text>
      <text x="115" y="88" fontFamily="Inter, 'Helvetica Neue', Arial, sans-serif" fontSize="38" fontWeight="700" fill="#3A6B4A" letterSpacing="0.08em">CORE</text>
    </svg>
  );
}
