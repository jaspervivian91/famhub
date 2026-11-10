/**
 * Invariant check for src/lib/email.ts senders.
 *
 * Two defects this pins down, both found by sending a real digest:
 *
 *  1. `await resend.emails.send({…})` with the result ignored reported
 *     `{ success: true }` even when Resend answered 403 and delivered nothing
 *     ("You can only send testing emails to your own email address"). Resend
 *     resolves with `{ data: null, error }` instead of throwing, and callers
 *     such as the digest route go on to set `digests.sent_at = now()`. A
 *     rejected send must come back `success: false`.
 *  2. The emailed digest carried only the scores and the starters — the
 *     letter's opening "moments" (content.momentsToMention) never reached the
 *     inbox, although the dashboard card and /digest both show them.
 *
 * No network: `globalThis.fetch` is replaced with a scripted provider, so this
 * runs offline and can never mail a real person.
 *
 * Run:  bun run check:email-send
 */
import { sendDigestEmail } from "../src/lib/email";

process.env.RESEND_API_KEY = "re_test_key";

let failures = 0;
function check(name: string, condition: boolean, detail?: unknown) {
  if (condition) {
    console.log(`  ok   ${name}`);
  } else {
    failures++;
    console.log(`  FAIL ${name}`, detail === undefined ? "" : detail);
  }
}

/** The three moments, three snapshots and three starters the Warmtest digest holds. */
const digestContent = {
  weekLabel: "Sep 28 – Oct 4",
  weekStart: "2026-09-28T00:00:00.000Z",
  weekEnd: "2026-10-04T23:59:59.999Z",
  memberName: "Sarah",
  generatedAt: "2026-09-28T14:14:24.542Z",
  irlNudge: null,
  momentsToMention: [
    { text: "Sarah and Tom reconnected this week!", type: "reconnection" },
    { text: "Sarah and Alex reconnected this week!", type: "reconnection" },
    {
      text: "Every conversation counts — your family is building stronger bonds",
      type: "celebration",
    },
  ],
  connectionSnapshot: [
    {
      label: "Cooling down",
      score: 40,
      memberA: { id: "a", name: "Sarah" },
      memberB: { id: "b", name: "Alex" },
    },
    {
      label: "Steady",
      score: 61,
      memberA: { id: "a", name: "Sarah" },
      memberB: { id: "c", name: "Grandma Sue" },
    },
    {
      label: "Steady",
      score: 68,
      memberA: { id: "a", name: "Sarah" },
      memberB: { id: "d", name: "Tom" },
    },
  ],
  conversationStarters: [
    {
      id: "starter-0",
      text: "Share a recent photo and challenge Alex to share one back",
    },
    {
      id: "starter-1",
      text: "Ask Alex what their favorite family vacation was",
    },
    {
      id: "starter-2",
      text: "Challenge Alex to a step-count competition this month",
    },
  ],
};

type ProviderAnswer = { status: number; body: unknown };

let nextAnswer: ProviderAnswer = { status: 200, body: { id: "test-id" } };
let lastPayload: any = null;

const realFetch = globalThis.fetch;
globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const url =
    typeof input === "string"
      ? input
      : String((input as Request)?.url ?? input);
  if (!url.includes("api.resend.com")) return realFetch(input, init);
  lastPayload = init?.body ? JSON.parse(String(init.body)) : null;
  return new Response(JSON.stringify(nextAnswer.body), {
    status: nextAnswer.status,
    headers: { "content-type": "application/json" },
  });
}) as typeof globalThis.fetch;

const recipient = "family-hub-24f84ba8@ctomail.io";

console.log("email send result and digest content");

// ── 1. a provider rejection must not be reported as success ────────────────
nextAnswer = {
  status: 403,
  body: {
    statusCode: 403,
    name: "validation_error",
    message:
      "You can only send testing emails to your own email address (owner@example.com). To send emails to other recipients, please verify a domain at resend.com/domains, and change the `from` address to an email using this domain.",
  },
};
const rejected = await sendDigestEmail(
  { content: digestContent },
  recipient,
  "Sarah",
);
check(
  "a 403 rejection is success: false",
  rejected.success === false,
  rejected,
);
check(
  "the rejection carries the provider's name and status",
  typeof rejected.error === "string" &&
    rejected.error.includes("validation_error") &&
    rejected.error.includes("403"),
  rejected.error,
);
check(
  "the rejection carries the provider's message",
  typeof rejected.error === "string" &&
    rejected.error.includes("please verify a domain"),
  rejected.error,
);

// ── 2. an accepted send is success: true, and carries the letter's moments ──
nextAnswer = { status: 200, body: { id: "test-message-id" } };
const accepted = await sendDigestEmail(
  { content: digestContent },
  recipient,
  "Sarah",
);
check("an accepted send is success: true", accepted.success === true, accepted);
check(
  "the digest goes to the recipient it was given",
  lastPayload?.to === recipient,
  lastPayload?.to,
);

const html = String(lastPayload?.html ?? "");
const text = String(lastPayload?.text ?? "");
for (const moment of digestContent.momentsToMention) {
  check(
    `the emailed letter carries the moment "${moment.text}"`,
    text.includes(moment.text) && html.includes(moment.text),
    { inText: text.includes(moment.text), inHtml: html.includes(moment.text) },
  );
}
for (const snapshot of digestContent.connectionSnapshot) {
  const name = snapshot.memberB.name;
  check(
    `the emailed letter carries ${name}'s score`,
    text.includes(name) && html.includes(name),
  );
}
check(
  "the emailed letter keeps the plain-text twin in step",
  text.includes("Moments worth mentioning") &&
    text.includes("Connection health") &&
    text.includes("Conversation starters"),
);

// ── 3. an accepted-but-empty answer (no message id) is not success ─────────
nextAnswer = { status: 200, body: {} };
const noId = await sendDigestEmail(
  { content: digestContent },
  recipient,
  "Sarah",
);
check(
  "a 200 without a message id is success: false",
  noId.success === false,
  noId,
);

globalThis.fetch = realFetch;

console.log(
  failures === 0
    ? "\nAll email send-result invariants hold."
    : `\n${failures} email send-result invariant(s) FAILED.`,
);
if (failures > 0) process.exit(1);
