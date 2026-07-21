import { createServerFn } from "@tanstack/react-start";
import { sql, hasDatabaseURL } from "~/db";
import type {
  FamilyGroup,
  FamilyMember,
  GroupWithMembers,
  Interaction,
  Nudge,
  PairScore,
  ConversationStarter,
} from "~/lib/types";
import {
  computeAllPairScores,
  generateMockInteractions,
  categorizeScore,
} from "~/lib/relationship-engine";
import { generateConversationStarters } from "~/lib/conversation-starters";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Coerce a database row to safe JSON types (dates → strings). */
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

/** Wraps a DB query so the site builds even without DATABASE_URL. */
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
// Groups
// ---------------------------------------------------------------------------

export const createFamilyGroup = createServerFn({ method: "POST" })
  .validator((d: { name: string; accountId?: string }) => d)
  .handler(async ({ data }): Promise<FamilyGroup> => {
    if (!hasDatabaseURL()) {
      throw new Error(
        "Cannot create a family group — database is not connected. Set DATABASE_URL and run `bun run db:migrate` first.",
      );
    }
    const db = sql();
    const rows = await db`
      insert into family_groups (name) values (${data.name})
      returning id, name, created_at, plan, invite_code
    `;
    return coerceRow(rows[0] as unknown as FamilyGroup);
  });

export const joinFamilyGroup = createServerFn({ method: "POST" })
  .validator(
    (d: {
      inviteCode: string;
      displayName: string;
      relationship: string;
      timezone?: string;
      accountId?: string;
    }) => d,
  )
  .handler(
    async ({
      data,
    }): Promise<{ member: FamilyMember; group: FamilyGroup }> => {
      if (!hasDatabaseURL()) {
        throw new Error(
          "Cannot join a family group — database is not connected. Set DATABASE_URL and run `bun run db:migrate` first.",
        );
      }
      const db = sql();
      const groups = await db`
        select id, name, created_at, plan, invite_code
        from family_groups
        where invite_code = ${data.inviteCode}
        limit 1
      `;
      if (groups.length === 0) {
        throw new Error("Invalid invite code");
      }

      const group = coerceRow(groups[0] as unknown as FamilyGroup);

      const accountId = data.accountId ?? null;

      const members = await db`
        insert into family_members (group_id, display_name, relationship, timezone, account_id)
        values (${group.id}, ${data.displayName}, ${data.relationship}, ${data.timezone ?? "UTC"}, ${accountId})
        returning id, group_id, display_name, relationship, avatar_url, timezone, created_at, account_id
      `;
      const member = coerceRow(members[0] as unknown as FamilyMember);

      await db`
        insert into member_preferences (member_id)
        values (${member.id})
      `;

      return { member, group };
    },
  );

export const getFamilyGroup = createServerFn({ method: "GET" })
  .validator((d: { groupId: string }) => d)
  .handler(async ({ data }): Promise<GroupWithMembers | null> => {
    return safeQuery(async (db) => {
      const groups = await db`
        select id, name, created_at, plan, invite_code
        from family_groups
        where id = ${data.groupId}
        limit 1
      `;
      if (groups.length === 0) return null;

      const group = coerceRow(groups[0] as unknown as FamilyGroup);

      const members = await db`
        select m.id, m.group_id, m.display_name, m.relationship,
               m.avatar_url, m.timezone, m.created_at,
               p.id as pref_id, p.member_id as pref_member_id,
               p.ui_mode, p.notifications_enabled, p.digest_frequency
        from family_members m
        left join member_preferences p on p.member_id = m.id
        where m.group_id = ${group.id}
        order by m.created_at
      `;

      const memberList = members.map((m: Record<string, unknown>) => {
        const member = coerceRow({
          id: m.id,
          group_id: m.group_id,
          display_name: m.display_name,
          relationship: m.relationship,
          avatar_url: m.avatar_url,
          timezone: m.timezone,
          created_at: m.created_at,
        } as unknown as FamilyMember);

        if (m.pref_id) {
          member.preferences = coerceRow({
            id: m.pref_id,
            member_id: m.pref_member_id,
            ui_mode: m.ui_mode,
            notifications_enabled: m.notifications_enabled,
            digest_frequency: m.digest_frequency,
          });
        }

        return member;
      });

      return { ...group, members: memberList };
    }, null);
  });

export const getGroupByInviteCode = createServerFn({ method: "GET" })
  .validator((d: { inviteCode: string }) => d)
  .handler(async ({ data }): Promise<FamilyGroup | null> => {
    return safeQuery(async (db) => {
      const rows = await db`
        select id, name, created_at, plan, invite_code
        from family_groups
        where invite_code = ${data.inviteCode}
        limit 1
      `;
      if (rows.length === 0) return null;
      return coerceRow(rows[0] as unknown as FamilyGroup);
    }, null);
  });

export const getMemberById = createServerFn({ method: "GET" })
  .validator((d: { memberId: string }) => d)
  .handler(async ({ data }): Promise<FamilyMember | null> => {
    return safeQuery(async (db) => {
      const rows = await db`
        select m.*, p.id as pref_id, p.ui_mode, p.notifications_enabled, p.digest_frequency
        from family_members m
        left join member_preferences p on p.member_id = m.id
        where m.id = ${data.memberId}
        limit 1
      `;
      if (rows.length === 0) return null;

      const m = rows[0] as Record<string, unknown>;
      const member: FamilyMember = coerceRow({
        id: m.id,
        group_id: m.group_id,
        display_name: m.display_name,
        relationship: m.relationship,
        avatar_url: m.avatar_url,
        timezone: m.timezone,
        created_at: m.created_at,
      } as unknown as FamilyMember);

      if (m.pref_id) {
        member.preferences = coerceRow({
          id: m.pref_id,
          member_id: member.id,
          ui_mode: m.ui_mode ?? "standard",
          notifications_enabled: m.notifications_enabled ?? true,
          digest_frequency: m.digest_frequency ?? "weekly",
        });
      }
      return member;
    }, null);
  });

// ---------------------------------------------------------------------------
// Interactions
// ---------------------------------------------------------------------------

export const recordInteraction = createServerFn({ method: "POST" })
  .validator(
    (d: {
      fromMemberId: string;
      toMemberId?: string;
      groupId: string;
      interactionType: Interaction["interaction_type"];
      metadata?: Record<string, unknown>;
    }) => d,
  )
  .handler(async ({ data }): Promise<Interaction> => {
    if (!hasDatabaseURL()) {
      throw new Error(
        "Cannot record interaction — database is not connected. Set DATABASE_URL and run `bun run db:migrate` first.",
      );
    }
    const db = sql();
    const rows = await db`
      insert into interactions (from_member_id, to_member_id, group_id, interaction_type, metadata)
      values (
        ${data.fromMemberId},
        ${data.toMemberId ?? null},
        ${data.groupId},
        ${data.interactionType},
        ${JSON.stringify(data.metadata ?? {})}::jsonb
      )
      returning id, from_member_id, to_member_id, group_id, interaction_type, metadata, created_at
    `;
    return coerceRow(rows[0] as unknown as Interaction);
  });

export const getMemberInteractions = createServerFn({ method: "GET" })
  .validator(
    (d: { memberId: string; groupId: string; days?: number }) => d,
  )
  .handler(async ({ data }): Promise<Interaction[]> => {
    return safeQuery(async (db) => {
      const days = data.days ?? 90;
      const rows = await db`
        select id, from_member_id, to_member_id, group_id,
               interaction_type, metadata, created_at
        from interactions
        where group_id = ${data.groupId}
          and created_at >= now() - make_interval(days => ${days})
          and (
            from_member_id = ${data.memberId}
            or to_member_id = ${data.memberId}
          )
        order by created_at desc
        limit 200
      `;
      return rows.map(
        (r: unknown) => coerceRow(r as unknown as Interaction),
      );
    }, []);
  });

export const getAllGroupInteractions = createServerFn({ method: "GET" })
  .validator((d: { groupId: string; days?: number }) => d)
  .handler(async ({ data }): Promise<Interaction[]> => {
    return safeQuery(async (db) => {
      const days = data.days ?? 90;
      const rows = await db`
        select id, from_member_id, to_member_id, group_id,
               interaction_type, metadata, created_at
        from interactions
        where group_id = ${data.groupId}
          and created_at >= now() - make_interval(days => ${days})
        order by created_at desc
        limit 500
      `;
      return rows.map(
        (r: unknown) => coerceRow(r as unknown as Interaction),
      );
    }, []);
  });

// ---------------------------------------------------------------------------
// Relationship scoring
// ---------------------------------------------------------------------------

export const getPairScores = createServerFn({ method: "GET" })
  .validator((d: { groupId: string }) => d)
  .handler(async ({ data }): Promise<PairScore[]> => {
    return safeQuery(
      async (db) => {
        // Get members
        const memberRows = await db`
          select id from family_members
          where group_id = ${data.groupId}
        `;
        const memberIds = (memberRows as Array<{ id: string }>).map(
          (r) => r.id,
        );
        if (memberIds.length < 2) return [];

        // Get interactions
        const ixRows = await db`
          select from_member_id, to_member_id, created_at
          from interactions
          where group_id = ${data.groupId}
            and created_at >= now() - make_interval(days => 90)
          order by created_at desc
          limit 500
        `;
        const interactions = ixRows.map(
          (r) =>
            ({
              from_member_id: String(r.from_member_id),
              to_member_id: r.to_member_id ? String(r.to_member_id) : null,
              created_at: r.created_at instanceof Date
                ? r.created_at.toISOString()
                : String(r.created_at),
            }) as { from_member_id: string; to_member_id: string | null; created_at: string },
        );

        return computeAllPairScores(memberIds, interactions);
      },
      // Fallback: return mock data so the UI always works
      (() => {
        // Generate deterministic mock member IDs
        const mockMemberIds = ["mock-a", "mock-b", "mock-c", "mock-d"];
        const mockInteractions = generateMockInteractions(mockMemberIds);
        return computeAllPairScores(mockMemberIds, mockInteractions);
      })(),
    );
  });

// ---------------------------------------------------------------------------
// Nudges (enhanced multi-type)
// ---------------------------------------------------------------------------

/**
 * Message templates for each nudge type.
 */
function buildNudgeMessage(
  nudgeType: Nudge["nudge_type"],
  fromName: string,
  toName: string,
  daysSince: number | null,
  relationshipType: string,
): string {
  const rel = relationshipType === "grandparent" ? "grandparent" : "family";

  switch (nudgeType) {
    case "dormancy": {
      const time =
        daysSince === null
          ? "You haven't connected yet"
          : daysSince > 60
            ? `It's been over ${daysSince} days`
            : `It's been ${daysSince} days`;
      return `${time} since you connected with ${toName}. Send a quick hello! 👋`;
    }

    case "cooling": {
      return `${toName} might appreciate hearing from you this week — your connection has been quiet lately. 💛`;
    }

    case "celebration": {
      const prompts = [
        `You and ${toName} have been chatting more lately! Keep the momentum going 🎉`,
        `Your connection with ${toName} is stronger than ever — celebrate with a quick message! 🥳`,
        `It's a great time to reach out to ${toName} — your relationship has been growing! 🌱`,
      ];
      return prompts[Math.floor(Math.random() * prompts.length)];
    }

    case "conversation_starter": {
      if (rel === "grandparent") {
        return `It's been a while — ${toName} would love to hear from you. Try asking about a favorite memory! 💭`;
      }
      return `Reconnect with ${toName} — share a photo or ask what they've been up to lately! 💬`;
    }

    default:
      return `Time to check in with ${toName}! 💌`;
  }
}

export const generateNudge = createServerFn({ method: "POST" })
  .validator((d: { groupId: string }) => d)
  .handler(async ({ data }): Promise<Nudge | null> => {
    return safeQuery(
      async (db) => {
        // 1. Get all members
        const memberRows = await db`
          select id, display_name, relationship
          from family_members
          where group_id = ${data.groupId}
          order by created_at
        `;
        const members = memberRows as Array<{
          id: string;
          display_name: string;
          relationship: string;
        }>;
        if (members.length < 2) return null;

        // 2. Get interactions for scoring
        const ixRows = await db`
          select from_member_id, to_member_id, created_at
          from interactions
          where group_id = ${data.groupId}
            and created_at >= now() - make_interval(days => 90)
          order by created_at desc
          limit 500
        `;
        const interactions = ixRows.map((r) => ({
          from_member_id: String(r.from_member_id),
          to_member_id: r.to_member_id ? String(r.to_member_id) : null,
          created_at:
            r.created_at instanceof Date
              ? r.created_at.toISOString()
              : String(r.created_at),
        }));

        // 3. Score all pairs
        const memberIds = members.map((m) => m.id);
        const scores = computeAllPairScores(memberIds, interactions);

        // 4. Find the best candidate pair for a nudge
        //    Priority: dormant > cooling > celebration > conversation_starter
        //    Within each category, pick the lowest score
        let bestScore: (typeof scores)[0] | null = null;
        let bestNudgeType: Nudge["nudge_type"] = "dormancy";
        const targetTypes: Nudge["nudge_type"][] = [
          "dormancy",
          "cooling",
          "celebration",
          "conversation_starter",
        ];

        for (const nudgeType of targetTypes) {
          const candidates = scores
            .filter((s) => shouldNudge(s, nudgeType))
            .sort((a, b) => a.score - b.score);

          if (candidates.length > 0) {
            bestScore = candidates[0];
            bestNudgeType = nudgeType;
            break;
          }
        }

        if (!bestScore) return null;

        // 5. Get member details for the pair
        const fromMember = members.find(
          (m) => m.id === bestScore!.fromMemberId,
        );
        const toMember = members.find(
          (m) => m.id === bestScore!.toMemberId,
        );
        if (!fromMember || !toMember) return null;

        const fromId = fromMember.id;
        const toId = toMember.id;
        const fromName = fromMember.display_name;
        const toName = toMember.display_name;
        const relationship = toMember.relationship;

        // 6. Check existing pending nudges for this pair
        const existingNudge = await db`
          select id from nudges
          where group_id = ${data.groupId}
            and (
              (from_member_id = ${fromId} and to_member_id = ${toId})
              or (from_member_id = ${toId} and to_member_id = ${fromId})
            )
            and status = 'pending'
          limit 1
        `;
        if (existingNudge.length > 0) return null;

        // 7. Compute days since last contact
        const daysSince =
          bestScore.factors.recency === 0
            ? null
            : Math.round(90 * (1 - bestScore.factors.recency / 100));

        // 8. Build message
        const messageText = buildNudgeMessage(
          bestNudgeType,
          fromName,
          toName,
          daysSince,
          relationship,
        );

        // 9. Insert nudge
        const rows = await db`
          insert into nudges (group_id, from_member_id, to_member_id, nudge_type, message_text)
          values (${data.groupId}, ${fromId}, ${toId}, ${bestNudgeType}, ${messageText})
          returning id, group_id, from_member_id, to_member_id,
                    nudge_type, message_text, status, created_at, acknowledged_at
        `;

        return coerceRow(rows[0] as unknown as Nudge);
      },

      // Fallback: return a mock nudge so the UI works without a DB
      {
        id: `mock-nudge-${Date.now()}`,
        group_id: data.groupId,
        from_member_id: "mock-a",
        to_member_id: "mock-b",
        nudge_type: "dormancy",
        message_text:
          "It's been a while since you connected with Grandma Sue. Send a quick hello! 👋",
        status: "pending",
        created_at: new Date().toISOString(),
        acknowledged_at: null,
      } as Nudge,
    );
  });

/**
 * Determine if a pair score warrants a specific nudge type.
 */
function shouldNudge(
  score: { score: number; category: string; factors: { trend: number } },
  nudgeType: Nudge["nudge_type"],
): boolean {
  switch (nudgeType) {
    case "dormancy":
      return score.score <= 30;
    case "cooling":
      return (
        score.score > 30 &&
        score.score <= 50 &&
        score.factors.trend < 50 // declining trend
      );
    case "celebration":
      return (
        score.score > 30 &&
        score.factors.trend >= 70 // improving significantly
      );
    case "conversation_starter":
      return score.score > 30 && score.score <= 50;
    default:
      return false;
  }
}

export const acknowledgeNudge = createServerFn({ method: "POST" })
  .validator((d: { nudgeId: string }) => d)
  .handler(async ({ data }): Promise<Nudge | null> => {
    if (!hasDatabaseURL()) {
      throw new Error(
        "Cannot acknowledge nudge — database is not connected. Set DATABASE_URL and run `bun run db:migrate` first.",
      );
    }
    const db = sql();
    const rows = await db`
      update nudges
      set status = 'acknowledged', acknowledged_at = now()
      where id = ${data.nudgeId} and status = 'pending'
      returning id, group_id, from_member_id, to_member_id,
                nudge_type, message_text, status, created_at, acknowledged_at
    `;
    if (rows.length === 0) return null;
    return coerceRow(rows[0] as unknown as Nudge);
  });

export const getPendingNudges = createServerFn({ method: "GET" })
  .validator((d: { memberId: string }) => d)
  .handler(async ({ data }): Promise<Nudge[]> => {
    return safeQuery(async (db) => {
      const rows = await db`
        select n.id, n.group_id, n.from_member_id, n.to_member_id,
               n.nudge_type, n.message_text, n.status, n.created_at, n.acknowledged_at,
               fm.display_name as from_name,
               tm.display_name as to_name
        from nudges n
        join family_members fm on fm.id = n.from_member_id
        join family_members tm on tm.id = n.to_member_id
        where n.to_member_id = ${data.memberId}
          and n.status = 'pending'
        order by n.created_at desc
        limit 20
      `;
      return rows.map((r: Record<string, unknown>) => {
        const nudge = coerceRow(
          r as unknown as Nudge & { from_name: string; to_name: string },
        );
        return nudge;
      });
    }, []);
  });

// ---------------------------------------------------------------------------
// Conversation starters (server function)
// ---------------------------------------------------------------------------

export const getConversationStarters = createServerFn({ method: "POST" })
  .validator(
    (d: {
      relationshipType: string;
      daysSinceLastContact: number | null;
      memberName: string;
    }) => d,
  )
  .handler(async ({ data }): Promise<ConversationStarter[]> => {
    // Map relationship string to allowed types
    const validRelationships = [
      "grandparent",
      "parent",
      "child",
      "sibling",
      "cousin",
      "spouse",
      "aunt_uncle",
      "family",
    ] as const;
    type ValidRel = (typeof validRelationships)[number];

    let relType: ValidRel = "family";
    if (
      validRelationships.includes(data.relationshipType as ValidRel)
    ) {
      relType = data.relationshipType as ValidRel;
    }

    return generateConversationStarters({
      relationshipType: relType,
      daysSinceLastContact: data.daysSinceLastContact,
      memberName: data.memberName,
    });
  });

// ---------------------------------------------------------------------------
// Relationship snapshot (for the group page)
// ---------------------------------------------------------------------------

export const getRelationshipSnapshot = createServerFn({ method: "GET" })
  .validator((d: { groupId: string }) => d)
  .handler(
    async ({
      data,
    }): Promise<
      Array<{
        pair: [string, string];
        names: [string, string];
        lastInteraction: string | null;
        daysSince: number | null;
      }>
    > => {
      return safeQuery(async (db) => {
        const members = await db`
          select id, display_name from family_members
          where group_id = ${data.groupId}
          order by display_name
        `;
        const memberMap = new Map<string, string>();
        for (const m of members as Array<Record<string, string>>) {
          memberMap.set(m.id, m.display_name);
        }
        const memberIds = [...memberMap.keys()];

        const lastInts = await db`
          select
            case when from_member_id < coalesce(to_member_id, from_member_id)
                 then from_member_id else coalesce(to_member_id, from_member_id) end as m1,
            case when from_member_id < coalesce(to_member_id, from_member_id)
                 then coalesce(to_member_id, from_member_id) else from_member_id end as m2,
            max(created_at) as last_at
          from interactions
          where group_id = ${data.groupId}
          group by 1, 2
        `;

        const lastMap = new Map<string, { last_at: string }>();
        for (const li of lastInts as Array<Record<string, string>>) {
          lastMap.set(`${li.m1}::${li.m2}`, { last_at: li.last_at });
        }

        const results: Array<{
          pair: [string, string];
          names: [string, string];
          lastInteraction: string | null;
          daysSince: number | null;
        }> = [];

        for (let i = 0; i < memberIds.length; i++) {
          for (let j = i + 1; j < memberIds.length; j++) {
            const key = `${memberIds[i]}::${memberIds[j]}`;
            const altKey = `${memberIds[j]}::${memberIds[i]}`;
            const found = lastMap.get(key) ?? lastMap.get(altKey);

            let daysSince: number | null = null;
            if (found?.last_at) {
              daysSince = Math.floor(
                (Date.now() - new Date(found.last_at).getTime()) /
                  (1000 * 60 * 60 * 24),
              );
            }

            results.push({
              pair: [memberIds[i], memberIds[j]],
              names: [
                memberMap.get(memberIds[i]) ?? "Unknown",
                memberMap.get(memberIds[j]) ?? "Unknown",
              ],
              lastInteraction: found?.last_at
                ? new Date(found.last_at).toISOString()
                : null,
              daysSince,
            });
          }
        }

        return results;
      }, []);
    },
  );
