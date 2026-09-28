/**
 * Server functions for the relationship profile screen.
 *
 * Mirrors the loader pattern used by the group page (src/routes/group/$groupId):
 * a single createServerFn that gathers everything the screen needs in one hop,
 * with a safe fallback so the site still builds and serves without a database.
 *
 * METADATA ONLY. This module reads interaction type + timestamps (and app-set
 * labels such as a duration), never the content of what anyone said.
 */
import { createServerFn } from "@tanstack/react-start";
import { sql, hasDatabaseURL } from "~/db";
import { computePairScore } from "~/lib/relationship-engine";
import {
  buildMoments,
  lastContactDays,
  pairContacts,
  rhythmInsight,
  type ProfileMoment,
  type RhythmInsight,
} from "~/lib/relationship-profile";
import { sendNudgeEmail } from "~/lib/email";
import { getAccountById } from "~/lib/auth";
import type { FamilyMember, Interaction, Nudge, PairScore } from "~/lib/types";
// Shape-preserving row coercion (keeps jsonb arrays as arrays).
import { coerceRow } from "~/lib/coerce-row";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// coerceRow comes from ~/lib/coerce-row — the shared shape-preserving row
// coercion. It keeps jsonb arrays (e.g. a group's `members`) as arrays.

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RelationshipProfileMember extends FamilyMember {
  pronoun?: string | null;
}

export interface RelationshipProfileData {
  /** false when there is no database, or the group/member could not be found. */
  ok: boolean;
  group: {
    id: string;
    name: string;
    plan: "free" | "premium";
    invite_code: string;
  } | null;
  /** The person this profile is about. */
  member: RelationshipProfileMember | null;
  /** The signed-in member — null when unknown, or when viewing your own profile. */
  viewer: RelationshipProfileMember | null;
  /** True when you opened your own card rather than someone else's. */
  isSelf: boolean;
  /** Whose relationship the score describes (the viewer, or their closest link). */
  partner: RelationshipProfileMember | null;
  score: PairScore | null;
  lastTalkedDays: number | null;
  contactCount: number;
  rhythm: RhythmInsight | null;
  moments: ProfileMoment[];
  groupMemberCount: number;
}

const EMPTY_PROFILE: RelationshipProfileData = {
  ok: false,
  group: null,
  member: null,
  viewer: null,
  isSelf: false,
  partner: null,
  score: null,
  lastTalkedDays: null,
  contactCount: 0,
  rhythm: null,
  moments: [],
  groupMemberCount: 0,
};

// ---------------------------------------------------------------------------
// Loader
// ---------------------------------------------------------------------------

export const loadRelationshipProfile = createServerFn({ method: "GET" })
  .validator(
    (d: { groupId: string; memberId: string; viewerMemberId?: string }) => d,
  )
  .handler(async ({ data }): Promise<RelationshipProfileData> => {
    if (!hasDatabaseURL()) return EMPTY_PROFILE;

    try {
      const db = sql();

      const groupRows = await db`
        select id, name, plan, invite_code
        from family_groups
        where id = ${data.groupId}
        limit 1
      `;
      if (groupRows.length === 0) return EMPTY_PROFILE;
      const group = coerceRow(
        groupRows[0] as unknown as RelationshipProfileData["group"],
      ) as RelationshipProfileData["group"];

      const memberRows = await db`
        select m.id, m.group_id, m.display_name, m.relationship,
               m.avatar_url, m.timezone, m.created_at, m.account_id, m.pronoun
        from family_members m
        where m.group_id = ${data.groupId}
        order by m.created_at
      `;
      const members = memberRows.map((m: Record<string, unknown>) =>
        coerceRow({
          id: m.id,
          group_id: m.group_id,
          display_name: m.display_name,
          relationship: m.relationship,
          avatar_url: m.avatar_url,
          timezone: m.timezone,
          created_at: m.created_at,
          account_id: m.account_id,
          pronoun: m.pronoun ?? null,
        }) as unknown as RelationshipProfileMember,
      );

      const member = members.find((m) => m.id === data.memberId) ?? null;
      if (!member) return { ...EMPTY_PROFILE, group };

      const isSelf = !!data.viewerMemberId && data.viewerMemberId === data.memberId;

      let viewer =
        data.viewerMemberId && data.viewerMemberId !== data.memberId
          ? members.find((m) => m.id === data.viewerMemberId) ?? null
          : null;

      // Everyone else's link to this member, used to pick the partner when
      // there is no signed-in member to measure "us" against.
      const others = members.filter((m) => m.id !== member.id);

      // Group interactions (metadata only) power the connection-health score.
      const ixRows = await db`
        select from_member_id, to_member_id, created_at
        from interactions
        where group_id = ${data.groupId}
          and created_at >= now() - make_interval(days => 90)
        order by created_at desc
        limit 500
      `;
      const groupInteractions = ixRows.map((r) => ({
        from_member_id: String(r.from_member_id),
        to_member_id: r.to_member_id ? String(r.to_member_id) : null,
        created_at:
          r.created_at instanceof Date
            ? r.created_at.toISOString()
            : String(r.created_at),
      }));

      // Decide whose relationship we are describing.
      let partner: RelationshipProfileMember | null = viewer;
      if (!partner && others.length > 0) {
        partner = others
          .map((other) => ({
            other,
            score: computePairScore(
              other.id,
              member.id,
              groupInteractions,
            ).score,
          }))
          .sort((a, b) => b.score - a.score)[0].other;
      }
      if (!partner) {
        // A group of one: nothing to measure, nothing to show but the person.
        return {
          ...EMPTY_PROFILE,
          ok: true,
          group,
          member,
          viewer: null,
          isSelf,
          partner: null,
          groupMemberCount: members.length,
        };
      }

      const score = computePairScore(
        partner.id,
        member.id,
        groupInteractions,
      );

      // The pair's own history — every contact either way, newest first.
      const contactRows = await db`
        select id, from_member_id, to_member_id, group_id,
               interaction_type, metadata, created_at
        from interactions
        where group_id = ${data.groupId}
          and (
            (from_member_id = ${partner.id} and to_member_id = ${member.id})
            or (from_member_id = ${member.id} and to_member_id = ${partner.id})
          )
        order by created_at desc
        limit 60
      `;
      const interactions = contactRows.map(
        (r: unknown) => coerceRow(r as unknown as Interaction),
      );
      const contacts = pairContacts(interactions, partner.id, member.id);

      return {
        ok: true,
        group,
        member,
        viewer,
        isSelf,
        partner,
        score,
        lastTalkedDays: lastContactDays(contacts),
        contactCount: contacts.length,
        rhythm: rhythmInsight(contacts, member.pronoun),
        moments: buildMoments(contacts, 5),
        groupMemberCount: members.length,
      };
    } catch {
      return EMPTY_PROFILE;
    }
  });

// ---------------------------------------------------------------------------
// "Send a gentle hello" — one-tap nudge, same delivery path as the dashboard
// ---------------------------------------------------------------------------

export interface GentleHelloResult {
  ok: boolean;
  error?: string;
  /** true when the hello was also emailed to the member's account */
  emailed?: boolean;
  nudge?: Nudge;
}

/** The warm default note, used when the sender doesn't add their own words. */
export function gentleHelloMessage(
  fromName: string,
  toName: string,
  relationship: string,
): string {
  const first = toName.split(/\s+/).slice(-1)[0];
  if (relationship === "grandparent") {
    return `A gentle hello from ${fromName}. You're thought of today, ${first} — no rush at all.`;
  }
  return `A gentle hello from ${fromName}. You're thought of today — no rush at all.`;
}

export const sendGentleHello = createServerFn({ method: "POST" })
  .validator(
    (d: {
      groupId: string;
      fromMemberId: string;
      toMemberId: string;
      note?: string;
    }) => d,
  )
  .handler(async ({ data }): Promise<GentleHelloResult> => {
    if (!hasDatabaseURL()) {
      return {
        ok: false,
        error: "The family data store isn't connected yet, so this hello can't be sent.",
      };
    }
    if (data.fromMemberId === data.toMemberId) {
      return { ok: false, error: "A hello needs two people." };
    }

    try {
      const db = sql();
      const memberRows = await db`
        select id, display_name, relationship, account_id
        from family_members
        where group_id = ${data.groupId}
          and id in (${data.fromMemberId}, ${data.toMemberId})
      `;
      const people = memberRows.map((r: Record<string, unknown>) => ({
        id: String(r.id),
        display_name: String(r.display_name),
        relationship: String(r.relationship),
        account_id: r.account_id ? String(r.account_id) : null,
      }));
      const from = people.find((p) => p.id === data.fromMemberId);
      const to = people.find((p) => p.id === data.toMemberId);
      if (!from || !to) {
        return { ok: false, error: "We couldn't find that family member." };
      }

      const note = data.note?.trim();
      const messageText =
        note && note.length > 0
          ? note
          : gentleHelloMessage(
              from.display_name,
              to.display_name,
              to.relationship,
            );

      const rows = await db`
        insert into nudges (group_id, from_member_id, to_member_id, nudge_type, message_text)
        values (
          ${data.groupId},
          ${from.id},
          ${to.id},
          'conversation_starter',
          ${messageText}
        )
        returning id, group_id, from_member_id, to_member_id,
                  nudge_type, message_text, status, created_at, acknowledged_at
      `;
      const nudge = coerceRow(rows[0] as unknown as Nudge);

      // Same best-effort notification path the dashboard/group page uses.
      let emailed = false;
      if (to.account_id) {
        try {
          const account = await getAccountById(to.account_id);
          if (account?.email) {
            const result = await sendNudgeEmail(
              nudge,
              account.email,
              to.display_name,
            );
            emailed = result.success === true;
          }
        } catch {
          // Best effort — a failed email must never fail the hello itself.
        }
      }

      return { ok: true, nudge, emailed };
    } catch {
      return {
        ok: false,
        error: "Something went wrong sending that hello. Please try again.",
      };
    }
  });
