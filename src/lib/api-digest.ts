/**
 * Digest server functions for Family Core.
 *
 * Honesty rules for this module (the weekly letter is a personal note; it must
 * only ever contain things that really happened):
 *
 *  - The letter is written from the group's real members and real recorded
 *    interactions. If there is nothing real to write about (no group, no
 *    interactions yet), the read returns an honest "empty" status and the
 *    screen shows an empty state — it never substitutes an invented family.
 *  - A failed lookup returns "error", which the screen shows as a calm retry.
 *  - The demo letter exists only behind the explicit `?demo=1` opt-in and the
 *    deployment switch FAMILY_CORE_DEMO_MODE (see src/lib/demo-data.ts).
 *
 * METADATA ONLY. Digests are built from interaction type, direction and
 * timestamps. Nothing here reads the content of what anyone said.
 */

import { createServerFn } from "@tanstack/react-start";
import { sql } from "~/db";
import type { Digest, FamilyMember } from "~/lib/types";
import {
  generateDigest,
  generateAllDigests,
  buildDemoDigestContent,
} from "~/lib/digest-engine";
import { DEMO_DIGEST_MEMBERS, isDemoMode } from "~/lib/demo-data";
import {
  getFamilyGroup,
  getFamilyGroupStrict,
  getAllGroupInteractions,
  getAllGroupInteractionsStrict,
} from "~/lib/api";
import { sendDigestEmail } from "~/lib/email";
// Shape-preserving row coercion (keeps jsonb arrays as arrays).
import { coerceRow } from "~/lib/coerce-row";

type Db = ReturnType<typeof sql>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function safeQuery<T>(
  fn: (db: Db) => Promise<T>,
  fallback: T,
): Promise<T> {
  try {
    const db = sql();
    return await fn(db);
  } catch {
    return fallback;
  }
}

/** The member's most recent letter, marking it opened. Throws on DB failure. */
async function loadLatestDigest(
  db: Db,
  groupId: string,
  memberId: string,
): Promise<Digest | null> {
  const rows = await db`
    select id, group_id, member_id, content, sent_at, opened_at
    from digests
    where group_id = ${groupId}
      and member_id = ${memberId}
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
}

/** The sample letter. Only ever reached through the explicit demo opt-in. */
function buildDemoLetter(memberId?: string): Digest {
  const id = memberId ?? DEMO_DIGEST_MEMBERS[0].id;
  const content = buildDemoDigestContent(id, []);
  return {
    id: `digest-demo-${Date.now()}`,
    group_id: "demo-group",
    member_id: id,
    content: content as unknown as Record<string, unknown>,
    sent_at: null,
    opened_at: null,
  };
}

// ---------------------------------------------------------------------------
// What the /digest screen reads
// ---------------------------------------------------------------------------

export type DigestScreen =
  | { status: "ok"; digest: Digest; memberName: string }
  | { status: "empty"; memberName: string }
  | { status: "no-family" }
  | { status: "error" }
  | { status: "demo"; digest: Digest };

/**
 * Everything /digest needs, in one honest read:
 *
 *   write: false → the letter we already have, or "empty" if there isn't one
 *   write: true  → write this week's letter from the group's real interactions
 *
 * "empty" means this family genuinely has nothing to gather yet. "error" means
 * the lookup failed. Neither is ever replaced with an invented letter.
 */
export const getDigestScreen = createServerFn({ method: "POST" })
  .validator(
    (d: {
      groupId?: string;
      memberId?: string;
      demo?: boolean;
      write?: boolean;
    }) => d,
  )
  .handler(async ({ data }): Promise<DigestScreen> => {
    if (isDemoMode(data.demo)) {
      return { status: "demo", digest: buildDemoLetter(data.memberId) };
    }

    if (!data.groupId || !data.memberId) return { status: "no-family" };

    try {
      const db = sql();

      // Is this really this person's family?
      const group = await getFamilyGroupStrict({
        data: { groupId: data.groupId },
      });
      if (!group) return { status: "no-family" };
      const member = group.members.find((m) => m.id === data.memberId);
      if (!member) return { status: "no-family" };

      if (!data.write) {
        const existing = await loadLatestDigest(db, data.groupId, data.memberId);
        if (existing) {
          return { status: "ok", digest: existing, memberName: member.display_name };
        }
        return { status: "empty", memberName: member.display_name };
      }

      const interactions = await getAllGroupInteractionsStrict({
        data: { groupId: data.groupId, days: 90 },
      });

      const digest = generateDigest(
        data.groupId,
        data.memberId,
        interactions,
        group.members,
      );
      // Nothing real to write about yet — say so rather than invent a week.
      if (!digest) return { status: "empty", memberName: member.display_name };

      const rows = await db`
        insert into digests (group_id, member_id, content)
        values (${data.groupId}, ${data.memberId}, ${JSON.stringify(digest.content)}::jsonb)
        returning id, group_id, member_id, content, sent_at, opened_at
      `;

      return {
        status: "ok",
        digest: coerceRow(rows[0] as unknown as Digest),
        memberName: member.display_name,
      };
    } catch {
      // A failed lookup is a failure the user can retry — never a letter.
      return { status: "error" };
    }
  });

// ---------------------------------------------------------------------------
// Server Functions
// ---------------------------------------------------------------------------

/**
 * Generate a personalized digest for the current member in a group.
 * Stores the digest in the DB and returns it, or null when there is nothing
 * real to write about (no group, unknown member, no interactions yet).
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

        // 3. Generate digest — null when there is nothing real to say
        const digest = generateDigest(
          data.groupId,
          data.memberId,
          interactions,
          members,
        );
        if (!digest) return null;

        // 4. Store in DB
        const rows = await db`
          insert into digests (group_id, member_id, content)
          values (${data.groupId}, ${data.memberId}, ${JSON.stringify(digest.content)}::jsonb)
          returning id, group_id, member_id, content, sent_at, opened_at
        `;

        return coerceRow(rows[0] as unknown as Digest);
      },
      // Database unavailable: no letter. Never a sample one.
      null,
    );
  });

/**
 * Generate digests for ALL members in a group.
 * Used for scheduled weekly digest delivery. Returns [] when the group has no
 * data to write about — never invented content.
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

        // 3. Generate all digests (only for members with real data)
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
      // Database unavailable: nothing to send. Never a sample letter.
      [],
    );
  });

/**
 * Get the most recent digest for the current member.
 * Returns null when there isn't one yet, or when the database is unreachable —
 * the screen shows an empty state either way, never fabricated content.
 */
export const getMyDigest = createServerFn({ method: "GET" })
  .validator((d: { groupId: string; memberId: string }) => d)
  .handler(async ({ data }): Promise<Digest | null> => {
    return safeQuery(
      (db) => loadLatestDigest(db, data.groupId, data.memberId),
      null,
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
      true, // Fallback: the letter is already on screen; nothing to undo
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

/**
 * Email the current member's most recent digest to them.
 */
export const sendDigestByEmail = createServerFn({ method: "POST" })
  .validator((d: { groupId: string; memberId: string }) => d)
  .handler(async ({ data }): Promise<{ success: boolean; error?: string }> => {
    return safeQuery(
      async (db) => {
        // 1. Get the member and their account
        const memberRows = await db`
          select id, display_name, account_id
          from family_members
          where id = ${data.memberId}
          limit 1
        `;
        if (memberRows.length === 0) {
          return { success: false, error: "Member not found" };
        }

        const member = memberRows[0] as {
          id: string;
          display_name: string;
          account_id: string | null;
        };

        if (!member.account_id) {
          return { success: false, error: "No account linked to this member" };
        }

        const accountRows = await db`
          select id, email, display_name
          from accounts
          where id = ${member.account_id}
          limit 1
        `;
        if (accountRows.length === 0) {
          return { success: false, error: "Account not found" };
        }

        const account = accountRows[0] as {
          id: string;
          email: string;
          display_name: string;
        };

        // 2. Get the most recent digest for this member
        const digestRows = await db`
          select id, group_id, member_id, content, sent_at, opened_at
          from digests
          where group_id = ${data.groupId}
            and member_id = ${data.memberId}
          order by (content->>'generatedAt')::timestamptz desc nulls last
          limit 1
        `;
        if (digestRows.length === 0) {
          return { success: false, error: "No digest found. Generate one first." };
        }

        const digest = coerceRow(digestRows[0] as unknown as Digest);

        // 3. Send the email
        const result = await sendDigestEmail(
          digest,
          account.email,
          account.display_name || member.display_name,
        );

        // 4. Mark digest as sent
        if (result.success) {
          await db`
            update digests
            set sent_at = now()
            where id = ${digest.id} and sent_at is null
          `;
        }

        return result;
      },
      { success: false, error: "Database not available" },
    );
  });
