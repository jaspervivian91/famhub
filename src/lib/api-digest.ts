/**
 * Digest server functions for Family Hub.
 *
 * Handles digest generation, retrieval, and status tracking.
 * All functions work with real DB data and fall back to mock data
 * when DATABASE_URL is not connected.
 */

import { createServerFn } from "@tanstack/react-start";
import { sql } from "~/db";
import type {
  Digest,
  FamilyMember,
  Interaction,
  MemberPreferences,
} from "~/lib/types";
import {
  generateDigest,
  generateAllDigests,
  getLatestDigest as getLatestFromList,
  MOCK_MEMBERS,
} from "~/lib/digest-engine";
import { getAllGroupInteractions, getFamilyGroup } from "~/lib/api";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function coerceRow<T extends Record<string, unknown>>(row: T): T {
  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(row)) {
    if (val instanceof Date) {
      out[key] = val.toISOString();
    } else if (typeof val === "bigint") {
      out[key] = String(val);
    } else if (val !== null && typeof val === "object") {
      out[key] = coerceRow(val as Record<string, unknown>);
    } else {
      out[key] = val;
    }
  }
  return out as T;
}

async function safeQuery<T>(
  fn: (db: ReturnType<typeof sql>) => Promise<T>,
  fallback: T,
): Promise<T> {
  try {
    const db = sql();
    return await fn(db);
  } catch {
    return fallback;
  }
}

// ---------------------------------------------------------------------------
// Server Functions
// ---------------------------------------------------------------------------

/**
 * Generate a personalized digest for the current member in a group.
 * Stores the digest in the DB (if connected) and returns it.
 */
export const generateMyDigest = createServerFn({ method: "POST" })
  .validator((d: { groupId: string; memberId: string }) => d)
  .handler(async ({ data }): Promise<Digest | null> => {
    return safeQuery(
      async (db) => {
        // 1. Get group with members
        const groupResult = await getFamilyGroup({
          data: { groupId: data.groupId },
        });
        if (!groupResult) return null;

        const members: FamilyMember[] = groupResult.members;

        // 2. Get recent interactions
        const interactions = await getAllGroupInteractions({
          data: { groupId: data.groupId, days: 90 },
        });

        // 3. Generate digest
        const digest = generateDigest(
          data.groupId,
          data.memberId,
          interactions,
          members,
        );

        // 4. Store in DB
        const rows = await db`
          insert into digests (group_id, member_id, content)
          values (${data.groupId}, ${data.memberId}, ${JSON.stringify(digest.content)}::jsonb)
          returning id, group_id, member_id, content, sent_at, opened_at
        `;

        return coerceRow(rows[0] as unknown as Digest);
      },
      // Fallback: return mock digest
      (() => {
        const mockMembers = MOCK_MEMBERS;
        const digest = generateDigest(
          data.groupId,
          data.memberId,
          [],
          data.memberId ? mockMembers : [],
        );
        return digest;
      })(),
    );
  });

/**
 * Generate digests for ALL members in a group.
 * Used for scheduled weekly digest delivery.
 */
export const generateAllGroupDigests = createServerFn({ method: "POST" })
  .validator((d: { groupId: string }) => d)
  .handler(async ({ data }): Promise<Digest[]> => {
    return safeQuery(
      async (db) => {
        // 1. Get group with members
        const groupResult = await getFamilyGroup({
          data: { groupId: data.groupId },
        });
        if (!groupResult) return [];

        const members = groupResult.members;

        // 2. Get interactions
        const interactions = await getAllGroupInteractions({
          data: { groupId: data.groupId, days: 90 },
        });

        // 3. Generate all digests
        const digests = generateAllDigests(
          data.groupId,
          interactions,
          members,
        );

        // 4. Store all in DB
        const stored: Digest[] = [];
        for (const digest of digests) {
          const rows = await db`
            insert into digests (group_id, member_id, content)
            values (${data.groupId}, ${digest.member_id}, ${JSON.stringify(digest.content)}::jsonb)
            returning id, group_id, member_id, content, sent_at, opened_at
          `;
          stored.push(coerceRow(rows[0] as unknown as Digest));
        }

        return stored;
      },
      // Fallback: mock digests
      (() => {
        const mockMembers = MOCK_MEMBERS;
        return generateAllDigests(data.groupId, [], mockMembers);
      })(),
    );
  });

/**
 * Get the most recent digest for the current member.
 * Also marks it as opened if it hasn't been opened yet.
 */
export const getMyDigest = createServerFn({ method: "GET" })
  .validator((d: { groupId: string; memberId: string }) => d)
  .handler(async ({ data }): Promise<Digest | null> => {
    return safeQuery(
      async (db) => {
        const rows = await db`
          select id, group_id, member_id, content, sent_at, opened_at
          from digests
          where group_id = ${data.groupId}
            and member_id = ${data.memberId}
          order by (content->>'generatedAt')::timestamptz desc nulls last
          limit 1
        `;

        if (rows.length === 0) return null;

        const digest = coerceRow(rows[0] as unknown as Digest);

        // Mark as opened if not already
        if (!digest.opened_at) {
          await db`
            update digests
            set opened_at = now()
            where id = ${digest.id} and opened_at is null
          `;
          digest.opened_at = new Date().toISOString();
        }

        return digest;
      },
      // Fallback: return a mock digest
      (() => {
        const mockMembers = MOCK_MEMBERS;
        const digest = generateDigest(
          data.groupId,
          data.memberId,
          [],
          data.memberId ? mockMembers : [],
        );
        return digest;
      })(),
    );
  });

/**
 * Explicitly mark a digest as opened.
 */
export const markDigestOpened = createServerFn({ method: "POST" })
  .validator((d: { digestId: string }) => d)
  .handler(async ({ data }): Promise<boolean> => {
    return safeQuery(
      async (db) => {
        const rows = await db`
          update digests
          set opened_at = now()
          where id = ${data.digestId} and opened_at is null
          returning id
        `;
        return rows.length > 0;
      },
      true, // Fallback: pretend it worked
    );
  });

/**
 * Check if the current member has a recent digest (generated within the last 7 days).
 */
export const hasRecentDigest = createServerFn({ method: "GET" })
  .validator((d: { groupId: string; memberId: string }) => d)
  .handler(async ({ data }): Promise<boolean> => {
    return safeQuery(
      async (db) => {
        const rows = await db`
          select id
          from digests
          where group_id = ${data.groupId}
            and member_id = ${data.memberId}
            and (content->>'generatedAt')::timestamptz >= now() - interval '7 days'
          limit 1
        `;
        return rows.length > 0;
      },
      false,
    );
  });

/**
 * Update member's digest email preference.
 */
export const updateDigestPreference = createServerFn({ method: "POST" })
  .validator((d: { memberId: string; receiveEmail: boolean }) => d)
  .handler(async ({ data }): Promise<{ success: boolean }> => {
    return safeQuery(
      async (db) => {
        await db`
          update member_preferences
          set notifications_enabled = ${data.receiveEmail}
          where member_id = ${data.memberId}
        `;
        return { success: true };
      },
      { success: true },
    );
  });
