/**
 * Demo / sample data — OPT-IN ONLY. Do not import from this module without
 * reading this header.
 *
 * Family Core's promise is honesty about what it does and does not know: the
 * app tells you when a relationship is going quiet, it never invents people.
 * So every invented family that ships for demos lives here, in one place, and
 * is reachable only through the explicit switches below.
 *
 * Two switches gate every demo screen, and BOTH must allow it:
 *
 *   1. The request asks for it — the query param `?demo=1` on the screen:
 *        /grandparent?demo=1     /digest?demo=1
 *   2. The deployment has not turned demo data off:
 *        FAMILY_CORE_DEMO_MODE=0   → demo data disabled everywhere
 *                                    (set this on the live site)
 *        unset                     → allowed, but still only with ?demo=1
 *
 * Anything else — no family group, a member with no data, a failed lookup —
 * renders a truthful empty state or a calm retry. It never renders this file.
 * Screens that do use demo data show DEMO_NOTICE so nobody mistakes it for real.
 *
 * See also: src/routes/grandparent.tsx, src/routes/digest.tsx.
 */

import type { FamilyMember, Nudge } from "~/lib/types";

/** Always shown alongside demo data, so it can never pass for a real family. */
export const DEMO_NOTICE = "Sample family — demo only, not real people";

/** True when the request itself asked for demo data (`?demo=1`). */
export function demoRequested(queryDemo: unknown): boolean {
  return queryDemo === true || queryDemo === "1" || queryDemo === 1;
}

/** True unless this deployment has switched demo data off. */
export function demoDeploymentEnabled(): boolean {
  const flag =
    typeof process !== "undefined"
      ? process.env?.FAMILY_CORE_DEMO_MODE
      : undefined;
  if (flag === undefined) return true; // unset → allowed, but only with ?demo=1
  return !["0", "off", "false", "no", ""].includes(
    String(flag).trim().toLowerCase(),
  );
}

/**
 * The single gate for demo data. Call this inside a `createServerFn` handler
 * (never at module scope — a client bundle has no `process`).
 */
export function isDemoMode(queryDemo: unknown): boolean {
  return demoRequested(queryDemo) && demoDeploymentEnabled();
}

// ---------------------------------------------------------------------------
// The sample grandparent — /grandparent?demo=1
// ---------------------------------------------------------------------------

/** The person the demo screen is pretending to be. "Grandma Sue" is the viewer. */
export const DEMO_VIEWER = { id: "demo-viewer", name: "Grandma" };

export const DEMO_GRANDPARENT_GROUP_NAME = "The Johnson Family";

const demoMember = (
  id: string,
  display_name: string,
  relationship: string,
  timezone: string,
  preferences?: FamilyMember["preferences"],
): FamilyMember => ({
  id,
  group_id: "demo-group",
  display_name,
  relationship,
  avatar_url: null,
  timezone,
  created_at: new Date().toISOString(),
  ...(preferences ? { preferences } : {}),
});

export const DEMO_GRANDPARENT_VIEWER: FamilyMember = demoMember(
  DEMO_VIEWER.id,
  "Grandma Sue",
  "grandparent",
  "America/Chicago",
  {
    id: "demo-pref",
    member_id: DEMO_VIEWER.id,
    ui_mode: "grandparent",
    notifications_enabled: true,
    digest_frequency: "weekly",
  },
);

/** Everyone in the demo family except the viewer. */
export const DEMO_GRANDPARENT_OTHERS: FamilyMember[] = [
  demoMember("demo-a", "Sarah", "child", "America/New_York"),
  demoMember("demo-b", "Michael", "child", "America/Denver"),
  demoMember("demo-c", "Little Emma", "grandchild", "America/New_York"),
];

export const DEMO_GRANDPARENT_NUDGES: (Nudge & { from_name: string })[] = [
  {
    id: "demo-nudge-1",
    group_id: "demo-group",
    from_member_id: "demo-a",
    to_member_id: DEMO_VIEWER.id,
    nudge_type: "dormancy",
    message_text:
      "It's been a little while, and Emma has been asking about you. She'd love to hear your voice.",
    status: "pending",
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    acknowledged_at: null,
    from_name: "Sarah",
  },
  {
    id: "demo-nudge-2",
    group_id: "demo-group",
    from_member_id: "demo-c",
    to_member_id: DEMO_VIEWER.id,
    nudge_type: "celebration",
    message_text:
      "Little Emma has been asking about you! She'd love to hear from Grandma.",
    status: "pending",
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    acknowledged_at: null,
    from_name: "Little Emma",
  },
];

// ---------------------------------------------------------------------------
// The sample family used by the digest — /digest?demo=1
// ---------------------------------------------------------------------------

/**
 * Sample members for `buildDemoDigestContent` in digest-engine. Only reachable
 * from the demo path of the digest.
 */
export const DEMO_DIGEST_MEMBERS: FamilyMember[] = [
  {
    id: "demo-a",
    group_id: "demo-group",
    display_name: "Sarah",
    relationship: "parent",
    avatar_url: null,
    timezone: "America/New_York",
    created_at: "2026-01-15T00:00:00Z",
  },
  {
    id: "demo-b",
    group_id: "demo-group",
    display_name: "Michael",
    relationship: "sibling",
    avatar_url: null,
    timezone: "America/Chicago",
    created_at: "2026-01-15T00:00:00Z",
  },
  {
    id: "demo-c",
    group_id: "demo-group",
    display_name: "Grandma Sue",
    relationship: "grandparent",
    avatar_url: null,
    timezone: "America/Los_Angeles",
    created_at: "2026-01-15T00:00:00Z",
    preferences: {
      id: "demo-pref-c",
      member_id: "demo-c",
      ui_mode: "grandparent",
      notifications_enabled: true,
      digest_frequency: "weekly",
    },
  },
  {
    id: "demo-d",
    group_id: "demo-group",
    display_name: "Uncle Joe",
    relationship: "aunt_uncle",
    avatar_url: null,
    timezone: "America/Denver",
    created_at: "2026-01-15T00:00:00Z",
  },
];
