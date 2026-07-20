/**
 * Digest Engine — Weekly digest generator for Family Hub.
 *
 * Builds personalized weekly digests that curate relationship health,
 * conversation-worthy moments, and icebreakers into a single summary
 * designed to spark real-world connection — not app engagement.
 *
 * The engine works with both live DB interactions and mock data so
 * the UI always renders, even without a database connection.
 */

import type {
  Digest,
  PairScore,
  FamilyMember,
  Interaction,
  ConversationStarter,
} from "~/lib/types";
import {
  computeAllPairScores,
  categorizeScore,
  generateMockInteractions,
} from "~/lib/relationship-engine";
import { generateConversationStarters } from "~/lib/conversation-starters";

// ---------------------------------------------------------------------------
// Digest content type
// ---------------------------------------------------------------------------

export interface DigestContent {
  weekLabel: string;
  weekStart: string;
  weekEnd: string;
  memberName: string;
  connectionSnapshot: DigestPairSnapshot[];
  momentsToMention: DigestMoment[];
  conversationStarters: ConversationStarter[];
  irlNudge: DigestIRLNudge | null;
  generatedAt: string;
}

export interface DigestPairSnapshot {
  memberA: { id: string; name: string };
  memberB: { id: string; name: string };
  score: number;
  category: string;
  label: string;
  emoji: string;
}

export interface DigestMoment {
  type: "reconnection" | "appreciation" | "dormancy_alert" | "celebration";
  emoji: string;
  text: string;
  priority: number; // 1 = highest
}

export interface DigestIRLNudge {
  memberName: string;
  relationship: string;
  activitySuggestion: string;
  score: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const CATEGORY_EMOJI: Record<string, string> = {
  thriving: "💚",
  steady: "🟢",
  cooling: "🟡",
  dormant: "🔴",
};

const CATEGORY_LABEL: Record<string, string> = {
  thriving: "Thriving",
  steady: "Steady",
  cooling: "Cooling down",
  dormant: "Needs attention",
};

function getWeekRange(): { start: string; end: string; label: string } {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sun
  const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

  const monday = new Date(now);
  monday.setDate(now.getDate() - daysSinceMonday);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric" });

  return {
    start: monday.toISOString(),
    end: sunday.toISOString(),
    label: `${fmt(monday)} – ${fmt(sunday)}`,
  };
}

const ACTIVITY_SUGGESTIONS: string[] = [
  "How about inviting {name} for coffee this weekend? ☕",
  "Plan a walk in the park with {name} — fresh air and conversation! 🌳",
  "Invite {name} over for a home-cooked meal this week 🍲",
  "Suggest a video call with {name} — just 10 minutes to catch up 📱",
  "Send {name} a handwritten note or postcard — it means more than a text ✉️",
  "Drop by {name}'s place with their favorite treat 🧁",
  "Invite {name} to join you for a weekend outing 🚶",
  "Schedule a regular coffee date with {name} — same time each week ☕",
];

function pickIRLSuggestion(name: string): string {
  const template =
    ACTIVITY_SUGGESTIONS[Math.floor(Math.random() * ACTIVITY_SUGGESTIONS.length)];
  return template.replace(/\{name\}/g, name);
}

// ---------------------------------------------------------------------------
// Mock data for development
// ---------------------------------------------------------------------------

const MOCK_MEMBERS: FamilyMember[] = [
  {
    id: "mock-a",
    group_id: "mock-group",
    display_name: "Sarah",
    relationship: "parent",
    avatar_url: null,
    timezone: "America/New_York",
    created_at: "2026-01-15T00:00:00Z",
  },
  {
    id: "mock-b",
    group_id: "mock-group",
    display_name: "Michael",
    relationship: "sibling",
    avatar_url: null,
    timezone: "America/Chicago",
    created_at: "2026-01-15T00:00:00Z",
  },
  {
    id: "mock-c",
    group_id: "mock-group",
    display_name: "Grandma Sue",
    relationship: "grandparent",
    avatar_url: null,
    timezone: "America/Los_Angeles",
    created_at: "2026-01-15T00:00:00Z",
    preferences: {
      id: "pref-c",
      member_id: "mock-c",
      ui_mode: "grandparent",
      notifications_enabled: true,
      digest_frequency: "weekly",
    },
  },
  {
    id: "mock-d",
    group_id: "mock-group",
    display_name: "Uncle Joe",
    relationship: "aunt_uncle",
    avatar_url: null,
    timezone: "America/Denver",
    created_at: "2026-01-15T00:00:00Z",
  },
];

function buildMockDigestContent(
  memberId: string,
  _interactions: Interaction[],
): DigestContent {
  const week = getWeekRange();
  const member =
    MOCK_MEMBERS.find((m) => m.id === memberId) ?? MOCK_MEMBERS[0];
  const others = MOCK_MEMBERS.filter((m) => m.id !== memberId);

  // Build connection snapshots
  const snapshots: DigestPairSnapshot[] = others.map((other, i) => {
    const score = [85, 62, 28, 45][i % 4];
    const category = categorizeScore(score);
    return {
      memberA: { id: member.id, name: member.display_name },
      memberB: { id: other.id, name: other.display_name },
      score,
      category,
      label: CATEGORY_LABEL[category],
      emoji: CATEGORY_EMOJI[category],
    };
  });

  // Sort: lowest scores first (needs attention), then highest
  snapshots.sort((a, b) => {
    if (a.score <= 30 && b.score > 30) return -1;
    if (b.score <= 30 && a.score > 30) return 1;
    return b.score - a.score;
  });

  // Build moments
  const moments: DigestMoment[] = [
    {
      type: "reconnection",
      emoji: "🎉",
      text: "Sarah and Michael reconnected this week after 45 days!",
      priority: 1,
    },
    {
      type: "appreciation",
      emoji: "❤️",
      text: "Grandma has been thinking of you — she sent 3 ❤️s this week",
      priority: 2,
    },
    {
      type: "dormancy_alert",
      emoji: "⏰",
      text: "You haven't chatted with Uncle Joe in 3 weeks",
      priority: 3,
    },
    {
      type: "celebration",
      emoji: "🌟",
      text: "Your family group is growing — 12 interactions this week!",
      priority: 4,
    },
    {
      type: "appreciation",
      emoji: "💬",
      text: "Sarah started 3 conversations this week — she's reaching out!",
      priority: 5,
    },
  ];

  // Conversation starters for the most-dormant relationship
  const dormantRelation = snapshots.find((s) => s.score <= 35);
  const starters = generateConversationStarters({
    relationshipType:
      (others.find((o) => o.id === dormantRelation?.memberB.id)
        ?.relationship as
        | "grandparent"
        | "parent"
        | "child"
        | "sibling"
        | "cousin"
        | "spouse"
        | "aunt_uncle"
        | "family") ?? "family",
    daysSinceLastContact:
      dormantRelation && dormantRelation.score <= 30 ? 45 : 14,
    memberName: dormantRelation?.memberB.name ?? "them",
  });

  // IRL nudge
  const irlNudge: DigestIRLNudge | null = dormantRelation
    ? {
        memberName: dormantRelation.memberB.name,
        relationship:
          others.find((o) => o.id === dormantRelation.memberB.id)
            ?.relationship ?? "family",
        activitySuggestion: pickIRLSuggestion(dormantRelation.memberB.name),
        score: dormantRelation.score,
      }
    : null;

  return {
    weekLabel: week.label,
    weekStart: week.start,
    weekEnd: week.end,
    memberName: member.display_name,
    connectionSnapshot: snapshots.slice(0, 3),
    momentsToMention: moments.slice(0, 4),
    conversationStarters: starters,
    irlNudge,
    generatedAt: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Generate a personalized digest for one member.
 *
 * @param groupId    - The family group ID
 * @param memberId   - The member to generate a digest for
 * @param interactions - Array of interactions (real or mock)
 * @param members    - Array of group members (real or mock)
 * @returns A Digest object with content populated
 */
export function generateDigest(
  groupId: string,
  memberId: string,
  interactions: Interaction[],
  members: FamilyMember[],
): Digest {
  const member = members.find((m) => m.id === memberId);
  const others = members.filter((m) => m.id !== memberId);

  // If no real data, fall back to mock
  if (members.length === 0 || interactions.length === 0) {
    const content = buildMockDigestContent(memberId, interactions);
    return {
      id: `digest-mock-${Date.now()}`,
      group_id: groupId,
      member_id: memberId,
      content: content as unknown as Record<string, unknown>,
      sent_at: null,
      opened_at: null,
    };
  }

  const week = getWeekRange();
  const memberName = member?.display_name ?? "You";

  // --- Connection snapshot ---
  const memberIds = members.map((m) => m.id);
  const scores = computeAllPairScores(
    memberIds,
    interactions.map((ix) => ({
      from_member_id: ix.from_member_id,
      to_member_id: ix.to_member_id,
      created_at: ix.created_at,
    })),
  );

  // Filter to pairs involving this member
  const myScores = scores.filter(
    (s) => s.fromMemberId === memberId || s.toMemberId === memberId,
  );

  const snapshots: DigestPairSnapshot[] = myScores.map((s) => {
    const otherId =
      s.fromMemberId === memberId ? s.toMemberId : s.fromMemberId;
    const other = others.find((m) => m.id === otherId);
    return {
      memberA: { id: memberId, name: memberName },
      memberB: {
        id: otherId,
        name: other?.display_name ?? "Family member",
      },
      score: s.score,
      category: s.category,
      label: CATEGORY_LABEL[s.category],
      emoji: CATEGORY_EMOJI[s.category],
    };
  });

  // Sort: dormant first, then by score ascending
  snapshots.sort((a, b) => {
    if (a.score <= 30 && b.score > 30) return -1;
    if (b.score <= 30 && a.score > 30) return 1;
    return a.score - b.score;
  });

  // --- Moments to mention ---
  const moments: DigestMoment[] = [];

  // Detect recent reconnections
  for (const s of myScores) {
    if (s.factors.trend >= 70 && s.score > 30) {
      const otherId =
        s.fromMemberId === memberId ? s.toMemberId : s.fromMemberId;
      const other = others.find((m) => m.id === otherId);
      moments.push({
        type: "reconnection",
        emoji: "🎉",
        text: `${memberName} and ${other?.display_name ?? "someone"} reconnected this week!`,
        priority: 1,
      });
    }
  }

  // Detect dormant relationships
  for (const s of myScores) {
    if (s.score <= 30) {
      const otherId =
        s.fromMemberId === memberId ? s.toMemberId : s.fromMemberId;
      const other = others.find((m) => m.id === otherId);
      const daysEstimate = Math.round(90 * (1 - s.factors.recency / 100));
      const timeText =
        daysEstimate > 60
          ? `over ${Math.round(daysEstimate / 7)} weeks`
          : `${daysEstimate} days`;
      moments.push({
        type: "dormancy_alert",
        emoji: "⏰",
        text: `You haven't chatted with ${other?.display_name ?? "a family member"} in ${timeText}`,
        priority: 2,
      });
    }
  }

  // Count interactions this member initiated vs received
  let sentCount = 0;
  let receivedCount = 0;
  const weekStartMs = new Date(week.start).getTime();
  for (const ix of interactions) {
    if (new Date(ix.created_at).getTime() >= weekStartMs) {
      if (ix.from_member_id === memberId) sentCount++;
      else if (ix.to_member_id === memberId) receivedCount++;
    }
  }
  if (receivedCount > sentCount && receivedCount > 0) {
    const topSender = others.find((m) => {
      const count = interactions.filter(
        (ix) =>
          ix.from_member_id === m.id &&
          ix.to_member_id === memberId &&
          new Date(ix.created_at).getTime() >= weekStartMs,
      ).length;
      return count > 0;
    });
    if (topSender) {
      moments.push({
        type: "appreciation",
        emoji: "❤️",
        text: `${topSender.display_name} has been thinking of you — they reached out ${receivedCount} time${receivedCount > 1 ? "s" : ""} this week`,
        priority: 3,
      });
    }
  }

  // General celebration if overall activity is high
  const totalWeekInteractions = interactions.filter(
    (ix) => new Date(ix.created_at).getTime() >= weekStartMs,
  ).length;
  if (totalWeekInteractions > 5) {
    moments.push({
      type: "celebration",
      emoji: "🌟",
      text: `Your family had ${totalWeekInteractions} interactions this week — staying connected!`,
      priority: 4,
    });
  }

  // Ensure we have at least 3 moments; pad with generic ones if needed
  if (moments.length < 3) {
    const fallbacks: DigestMoment[] = [
      {
        type: "celebration",
        emoji: "💬",
        text: "Every conversation counts — your family is building stronger bonds",
        priority: 5,
      },
      {
        type: "appreciation",
        emoji: "🏠",
        text: "Family Hub is here to help you stay close — check back next week for more moments!",
        priority: 5,
      },
    ];
    while (moments.length < 3) {
      moments.push(fallbacks[moments.length % fallbacks.length]);
    }
  }

  // --- Conversation starters ---
  const dormantRelation = snapshots.find((s) => s.score <= 35);
  const starterTarget = dormantRelation ?? snapshots[0];
  const starterDaysSince = Math.round(
    90 * (1 - (dormantRelation?.score ?? 50) / 100),
  );
  const starterOther = others.find(
    (m) => m.id === starterTarget?.memberB.id,
  );
  const starters = generateConversationStarters({
    relationshipType:
      (starterOther?.relationship as
        | "grandparent"
        | "parent"
        | "child"
        | "sibling"
        | "cousin"
        | "spouse"
        | "aunt_uncle"
        | "family") ?? "family",
    daysSinceLastContact: starterDaysSince,
    memberName: starterOther?.display_name ?? "them",
  });

  // --- IRL nudge ---
  const dormantScore = myScores.find((s) => s.score < 30);
  let irlNudge: DigestIRLNudge | null = null;
  if (dormantScore) {
    const otherId =
      dormantScore.fromMemberId === memberId
        ? dormantScore.toMemberId
        : dormantScore.fromMemberId;
    const other = others.find((m) => m.id === otherId);
    if (other) {
      irlNudge = {
        memberName: other.display_name,
        relationship: other.relationship,
        activitySuggestion: pickIRLSuggestion(other.display_name),
        score: dormantScore.score,
      };
    }
  }

  const content: DigestContent = {
    weekLabel: week.label,
    weekStart: week.start,
    weekEnd: week.end,
    memberName,
    connectionSnapshot: snapshots.slice(0, 3),
    momentsToMention: moments.slice(0, 5),
    conversationStarters: starters,
    irlNudge,
    generatedAt: new Date().toISOString(),
  };

  return {
    id: `digest-${memberId}-${Date.now()}`,
    group_id: groupId,
    member_id: memberId,
    content: content as unknown as Record<string, unknown>,
    sent_at: null,
    opened_at: null,
  };
}

/**
 * Generate digests for all members in a group.
 * Returns an array of Digest objects, one per member.
 */
export function generateAllDigests(
  groupId: string,
  interactions: Interaction[],
  members: FamilyMember[],
): Digest[] {
  return members.map((member) =>
    generateDigest(groupId, member.id, interactions, members),
  );
}

/**
 * Retrieve the most recent digest for a member from an array of digests.
 * (In production, this would query the DB; the engine provides the filtering.)
 */
export function getLatestDigest(
  digests: Digest[],
  memberId: string,
  _groupId: string,
): Digest | null {
  const memberDigests = digests.filter(
    (d) => d.member_id === memberId && d.group_id === _groupId,
  );
  if (memberDigests.length === 0) return null;

  // Sort by generatedAt inside content, newest first
  memberDigests.sort((a, b) => {
    const aTime = (a.content as Record<string, unknown>).generatedAt as string;
    const bTime = (b.content as Record<string, unknown>).generatedAt as string;
    if (!aTime) return 1;
    if (!bTime) return -1;
    return new Date(bTime).getTime() - new Date(aTime).getTime();
  });

  return memberDigests[0];
}

// ---------------------------------------------------------------------------
// Exports for use by API layer
// ---------------------------------------------------------------------------

export { MOCK_MEMBERS, buildMockDigestContent, getWeekRange };
