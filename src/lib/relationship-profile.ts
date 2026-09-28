/**
 * Relationship profile — pure derivation logic.
 *
 * Everything here works on interaction METADATA only: who, when, and which
 * kind of contact (a call, a note, a reaction, a gentle hello). Family Core
 * never reads or stores what anyone said, so every sentence this module
 * produces is built from timing and interaction type — never from content.
 *
 * No server imports, so the route can import it directly.
 */
import type { Interaction, ScoreCategory } from "~/lib/types";

// ---------------------------------------------------------------------------
// Warm copy for the score bands
// ---------------------------------------------------------------------------

/** Status line for "How we're doing", per connection-health band. */
export const WARM_BAND_COPY: Record<ScoreCategory, string> = {
  thriving: "warm & glowing — you're keeping this one close",
  steady: "warm & steady — a little nudge keeps it glowing",
  cooling: "cooling a little — a gentle hello would help",
  dormant: "a quiet season — a gentle hello could begin again",
};

/** One-line meaning of the 30-day trend factor, no numbers for the reader. */
export function trendLine(trend: number): string {
  if (trend >= 65) return "you've been reaching each other more lately";
  if (trend <= 35) return "a little quieter than the month before";
  return "holding steady over the last month";
}

// ---------------------------------------------------------------------------
// Names
// ---------------------------------------------------------------------------

export function firstName(displayName: string): string {
  const parts = displayName.trim().split(/\s+/);
  return parts.length > 1 ? parts[parts.length - 1] : parts[0] ?? displayName;
}

/** "Grandma Sue" → "G S" (mockup shows up to two initials). */
export function initials(displayName: string): string {
  return displayName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join(" ");
}

/**
 * Object pronoun for warm copy ("Sundays matter to her.").
 * Falls back to "them" whenever the family hasn't set one.
 */
export function objectPronoun(pronoun?: string | null): "her" | "him" | "them" {
  const p = (pronoun ?? "").trim().toLowerCase();
  if (p === "she" || p === "her") return "her";
  if (p === "he" || p === "him") return "him";
  return "them";
}

// ---------------------------------------------------------------------------
// Contact window
// ---------------------------------------------------------------------------

export const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

/** Days since an ISO timestamp (never negative). */
export function daysBetween(iso: string, now: number = Date.now()): number {
  return Math.max(0, Math.floor((now - new Date(iso).getTime()) / 86_400_000));
}

export function formatDaysAgo(days: number | null): string {
  if (days === null) return "not yet";
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  return `${days} days ago`;
}

/**
 * Contacts between one pair of members, newest first.
 * A contact is an interaction that went from one of them to the other
 * (group-wide rows with no recipient are not a conversation).
 */
export function pairContacts(
  interactions: Interaction[],
  memberA: string,
  memberB: string,
): Interaction[] {
  return interactions
    .filter(
      (ix) =>
        (ix.from_member_id === memberA && ix.to_member_id === memberB) ||
        (ix.from_member_id === memberB && ix.to_member_id === memberA),
    )
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
}

/** Days since the most recent contact, or null when there has never been one. */
export function lastContactDays(contacts: Interaction[]): number | null {
  if (contacts.length === 0) return null;
  return daysBetween(contacts[0].created_at);
}

// ---------------------------------------------------------------------------
// Rhythm insight
// ---------------------------------------------------------------------------

export interface RhythmInsight {
  day: string;
  count: number;
  sentence: string;
}

/**
 * The day of the week this pair most often reaches each other, turned into a
 * warm sentence. Needs at least three contacts before it claims a rhythm —
 * two messages on a Tuesday is not a rhythm.
 */
export function rhythmInsight(
  contacts: Interaction[],
  pronoun?: string | null,
  minContacts = 3,
): RhythmInsight | null {
  if (contacts.length < minContacts) return null;

  const counts = new Array<number>(7).fill(0);
  for (const ix of contacts) counts[new Date(ix.created_at).getDay()] += 1;

  let best = -1;
  let bestCount = 0;
  for (let day = 0; day < 7; day++) {
    if (counts[day] > bestCount) {
      bestCount = counts[day];
      best = day;
    }
  }
  if (best < 0 || bestCount < 2) return null;

  const day = DAY_NAMES[best];
  const plural = `${day}s`;
  return {
    day,
    count: bestCount,
    sentence: `You talk most on ${plural}. ${plural} matter to ${objectPronoun(pronoun)}.`,
  };
}

// ---------------------------------------------------------------------------
// Moments
// ---------------------------------------------------------------------------

export interface ProfileMoment {
  id: string;
  /** Warm title — an app-set label when the family gave one, else the kind of contact. */
  title: string;
  /** Optional second line, only ever built from metadata (duration, time of day). */
  note: string | null;
  /** "September 16 · after a call" */
  dateLabel: string;
  type: Interaction["interaction_type"];
}

const TYPE_TITLE: Record<Interaction["interaction_type"], string> = {
  call_started: "A call, just the two of you",
  message_sent: "A note, back and forth",
  reaction: "A warm reaction",
  nudge_sent: "A gentle hello",
  nudge_acknowledged: "Your hello came back",
  digest_opened: "A quiet visit",
};

const TYPE_DESCRIPTOR: Record<Interaction["interaction_type"], string> = {
  call_started: "after a call",
  message_sent: "after a note in the app",
  reaction: "after a warm reaction",
  nudge_sent: "after a gentle hello",
  nudge_acknowledged: "after your hello was answered",
  digest_opened: "in the weekly digest",
};

function metadataLine(metadata: Record<string, unknown>): string | null {
  const duration =
    typeof metadata.duration_minutes === "number"
      ? metadata.duration_minutes
      : null;
  const timeOfDay =
    typeof metadata.time_of_day === "string" ? metadata.time_of_day : null;

  if (duration !== null) {
    const when = timeOfDay ? `, in the ${timeOfDay}` : ", unhurried";
    return `a ${duration}-minute call${when}`;
  }
  if (timeOfDay) return `in the ${timeOfDay}`;
  return null;
}

/** "September 16" — with the year only once it isn't this year. */
export function formatMomentDate(iso: string, now: Date = new Date()): string {
  const d = new Date(iso);
  const opts: Intl.DateTimeFormatOptions =
    d.getFullYear() === now.getFullYear()
      ? { month: "long", day: "numeric" }
      : { month: "long", day: "numeric", year: "numeric" };
  return d.toLocaleDateString("en-US", opts);
}

/**
 * The moments list: the most recent contacts, newest first.
 * A title/note set by the family (metadata.title / metadata.note) wins over
 * the generic type wording — those are app-set memory labels, not content.
 */
export function buildMoments(
  contacts: Interaction[],
  max = 5,
): ProfileMoment[] {
  return contacts.slice(0, max).map((ix) => {
    const meta = (ix.metadata ?? {}) as Record<string, unknown>;
    const givenTitle =
      typeof meta.title === "string" && meta.title.trim().length > 0
        ? meta.title.trim()
        : null;
    const givenNote =
      typeof meta.note === "string" && meta.note.trim().length > 0
        ? meta.note.trim()
        : null;

    return {
      id: ix.id,
      title: givenTitle ?? TYPE_TITLE[ix.interaction_type] ?? "A moment",
      note: givenNote ?? metadataLine(meta),
      dateLabel: `${formatMomentDate(ix.created_at)} · ${
        TYPE_DESCRIPTOR[ix.interaction_type] ?? "a moment"
      }`,
      type: ix.interaction_type,
    };
  });
}

/** The icon that stands for each kind of contact (warm icon set, no emoji). */
export const TYPE_ICON: Record<
  Interaction["interaction_type"],
  "talk" | "nudge" | "heart" | "thumbs" | "digest" | "warm"
> = {
  call_started: "talk",
  message_sent: "nudge",
  reaction: "heart",
  nudge_sent: "warm",
  nudge_acknowledged: "thumbs",
  digest_opened: "digest",
};
