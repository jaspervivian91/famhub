/**
 * Invariant check for src/lib/coerce-row.ts.
 *
 * The digest defect: coerceRow rebuilt every object through Object.entries, so
 * a jsonb array came back as {"0":…,"1":…} with no `.length` — the letter's
 * `content.momentsToMention.length > 0` guards all read false and the sections
 * vanished. This script pins the shape-preserving behaviour so it cannot
 * regress silently.
 *
 * Run:  bun run check:coerce-row
 */
import { coerceRow } from "../src/lib/coerce-row";

let failures = 0;

function check(name: string, condition: boolean, detail?: unknown) {
  if (condition) {
    console.log(`  ok   ${name}`);
  } else {
    failures++;
    console.log(`  FAIL ${name}`, detail === undefined ? "" : detail);
  }
}

// A row shaped like the one `select ... from digests` really returns: `content`
// is jsonb, so its arrays arrive as arrays.
const digestRow = {
  id: "ee49fbd3-fb60-4282-af9f-5e154ee165f3",
  member_id: "4778cf75-2d2c-48e5-9a17-95aba8c8ed5a",
  content: {
    weekLabel: "Sep 28 – Oct 4",
    memberName: "Sarah",
    momentsToMention: [
      { type: "reconnection", text: "Sarah and Tom reconnected this week!", priority: 1 },
      { type: "appreciation", text: "Every conversation counts", priority: 2 },
      { type: "celebration", text: "Tom's birthday", priority: 3 },
    ],
    connectionSnapshot: [
      { memberA: { id: "a", name: "Sarah" }, memberB: { id: "b", name: "Tom" }, score: 68 },
      { memberA: { id: "a", name: "Sarah" }, memberB: { id: "c", name: "Alex" }, score: 40 },
      { memberA: { id: "a", name: "Sarah" }, memberB: { id: "d", name: "Grandma Sue" }, score: 61 },
    ],
    conversationStarters: [] as unknown[],
    irlNudge: null,
    generatedAt: new Date("2026-09-28T14:14:24.542Z"),
  },
  sent_at: null,
  opened_at: null,
};

const out = coerceRow(digestRow);

console.log("coerceRow invariants");

// 1. Arrays stay arrays, at the top level of a nested object.
check("content.momentsToMention is an Array", Array.isArray(out.content.momentsToMention));
check("content.momentsToMention.length === 3", out.content.momentsToMention.length === 3);
check("content.connectionSnapshot.length === 3", out.content.connectionSnapshot.length === 3);
check("content.conversationStarters is an Array", Array.isArray(out.content.conversationStarters));
check("empty array keeps length 0 (guard stays false)", out.content.conversationStarters.length === 0);

// 2. Nested arrays of objects keep item fields.
check(
  "content.momentsToMention[0].text survives",
  out.content.momentsToMention[0].text === "Sarah and Tom reconnected this week!",
);
check(
  "content.connectionSnapshot[0].memberB.name survives",
  out.content.connectionSnapshot[0].memberB.name === "Tom",
);

// 3. Dates become strings; scalars are untouched.
check("generatedAt coerced to ISO string", out.content.generatedAt === "2026-09-28T14:14:24.542Z");
check("null stays null", out.content.irlNudge === null && out.sent_at === null);
check("bigint becomes string", coerceRow({ n: 42n as unknown as number }).n === "42");

// 4. Top-level arrays are preserved too (members lists are built this way).
const withMembers = coerceRow({ id: "g", members: [{ id: "m1" }, { id: "m2" }] });
check("top-level members array keeps length 2", withMembers.members.length === 2);
check("top-level members array keeps item fields", withMembers.members[1].id === "m2");

// 5. The exact guard used by src/routes/digest.tsx.
const guards = {
  moments: out.content.momentsToMention.length > 0,
  snapshots: out.content.connectionSnapshot.length > 0,
  starters: out.content.conversationStarters.length > 0,
};
check("guard: moments render", guards.moments === true);
check("guard: snapshots render", guards.snapshots === true);
check("guard: starters genuinely absent", guards.starters === false);

console.log(
  failures === 0
    ? "\nAll coerceRow invariants hold."
    : `\n${failures} coerceRow invariant(s) FAILED.`,
);
process.exit(failures === 0 ? 0 : 1);
