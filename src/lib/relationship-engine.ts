/**
 * Relationship Engine — Connection Health Scoring
 *
 * Computes a "connection health" score (0–100) for each member pair
 * based on metadata only (interaction frequency, recency, initiation
 * patterns). This module is pure logic and works with any array of
 * Interaction-like objects — it does NOT touch the database directly.
 */

import type {
  Interaction,
  PairScore,
  PairScoreFactors,
  ScoreCategory,
} from "~/lib/types";

// ---------------------------------------------------------------------------
// Weight configuration
// ---------------------------------------------------------------------------

const WEIGHTS = {
  recency: 0.4,
  frequency: 0.3,
  initiationBalance: 0.2,
  trend: 0.1,
} as const;

// ---------------------------------------------------------------------------
// Scoring helpers
// ---------------------------------------------------------------------------

interface InteractionLike {
  from_member_id: string;
  to_member_id: string | null;
  created_at: string;
}

/** Return days since a given ISO timestamp. */
function daysSince(iso: string): number {
  return Math.max(
    0,
    (Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24),
  );
}

/** Return true if the interaction involves both members of the pair. */
function involvesPair(
  ix: InteractionLike,
  a: string,
  b: string,
): boolean {
  return (
    (ix.from_member_id === a && ix.to_member_id === b) ||
    (ix.from_member_id === b && ix.to_member_id === a) ||
    // Group-scoped interactions where to_member_id is null — count for both
    // when they match the from member (e.g. a digest_opened by one member).
    (ix.from_member_id === a && ix.to_member_id === null) ||
    (ix.from_member_id === b && ix.to_member_id === null)
  );
}

/**
 * Compute the recency sub-score (0–100).
 * 0 days → 100, 90+ days → 0, linear in between.
 */
function recencyScore(
  interactions: InteractionLike[],
  a: string,
  b: string,
): number {
  const pairInteractions = interactions.filter((ix) => involvesPair(ix, a, b));

  if (pairInteractions.length === 0) return 0;

  let mostRecent = 0;
  for (const ix of pairInteractions) {
    const d = daysSince(ix.created_at);
    if (mostRecent === 0 || d < mostRecent) mostRecent = d;
  }

  // Linear decay: 100 at day 0, 0 at day 90+
  return Math.max(0, Math.round(100 * (1 - Math.min(mostRecent, 90) / 90)));
}

/**
 * Compute the frequency sub-score (0–100).
 * Based on interactions per week over the last 90 days.
 * 5+ per week → 100, 0 → 0.
 */
function frequencyScore(
  interactions: InteractionLike[],
  a: string,
  b: string,
): number {
  const now = Date.now();
  const cutoff = now - 90 * 24 * 60 * 60 * 1000;

  const recentCount = interactions.filter(
    (ix) =>
      involvesPair(ix, a, b) && new Date(ix.created_at).getTime() >= cutoff,
  ).length;

  const weeksSpan = 90 / 7;
  const perWeek = recentCount / weeksSpan;

  // 5+ per week is "thriving", capped at 100
  return Math.min(100, Math.round((perWeek / 5) * 100));
}

/**
 * Compute initiation balance (0–100).
 * 50/50 split → 100, one-sided → 0.
 */
function initiationBalanceScore(
  interactions: InteractionLike[],
  a: string,
  b: string,
): number {
  let aInitiated = 0;
  let bInitiated = 0;

  for (const ix of interactions) {
    if (ix.from_member_id === a && ix.to_member_id === b) aInitiated++;
    else if (ix.from_member_id === b && ix.to_member_id === a) bInitiated++;
  }

  const total = aInitiated + bInitiated;
  if (total === 0) return 50; // neutral — no data

  const ratio = aInitiated / total;
  // Perfect balance (0.5) → 100, fully one-sided → 0
  return Math.round(100 * (1 - Math.abs(ratio - 0.5) * 2));
}

/**
 * Compute trend sub-score (0–100).
 * Compare last 30 days vs prior 30 days (days 30–60).
 * Improving → high score, declining → low score.
 */
function trendScore(
  interactions: InteractionLike[],
  a: string,
  b: string,
): number {
  const now = Date.now();
  const recentCutoff = now - 30 * 24 * 60 * 60 * 1000;
  const priorCutoff = now - 60 * 24 * 60 * 60 * 1000;

  const recent = interactions.filter(
    (ix) =>
      involvesPair(ix, a, b) &&
      new Date(ix.created_at).getTime() >= recentCutoff,
  ).length;

  const prior = interactions.filter(
    (ix) =>
      involvesPair(ix, a, b) &&
      new Date(ix.created_at).getTime() >= priorCutoff &&
      new Date(ix.created_at).getTime() < recentCutoff,
  ).length;

  if (prior === 0 && recent === 0) return 50; // no activity either period
  if (prior === 0 && recent > 0) return 75; // new activity — positive
  if (prior > 0 && recent === 0) return 25; // stopped — negative

  const change = (recent - prior) / prior;
  // Clamp to [-1, +1] and map to [0, 100]
  const clamped = Math.max(-1, Math.min(1, change));
  return Math.round(50 + clamped * 50);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Compute a connection health score for a specific pair of members.
 *
 * @param fromMemberId - ID of the first member
 * @param toMemberId   - ID of the second member
 * @param interactions - Flat array of all relevant interactions in the group
 *                       (at least 90 days of history recommended)
 * @returns PairScore with 0–100 score, category, and factor breakdowns.
 */
export function computePairScore(
  fromMemberId: string,
  toMemberId: string,
  interactions: InteractionLike[],
): PairScore {
  const recency = recencyScore(interactions, fromMemberId, toMemberId);
  const frequency = frequencyScore(interactions, fromMemberId, toMemberId);
  const initiationBalance = initiationBalanceScore(
    interactions,
    fromMemberId,
    toMemberId,
  );
  const trend = trendScore(interactions, fromMemberId, toMemberId);

  const score = Math.round(
    recency * WEIGHTS.recency +
      frequency * WEIGHTS.frequency +
      initiationBalance * WEIGHTS.initiationBalance +
      trend * WEIGHTS.trend,
  );

  const category = categorizeScore(score);

  return {
    score,
    category,
    factors: { recency, frequency, initiationBalance, trend },
    fromMemberId,
    toMemberId,
  };
}

/**
 * Compute scores for every pair in a group.
 * Returns a flat list of PairScores.
 */
export function computeAllPairScores(
  memberIds: string[],
  interactions: InteractionLike[],
): PairScore[] {
  const results: PairScore[] = [];
  for (let i = 0; i < memberIds.length; i++) {
    for (let j = i + 1; j < memberIds.length; j++) {
      results.push(computePairScore(memberIds[i], memberIds[j], interactions));
    }
  }
  return results;
}

/** Categorize a numeric score. */
export function categorizeScore(score: number): ScoreCategory {
  if (score <= 30) return "dormant";
  if (score <= 50) return "cooling";
  if (score <= 70) return "steady";
  return "thriving";
}

// ---------------------------------------------------------------------------
// Mock data for development / fallback
// ---------------------------------------------------------------------------

/**
 * Generates realistic mock interactions for testing the scoring engine
 * when DATABASE_URL is not connected.
 */
export function generateMockInteractions(
  memberIds: string[],
): InteractionLike[] {
  const now = Date.now();
  const interactions: InteractionLike[] = [];
  const types = [
    "message_sent",
    "reaction",
    "call_started",
    "nudge_sent",
    "nudge_acknowledged",
  ];

  for (let i = 0; i < memberIds.length; i++) {
    for (let j = i + 1; j < memberIds.length; j++) {
      // Each pair gets a different "rhythm"
      const pairSeed = (i * 7 + j * 13) % 5; // 0=thriving, 1=steady, 2=cooling, 3=dormant, 4=random
      const interactionCount = [40, 20, 8, 2, Math.floor(Math.random() * 30)][
        pairSeed
      ];

      for (let k = 0; k < interactionCount; k++) {
        // Spread interactions across the 90-day window
        const daysAgo =
          pairSeed < 2
            ? Math.random() * 20 // thriving/steady: mostly recent
            : pairSeed === 2
              ? 20 + Math.random() * 40 // cooling: middle
              : Math.random() * 90; // dormant: spread out

        interactions.push({
          from_member_id: memberIds[k % 2 === 0 ? i : j],
          to_member_id: memberIds[k % 2 === 0 ? j : i],
          created_at: new Date(
            now - daysAgo * 24 * 60 * 60 * 1000,
          ).toISOString(),
        });
      }
    }
  }

  return interactions;
}
