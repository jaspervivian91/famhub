/**
 * Family Core illustrated icon set.
 *
 * Hand-sketched SVGs from the warm design system
 * (/home/team/shared/design/icons/ — 24x24, 1.7px round ink strokes, warm palette).
 * These replace every emoji that was used as UI chrome.
 *
 * Icons are decorative by default (aria-hidden) — always pair them with a
 * visible text label, per design-system-warm.md §6.1.
 */
import type { JSX } from "react";

export type IconName =
  | "bell"
  | "celebration"
  | "check"
  | "checklist"
  | "clock"
  | "cooling"
  | "digest"
  | "heart"
  | "idea"
  | "members"
  | "nudge"
  | "pin"
  | "reconnect"
  | "reminder"
  | "talk"
  | "thumbs"
  | "warm";

/** Inner SVG markup, verbatim from the designer's files. */
const ICON_PATHS: Record<IconName, string> = {
  bell: `<path d="M12 3.4 C 8.9 3.4 6.6 6 6.6 9.1 L 6.6 12.2 C 6.6 13.2 6.2 14.1 5.6 14.8 L 4.9 15.7 C 4.5 16.4 4.9 17.3 5.7 17.3 L 18.3 17.3 C 19.1 17.3 19.5 16.4 19.1 15.7 L 18.4 14.8 C 17.8 14.1 17.4 13.2 17.4 12.2 L 17.4 9.1 C 17.4 6 15.1 3.4 12 3.4 Z" stroke="#1A1A1A" stroke-width="1.7" stroke-linejoin="round"/>
<path d="M12 18.6 C 11 18.6 10.3 19.3 10.4 20.1" stroke="#1A1A1A" stroke-width="1.6" stroke-linecap="round"/>
<path d="M15.6 5.5 C 16.7 6.6 17.3 7.6 17.4 8.9" stroke="#3A6B4A" stroke-width="1.5" stroke-linecap="round"/>`,
  celebration: `<path d="M4.2 16.8 C 5.7 15.2 7 13.8 8.3 13.8 C 9.5 13.8 9.9 15.3 8.8 16.3 C 7.9 17.2 6.3 17.1 5.6 18.2 C 5.1 19 7 19.6 8.4 19.6" stroke="#1A1A1A" stroke-width="1.5" stroke-linecap="round"/>
<path d="M9.5 10.2 L 11.3 12.6 M11.3 12.6 L 13.3 10.4 M11.3 12.6 L 11.5 15.2" stroke="#1A1A1A" stroke-width="1.5" stroke-linecap="round"/>
<path d="M14.2 4.6 C 14.5 6.2 15 6.7 16.6 7 C 15 7.3 14.5 7.8 14.2 9.4 C 13.9 7.8 13.4 7.3 11.8 7 C 13.4 6.7 13.9 6.2 14.2 4.6 Z" fill="#D4845A"/>
<path d="M19.6 13.2 L 19.9 14.4 L 21.1 14.7 L 19.9 15 L 19.6 16.2 L 19.3 15 L 18.1 14.7 L 19.3 14.4 Z" fill="#3A6B4A"/>
<path d="M17.4 18.9 L 17.6 19.7 L 18.4 19.9 L 17.6 20.1 L 17.4 20.9 L 17.2 20.1 L 16.4 19.9 L 17.2 19.7 Z" fill="#D4845A"/>`,
  check: `<path d="M12 3.2 C 7.2 3.2 3.3 7.1 3.3 11.9 C 3.3 16.8 7.2 20.7 12 20.7 C 16.9 20.7 20.8 16.8 20.8 11.9 C 20.8 7.1 16.9 3.2 12 3.2 Z" stroke="#1A1A1A" stroke-width="1.7" stroke-linecap="round"/>
<path d="M7.4 12.5 C 8.4 13.7 9.3 14.8 10.8 16.2 C 12.9 13.4 14.9 10.6 16.9 7.9" stroke="#3A6B4A" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`,
  checklist: `<path d="M8.1 3.9 L 15.9 3.9 C 17 3.9 17.9 4.8 17.9 5.9 L 17.9 19.9 C 17.9 21 17 21.9 15.9 21.9 L 8.1 21.9 C 7 21.9 6.1 21 6.1 19.9 L 6.1 5.9 C 6.1 4.8 7 3.9 8.1 3.9 Z" stroke="#1A1A1A" stroke-width="1.7" stroke-linejoin="round"/>
<path d="M9 2.4 L 15 2.4 C 15.6 2.4 16 2.9 16 3.5 L 13.6 4.4 C 13.2 4.6 12.8 4.8 12.4 5.1 C 11.7 5.4 10.8 5.4 10.1 5.1 C 9.7 4.9 9.3 4.7 8.9 4.4 L 8 3.5 C 8 2.9 8.4 2.4 9 2.4 Z" fill="#E8D5C0" stroke="#1A1A1A" stroke-width="1.4" stroke-linejoin="round"/>
<path d="M8.2 10.4 L 10 12.2 C 11.4 10.5 12.9 8.9 14.5 7.4" stroke="#3A6B4A" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M10.2 16.6 L 13.6 16.6" stroke="#1A1A1A" stroke-width="1.7" stroke-linecap="round"/>
<path d="M10.2 19.3 L 12.9 19.3" stroke="#1A1A1A" stroke-width="1.7" stroke-linecap="round"/>`,
  clock: `<path d="M12 3.2 C 7.2 3.2 3.3 7.1 3.3 11.9 C 3.3 16.8 7.2 20.7 12 20.7 C 16.9 20.7 20.8 16.8 20.8 11.9 C 20.8 7.1 16.9 3.2 12 3.2 Z" stroke="#1A1A1A" stroke-width="1.7" stroke-linecap="round"/>
<path d="M12 7.4 L 12 12.2 L 15.4 14.2" stroke="#1A1A1A" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
<circle cx="12" cy="12" r="1.1" fill="#D4845A"/>`,
  cooling: `<path d="M9.7 5.4 L 14.3 5.4 C 14.8 5.4 15.3 5.9 15.3 6.4 L 15.3 15.9 C 15.3 17.9 14 19.6 12.3 20.2 L 11.7 20.2 C 10 19.6 8.7 17.9 8.7 15.9 L 8.7 6.4 C 8.7 5.9 9.2 5.4 9.7 5.4 Z" stroke="#1A1A1A" stroke-width="1.7" stroke-linejoin="round"/>
<path d="M12 7 L 12 15" stroke="#D4845A" stroke-width="2.1" stroke-linecap="round"/>
<circle cx="12" cy="17.2" r="2" fill="#D4845A"/>
<path d="M10.8 9.8 L 11.3 9.8" stroke="#1A1A1A" stroke-width="1.4" stroke-linecap="round"/>
<path d="M10.8 12.3 L 11.3 12.3" stroke="#1A1A1A" stroke-width="1.4" stroke-linecap="round"/>`,
  digest: `<path d="M3.8 6.6 C 3.8 5.5 4.7 4.6 5.8 4.6 L 18.2 4.6 C 19.3 4.6 20.2 5.5 20.2 6.6 L 20.2 17.4 C 20.2 18.5 19.3 19.4 18.2 19.4 L 5.8 19.4 C 4.7 19.4 3.8 18.5 3.8 17.4 Z" stroke="#1A1A1A" stroke-width="1.7" stroke-linejoin="round"/>
<path d="M4.3 5.5 L 11.3 11.2 C 11.7 11.6 12.3 11.6 12.7 11.2 L 19.7 5.5" stroke="#1A1A1A" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
<circle cx="15.4" cy="12.6" r="3" stroke="#3A6B4A" stroke-width="1.5"/>
<path d="M15.4 11.2 L 15.4 13.2 M14.4 12.2 L 16.4 12.2" stroke="#3A6B4A" stroke-width="1.2" stroke-linecap="round"/>
<path d="M6.6 14.8 L 11.6 14.8" stroke="#1A1A1A" stroke-width="1.5" stroke-linecap="round"/>`,
  heart: `<path d="M11.8 17.6 C 6.9 13.9 4.6 10.7 4.6 7.9 C 4.6 5.6 6.4 4.3 8.4 4.3 C 9.5 4.3 10.6 4.8 11.4 5.7 C 11.7 6.1 12.2 6.1 12.5 5.7 C 13.3 4.8 14.4 4.3 15.5 4.3 C 17.5 4.3 19.3 5.6 19.3 7.9 C 19.3 10.7 17 13.9 12.1 17.6 C 12 17.7 11.9 17.7 11.8 17.6 Z" fill="#3A6B4A" stroke="#1A1A1A" stroke-width="1.7" stroke-linejoin="round"/>
<path d="M20.4 13.4 C 20.4 12.3 21.3 11.4 22.3 11.4 C 21.3 11.4 20.4 10.5 20.4 9.4 C 20.4 10.5 19.5 11.4 18.5 11.4 C 19.5 11.4 20.4 12.3 20.4 13.4 Z" fill="#D4845A"/>`,
  idea: `<path d="M12 3.2 C 8.9 3.2 6.5 5.6 6.5 8.7 C 6.5 11.3 8.2 13 8.9 14.6 L 15.1 14.6 C 15.8 13 17.5 11.3 17.5 8.7 C 17.5 5.6 15.1 3.2 12 3.2 Z" stroke="#1A1A1A" stroke-width="1.7" stroke-linejoin="round"/>
<path d="M14.6 7.2 C 14.4 6.2 13.3 5.6 12.2 5.9" stroke="#D4845A" stroke-width="1.5" stroke-linecap="round"/>
<path d="M9.2 17 L 14.8 17" stroke="#1A1A1A" stroke-width="1.7" stroke-linecap="round"/>
<path d="M10.2 19.5 L 13.8 19.5" stroke="#1A1A1A" stroke-width="1.7" stroke-linecap="round"/>
<path d="M12 14.6 L 12 16.4" stroke="#3A6B4A" stroke-width="1.6" stroke-linecap="round"/>`,
  members: `<circle cx="8.2" cy="8" r="3.1" stroke="#1A1A1A" stroke-width="1.7"/>
<path d="M3.4 20.3 C 3.4 16.4 5.6 14 8.2 14 C 10.8 14 13 16.4 13 20.3" stroke="#1A1A1A" stroke-width="1.7" stroke-linecap="round"/>
<circle cx="16.6" cy="8.8" r="2.5" stroke="#3A6B4A" stroke-width="1.7"/>
<path d="M15.2 14.4 C 16.9 13.9 18.4 14.2 19.6 15.2 C 20.5 16 21 17.4 21.1 19" stroke="#1A1A1A" stroke-width="1.7" stroke-linecap="round"/>`,
  nudge: `<path d="M3.7 6.8 C 3.7 5.5 4.7 4.5 6 4.5 L 18 4.5 C 19.3 4.5 20.3 5.5 20.3 6.8 L 20.3 17.2 C 20.3 18.5 19.3 19.5 18 19.5 L 6 19.5 C 4.7 19.5 3.7 18.5 3.7 17.2 Z" stroke="#1A1A1A" stroke-width="1.7" stroke-linejoin="round"/>
<path d="M4.2 5.6 L 11.2 11.3 C 11.7 11.7 12.3 11.7 12.8 11.3 L 19.8 5.6" stroke="#1A1A1A" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M12 15.9 C 10.6 14.9 9.7 13.9 9.7 13 C 9.7 12.3 10.3 11.7 11 11.7 C 11.4 11.7 11.7 11.9 12 12.2 C 12.3 11.9 12.6 11.7 13 11.7 C 13.7 11.7 14.3 12.3 14.3 13 C 14.3 13.9 13.4 14.9 12 15.9 Z" fill="#D4845A" stroke="#1A1A1A" stroke-width="1.3" stroke-linejoin="round"/>`,
  pin: `<path d="M12 3.4 C 8.8 3.4 6.3 6 6.3 9.1 C 6.3 13.4 11.9 20.4 12 20.5 C 12.1 20.4 17.7 13.4 17.7 9.1 C 17.7 6 15.2 3.4 12 3.4 Z" stroke="#1A1A1A" stroke-width="1.7" stroke-linejoin="round"/>
<circle cx="12" cy="9" r="2.4" fill="#D4845A" stroke="#1A1A1A" stroke-width="1.4"/>`,
  reconnect: `<path d="M18.7 8.3 C 18.7 4.8 15.9 2.3 12.2 2.3 C 8.5 2.3 5.7 5 5.7 8.5 C 5.7 11.9 8.3 14.5 11.6 14.8" stroke="#1A1A1A" stroke-width="1.7" stroke-linecap="round"/>
<path d="M11.6 14.8 L 9.5 13.2 M11.6 14.8 L 11.3 16.6" stroke="#1A1A1A" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M5.3 15.7 C 5.3 19.2 8.1 21.7 11.8 21.7 C 15.5 21.7 18.3 19 18.3 15.5 C 18.3 12.1 15.7 9.5 12.4 9.2" stroke="#3A6B4A" stroke-width="1.7" stroke-linecap="round"/>
<path d="M12.4 9.2 L 14.5 7.6 M12.4 9.2 L 12.7 11" stroke="#3A6B4A" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>`,
  reminder: `<path d="M12 4.4 C 12.9 4.4 13.7 5.1 14.1 5.9 L 21.1 18.4 C 21.6 19.4 21.1 20.5 20.1 20.6 L 3.9 20.6 C 2.9 20.5 2.4 19.4 2.9 18.4 L 9.9 5.9 C 10.3 5.1 11.1 4.4 12 4.4 Z" stroke="#1A1A1A" stroke-width="1.7" stroke-linejoin="round"/>
<path d="M12 8.2 V 13.6" stroke="#1A1A1A" stroke-width="2" stroke-linecap="round"/>
<circle cx="12" cy="16.6" r="1.15" fill="#3A6B4A"/>`,
  talk: `<path d="M12 3.6 C 7 3.6 3.5 6.7 3.5 10.5 C 3.5 14.3 7 17.4 12 17.4 L 14.7 17.4 L 19.6 20.5 L 18.8 17 C 20.5 15.3 21.4 12.7 20.5 10.4 C 19.7 8.4 16.6 3.6 12 3.6 Z" stroke="#1A1A1A" stroke-width="1.7" stroke-linejoin="round"/>
<circle cx="8.4" cy="10.6" r="0.9" fill="#1A1A1A"/>
<circle cx="12" cy="10.6" r="0.9" fill="#1A1A1A"/>
<circle cx="15.6" cy="10.6" r="0.9" fill="#3A6B4A"/>`,
  thumbs: `<path d="M7.6 17.2 L 7.6 12.4 C 7.6 11.6 8.2 11 9 11 L 10 11 C 10.7 11 11.3 10.4 11.3 9.7 L 11.3 6.4 C 11.3 5.3 12.2 4.5 13.3 4.5 C 14.3 4.5 15.1 5.4 15.1 6.4 L 15.1 9 L 17.6 9 C 18.7 9 19.5 9.7 19.5 10.8 L 19.5 14.6 C 19.5 17.1 17.3 19.8 14.6 19.8 L 10 19.8 C 8.7 19.8 7.6 18.6 7.6 17.2 Z" stroke="#1A1A1A" stroke-width="1.7" stroke-linejoin="round"/>
<path d="M4.6 17.6 L 4.6 11.4 C 4.6 10.8 5.1 10.3 5.7 10.3 C 6.3 10.3 6.8 10.8 6.8 11.4 L 6.8 17.6 C 6.8 18.2 6.3 18.7 5.7 18.7 C 5.1 18.7 4.6 18.2 4.6 17.6 Z" fill="#3A6B4A" stroke="#1A1A1A" stroke-width="1.3" stroke-linejoin="round"/>`,
  warm: `<path d="M12 3.2 C 12.5 8.8 13.7 11 20.8 12 C 13.7 13 12.5 15.2 12 20.8 C 11.5 15.2 10.3 13 3.2 12 C 10.3 11 11.5 8.8 12 3.2 Z" fill="#D4845A" stroke="#1A1A1A" stroke-width="1.6" stroke-linejoin="round"/>
<path d="M5.4 5.6 C 5.6 7.2 6.2 7.8 7.8 8 C 6.2 8.2 5.6 8.8 5.4 10.4 C 5.2 8.8 4.6 8.2 3 8 C 4.6 7.8 5.2 7.2 5.4 5.6 Z" fill="#3A6B4A" opacity="0.85"/>
<path d="M18.6 15.4 C 18.75 16.45 19.15 16.85 20.2 17 C 19.15 17.15 18.75 17.55 18.6 18.6 C 18.45 17.55 18.05 17.15 17 17 C 18.05 16.85 18.45 16.45 18.6 15.4 Z" stroke="#1A1A1A" stroke-width="1.4" stroke-linecap="round"/>`,
};

export interface IconProps {
  name: IconName;
  /** Pixel size. Card headers/inline labels 22–24, buttons 18–20, empty states 52–56, GP mode 32+. */
  size?: number;
  className?: string;
  /** Accessible label. Omit for purely decorative icons (the default). */
  label?: string;
}

export function Icon({ name, size = 24, className = "", label }: IconProps): JSX.Element {
  const decorative = !label;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      width={size}
      height={size}
      className={`inline-block shrink-0 ${className}`}
      style={{ verticalAlign: "-0.15em" }}
      role={decorative ? undefined : "img"}
      aria-hidden={decorative ? "true" : undefined}
      aria-label={label}
      dangerouslySetInnerHTML={{ __html: ICON_PATHS[name] }}
    />
  );
}

/** Circle chip that holds a large sketch icon in empty states (spec §6.1). */
export function IconChip({ name, size = 32, className = "" }: { name: IconName; size?: number; className?: string }) {
  const box = Math.round(size * 1.75);
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full ${className}`}
      style={{ width: box, height: box, backgroundColor: "var(--color-fh-surface)" }}
    >
      <Icon name={name} size={size} />
    </span>
  );
}
