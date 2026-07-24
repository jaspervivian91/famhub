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
        aria-label="Family Hub"
      >
        <path
          d="M50 10 C 50 10, 25 28, 15 38 C 5 48, 5 58, 15 65 C 25 72, 35 68, 50 58 C 65 68, 75 72, 85 65 C 95 58, 95 48, 85 38 C 75 28, 50 10, 50 10Z"
          fill="#C4714A"
          stroke="#C4714A"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <rect
          x="25" y="55"
          width="50" height="40"
          rx="6" ry="6"
          fill="#FFFDF7"
          stroke="#C4714A"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="50" cy="75" r="10" fill="#E5B454" opacity="0.9" />
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
        aria-label="Family Hub"
      >
        <g transform="translate(0, 5) scale(0.85)">
          <path
            d="M50 10 C 50 10, 25 28, 15 38 C 5 48, 5 58, 15 65 C 25 72, 35 68, 50 58 C 65 68, 75 72, 85 65 C 95 58, 95 48, 85 38 C 75 28, 50 10, 50 10Z"
            fill="#C4714A"
          />
          <rect
            x="25" y="55" width="50" height="40"
            rx="6" fill="#FFFDF7" stroke="#C4714A" strokeWidth="3"
          />
          <circle cx="50" cy="75" r="10" fill="#E5B454" />
        </g>
        <text
          x="110" y="52"
          fontFamily="'DM Serif Display', Georgia, 'Times New Roman', serif"
          fontSize="36"
          fontWeight="400"
          fill="#1A1614"
          letterSpacing="-0.02"
        >
          Family
        </text>
        <text
          x="110" y="85"
          fontFamily="'DM Serif Display', Georgia, 'Times New Roman', serif"
          fontSize="36"
          fontWeight="400"
          fill="#C4714A"
          letterSpacing="-0.02"
        >
          Hub
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
        aria-label="Family Hub"
      >
        <g transform="translate(5, 5) scale(0.9)">
          <path
            d="M50 10 C 50 10, 25 28, 15 38 C 5 48, 5 58, 15 65 C 25 72, 35 68, 50 58 C 65 68, 75 72, 85 65 C 95 58, 95 48, 85 38 C 75 28, 50 10, 50 10Z"
            fill="#C4714A"
          />
          <rect x="25" y="55" width="50" height="40" rx="6" fill="#FFFDF7" stroke="#C4714A" strokeWidth="3" />
          <circle cx="50" cy="75" r="10" fill="#E5B454" />
        </g>
        <text x="50" y="112" fontFamily="'DM Serif Display', Georgia, serif" fontSize="18" fontWeight="400" fill="#1A1614" textAnchor="middle" letterSpacing="0.1">Family</text>
        <text x="50" y="128" fontFamily="'DM Serif Display', Georgia, serif" fontSize="18" fontWeight="400" fill="#C4714A" textAnchor="middle" letterSpacing="0.1">Hub</text>
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
      aria-label="Family Hub"
    >
      <g transform="translate(0, 5) scale(0.9)">
        <path
          d="M50 10 C 50 10, 25 28, 15 38 C 5 48, 5 58, 15 65 C 25 72, 35 68, 50 58 C 65 68, 75 72, 85 65 C 95 58, 95 48, 85 38 C 75 28, 50 10, 50 10Z"
          fill="#2B6B9A" stroke="#2B6B9A" strokeWidth="3"
        />
        <rect x="25" y="55" width="50" height="40" rx="6" fill="white" stroke="#2B6B9A" strokeWidth="4" />
        <circle cx="50" cy="75" r="10" fill="#FFB800" />
      </g>
      <text x="115" y="55" fontFamily="'Atkinson Hyperlegible', Arial, sans-serif" fontSize="38" fontWeight="700" fill="#1A1A1A">Family</text>
      <text x="115" y="88" fontFamily="'Atkinson Hyperlegible', Arial, sans-serif" fontSize="38" fontWeight="700" fill="#2B6B9A">Hub</text>
    </svg>
  );
}
