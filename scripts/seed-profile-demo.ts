/**
 * Demo seed for the relationship-profile screen.
 *
 * Gives one member pair (the signed-in member ↔ another member) a realistic
 * interaction history so the profile screen shows real rhythm/moment data
 * instead of empty states:
 *
 *   - a call 12 days ago (so "last talked · 12 days ago" is true)
 *   - the last 8 Sundays, so the most common day of contact is Sunday
 *   - a couple of app-set "moment" labels in interaction metadata
 *
 * METADATA ONLY. Nothing here is message content — rows carry an interaction
 * type, a timestamp and app-set labels (title / note / duration_minutes).
 * The app never reads or stores what anyone said.
 *
 * Run:  bun run scripts/seed-profile-demo.ts [groupId]
 * Idempotent: reruns delete their own previous rows first (metadata seed marker).
 */
import { neon } from "@neondatabase/serverless";

const SEED_MARKER = "profile-demo";

function db() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("❌ DATABASE_URL is not set.");
    process.exit(1);
  }
  return neon(url);
}

/** ISO timestamp for `daysAgo` days back, at the given UTC hour. */
function daysAgoAt(daysAgo: number, hour: number, minute: number): string {
  const d = new Date();
  d.setUTCHours(hour, minute, 0, 0);
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return d.toISOString();
}

/** The last Sunday on or before `daysAgo` days ago. */
function lastSunday(daysAgo: number): Date {
  const d = new Date();
  d.setUTCHours(11, 5, 0, 0);
  d.setUTCDate(d.getUTCDate() - daysAgo);
  while (d.getUTCDay() !== 0) d.setUTCDate(d.getUTCDate() - 1);
  return d;
}

async function main() {
  const sql = db();

  const groupArg = process.argv[2];
  const groups = groupArg
    ? await sql`select id, name from family_groups where id = ${groupArg}`
    : await sql`select id, name from family_groups where name ilike '%Warmtest%' limit 1`;

  if (groups.length === 0) {
    console.error("❌ No family group found. Pass a group id as the first argument.");
    process.exit(1);
  }

  const group = groups[0] as { id: string; name: string };
  const members = (await sql`
    select id, display_name, relationship, created_at
    from family_members
    where group_id = ${group.id}
    order by created_at
  `) as Array<{ id: string; display_name: string; relationship: string }>;

  if (members.length < 2) {
    console.error("❌ Need at least two members in the group.");
    process.exit(1);
  }

  // The viewer is the member who has an account (the one a human signs in as);
  // the profile subject is the first member without one (the grandparent).
  const accounts = (await sql`
    select m.id from family_members m
    where m.group_id = ${group.id} and m.account_id is not null
    order by m.created_at limit 1
  `) as Array<{ id: string }>;
  const viewer =
    accounts[0] ?? (await sql`select id from family_members where group_id = ${group.id} order by created_at limit 1`)[0];

  const subject =
    members.find((m) => m.id !== viewer.id && m.relationship === "grandparent") ??
    members.find((m) => m.id !== viewer.id)!;

  console.log(`▶ group   ${group.name} (${group.id})`);
  console.log(`▶ viewer  ${members.find((m) => m.id === viewer.id)?.display_name}`);
  console.log(`▶ subject ${subject.display_name}`);

  // ── 1. Clear this script's own previous rows (idempotent reruns) ────────
  const deleted = await sql`
    delete from interactions
    where group_id = ${group.id}
      and metadata->>'seed' = ${SEED_MARKER}
    returning id
  `;
  console.log(`✔ cleared ${deleted.length} previous demo interaction(s)`);

  // ── 2. The call 12 days ago — the "last talked · 12 days ago" row ───────
  const rows: Array<Record<string, unknown>> = [];
  rows.push({
    from: viewer.id,
    to: subject.id,
    type: "call_started",
    at: daysAgoAt(12, 10, 12),
    meta: {
      seed: SEED_MARKER,
      duration_minutes: 18,
      title: "The garden, together",
      note: "she taught you to plant roses the summer you moved back",
    },
  });

  // ── 3. The last eight Sundays — the "you talk most on Sundays" rhythm ───
  const sunday = lastSunday(13);
  const sundayPlan: Array<{ type: string; minutes?: number; title?: string }> = [
    { type: "call_started", minutes: 26, title: "A long Sunday catch-up" },
    { type: "message_sent" },
    { type: "message_sent" },
    { type: "reaction" },
    { type: "call_started", minutes: 12 },
    { type: "message_sent" },
    { type: "message_sent" },
    { type: "reaction" },
  ];

  sundayPlan.forEach((plan, i) => {
    const at = new Date(sunday);
    at.setUTCDate(at.getUTCDate() - i * 7);
    // Alternate who reaches out, so the initiation balance stays level.
    const fromViewer = i % 2 === 0;
    rows.push({
      from: fromViewer ? viewer.id : subject.id,
      to: fromViewer ? subject.id : viewer.id,
      type: plan.type,
      at: at.toISOString(),
      meta: {
        seed: SEED_MARKER,
        ...(plan.minutes ? { duration_minutes: plan.minutes } : {}),
        ...(plan.title ? { title: plan.title } : {}),
      },
    });
  });

  for (const row of rows) {
    await sql`
      insert into interactions (from_member_id, to_member_id, group_id, interaction_type, metadata, created_at)
      values (
        ${row.from as string},
        ${row.to as string},
        ${group.id},
        ${row.type as string},
        ${JSON.stringify(row.meta)}::jsonb,
        ${row.at as string}
      )
    `;
  }
  console.log(`✔ seeded ${rows.length} interaction(s) for ${subject.display_name}`);

  // ── 4. An optional pronoun for warm copy (only if unset) ────────────────
  if (subject.relationship === "grandparent") {
    const updated = await sql`
      update family_members
      set pronoun = 'she'
      where id = ${subject.id} and pronoun is null
      returning id
    `;
    if (updated.length > 0) {
      console.log(`✔ set ${subject.display_name}'s pronoun to "she" (was unset)`);
    }
  }

  console.log("\n✅ Profile demo seed complete.");
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
