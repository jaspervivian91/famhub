/**
 * Server reads for the grandparent screen.
 *
 * /grandparent is the screen we hand to an elderly parent, so it is held to the
 * strictest standard in the product. It returns exactly one of:
 *
 *   ok         — the family that really exists, read from the database
 *   no-family  — this person has no family group yet (truthful empty state)
 *   error      — the lookup itself failed (calm retry, never invented content)
 *   demo       — the sample family, only when explicitly opted in
 *
 * It never invents a household. Demo data lives in src/lib/demo-data.ts and is
 * reachable only through `?demo=1` plus the deployment switch
 * FAMILY_CORE_DEMO_MODE — never by simply having no group.
 *
 * METADATA ONLY: this reads names, relationships, times and nudge text that the
 * app generated. It never reads the content of anything a family said.
 */

import { createServerFn } from "@tanstack/react-start";
import type { FamilyMember, GroupWithMembers, Nudge } from "~/lib/types";
import { getFamilyGroupStrict, getPendingNudgesStrict } from "~/lib/api";
import {
  DEMO_GRANDPARENT_GROUP_NAME,
  DEMO_GRANDPARENT_NUDGES,
  DEMO_GRANDPARENT_OTHERS,
  DEMO_VIEWER,
  isDemoMode,
} from "~/lib/demo-data";

export type NudgeWithSender = Nudge & { from_name?: string };

export type GrandparentScreen =
  | {
      status: "ok";
      group: GroupWithMembers;
      member: FamilyMember;
      nudges: NudgeWithSender[];
    }
  | { status: "no-family" }
  | { status: "error" }
  | {
      status: "demo";
      groupName: string;
      memberName: string;
      members: FamilyMember[];
      nudges: NudgeWithSender[];
    };

export const getGrandparentScreen = createServerFn({ method: "GET" })
  .validator((d: { memberId?: string; groupId?: string; demo?: boolean }) => d)
  .handler(async ({ data }): Promise<GrandparentScreen> => {
    // Explicit opt-in only (see src/lib/demo-data.ts).
    if (isDemoMode(data.demo)) {
      return {
        status: "demo",
        groupName: DEMO_GRANDPARENT_GROUP_NAME,
        memberName: DEMO_VIEWER.name,
        members: DEMO_GRANDPARENT_OTHERS,
        nudges: DEMO_GRANDPARENT_NUDGES,
      };
    }

    // No identity at all: this person isn't part of a family yet. That is a
    // fact about their account, not a reason to draw them a pretend one.
    if (!data.memberId || !data.groupId) return { status: "no-family" };

    try {
      const group = await getFamilyGroupStrict({
        data: { groupId: data.groupId },
      });
      // Stored identity that no longer points at a real group (or a group this
      // member was removed from) — the dashboard offers create/join.
      if (!group) return { status: "no-family" };

      const member = group.members.find((m) => m.id === data.memberId);
      if (!member) return { status: "no-family" };

      const nudges = await getPendingNudgesStrict({
        data: { memberId: data.memberId },
      });

      return { status: "ok", group, member, nudges };
    } catch {
      // A failed lookup is a failure the user can retry — never a family.
      return { status: "error" };
    }
  });
