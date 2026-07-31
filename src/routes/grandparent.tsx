import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { useState } from "react";
import {
  getPendingNudges,
  getFamilyGroup,
  recordInteraction,
  acknowledgeNudge,
  getMemberById,
} from "~/lib/api";
import {
  getCurrentMemberId,
  getCurrentGroupId,
  getCurrentMemberName,
} from "~/lib/client-store";
import { setUIMode } from "~/lib/ui-mode";
import type { Nudge, FamilyMember } from "~/lib/types";

// ── Brand constants (kept in sync with brand spec / app.css) ──────────
const INK = "#1A1A1A";
const WHITE = "#FFFFFF";
const ACCENT = "#3A6B4A";
const SURFACE = "#EBF0EC";
const MONO = "'JetBrains Mono', 'SF Mono', 'Courier New', monospace";
const SANS = "Inter, ui-sans-serif, system-ui, sans-serif";

// ── Mock data for when no DB is connected ────────────────────────────

const MOCK_MEMBERS: FamilyMember[] = [
  {
    id: "mock-gp",
    group_id: "mock-group",
    display_name: "Grandma Sue",
    relationship: "grandparent",
    avatar_url: null,
    timezone: "America/Chicago",
    created_at: new Date().toISOString(),
    preferences: {
      id: "mock-pref",
      member_id: "mock-gp",
      ui_mode: "grandparent",
      notifications_enabled: true,
      digest_frequency: "weekly",
    },
  },
  {
    id: "mock-a",
    group_id: "mock-group",
    display_name: "Sarah",
    relationship: "child",
    avatar_url: null,
    timezone: "America/New_York",
    created_at: new Date().toISOString(),
  },
  {
    id: "mock-b",
    group_id: "mock-group",
    display_name: "Michael",
    relationship: "child",
    avatar_url: null,
    timezone: "America/Denver",
    created_at: new Date().toISOString(),
  },
  {
    id: "mock-c",
    group_id: "mock-group",
    display_name: "Little Emma",
    relationship: "grandchild",
    avatar_url: null,
    timezone: "America/New_York",
    created_at: new Date().toISOString(),
  },
];

const MOCK_NUDGES: (Nudge & { from_name: string })[] = [
  {
    id: "mock-nudge-1",
    group_id: "mock-group",
    from_member_id: "mock-a",
    to_member_id: "mock-gp",
    nudge_type: "dormancy",
    message_text:
      "It's been 12 days since you connected with Grandma Sue. Send a quick hello!",
    status: "pending",
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    acknowledged_at: null,
    from_name: "Sarah",
  },
  {
    id: "mock-nudge-2",
    group_id: "mock-group",
    from_member_id: "mock-c",
    to_member_id: "mock-gp",
    nudge_type: "celebration",
    message_text:
      "Little Emma has been asking about you! She'd love to hear from Grandma.",
    status: "pending",
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    acknowledged_at: null,
    from_name: "Little Emma",
  },
];

// ── Server: load grandparent data ───────────────────────────────────

const getGrandparentData = createServerFn({ method: "GET" })
  .validator((d: { memberId?: string; groupId?: string }) => d)
  .handler(async ({ data }) => {
    if (!data.memberId || !data.groupId) {
      // Return mock data when no identity is stored
      return {
        group: null,
        member: null,
        nudges: MOCK_NUDGES,
        mockMembers: MOCK_MEMBERS.filter((m) => m.id !== "mock-gp"),
        mockGroupName: "The Johnson Family",
        mockMemberName: "Grandma",
      };
    }

    try {
      const [group, member, nudges] = await Promise.all([
        getFamilyGroup({ data: { groupId: data.groupId } }),
        getMemberById({ data: { memberId: data.memberId } }),
        getPendingNudges({ data: { memberId: data.memberId } }),
      ]);

      if (group) {
        return {
          group,
          member,
          nudges,
          mockMembers: null,
          mockGroupName: null,
          mockMemberName: null,
        };
      }
    } catch {
      // fall through to mock
    }

    return {
      group: null,
      member: null,
      nudges: MOCK_NUDGES,
      mockMembers: MOCK_MEMBERS.filter((m) => m.id !== "mock-gp"),
      mockGroupName: "The Johnson Family",
      mockMemberName: "Grandma",
    };
  });

// ── Route ───────────────────────────────────────────────────────────

export const Route = createFileRoute("/grandparent")({
  loader: async () => {
    const memberId = getCurrentMemberId();
    const groupId = getCurrentGroupId();

    const result = await getGrandparentData({
      data: { memberId: memberId ?? undefined, groupId: groupId ?? undefined },
    });

    return result;
  },
  component: GrandparentDashboard,
});

// ── Helpers ─────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n.charAt(0))
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function getTimeGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function getTodayLabel(): string {
  return new Date()
    .toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    })
    .toUpperCase();
}

function getNudgeTypeLabel(type: string): string {
  if (type === "celebration") return "Celebration";
  if (type === "dormancy") return "Dormancy signal";
  return type.replace(/_/g, " ");
}

// Strip any emoji from nudge copy so the UI stays in the brand's
// geometric language (DB-backed messages may still contain them).
const EMOJI_RE = /[\p{Extended_Pictographic}\u{1F3FB}-\u{1F3FF}\u{FE0F}\u{200D}]/gu;
function stripEmoji(text: string): string {
  return text
    .replace(EMOJI_RE, "")
    .replace(/\s+/g, " ")
    .trim();
}

// ── Small brand primitives ──────────────────────────────────────────

/** Square dot — the brand's ■ marker. Inherits current text color. */
function Dot({ size = 10 }: { size?: number }) {
  return (
    <span
      aria-hidden="true"
      className="shrink-0"
      style={{
        width: size,
        height: size,
        backgroundColor: "currentColor",
      }}
    />
  );
}

/** Geometric avatar — square container, 2px ink border, neutral surface. */
function Avatar({ name, size }: { name: string; size: number }) {
  return (
    <div
      aria-hidden="true"
      className="flex shrink-0 items-center justify-center"
      style={{
        width: size,
        height: size,
        backgroundColor: SURFACE,
        border: `2px solid ${INK}`,
        fontFamily: SANS,
        fontWeight: 700,
        fontSize: Math.round(size * 0.36),
        color: INK,
      }}
    >
      {getInitials(name)}
    </div>
  );
}

/** Ruled-line arrow — straight strokes, square joins. */
function ArrowMark() {
  return (
    <svg
      width="26"
      height="14"
      viewBox="0 0 26 14"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M1 7 H22 M15 1 L23 7 L15 13"
        stroke={INK}
        strokeWidth="2.5"
        strokeLinecap="square"
        strokeLinejoin="miter"
      />
    </svg>
  );
}

/** Structural ruled line with square registration dots. */
function RuleLine({ className = "" }: { className?: string }) {
  return (
    <div className={`relative ${className}`} style={{ borderTop: `2px solid ${INK}` }}>
      <span
        aria-hidden="true"
        className="absolute"
        style={{ width: "10px", height: "10px", backgroundColor: INK, top: "-6px", left: "0" }}
      />
      <span
        aria-hidden="true"
        className="absolute"
        style={{ width: "10px", height: "10px", backgroundColor: INK, top: "-6px", right: "0" }}
      />
    </div>
  );
}

/** Section heading — bold uppercase Inter + mono spec label + ruled rule. */
function SectionHeading({ index, title }: { index: string; title: string }) {
  return (
    <div className="mb-6">
      <div className="flex items-baseline justify-between gap-4">
        <h2
          className="font-bold"
          style={{
            fontSize: "var(--gp-heading-size, 28px)",
            color: INK,
            textTransform: "uppercase",
            letterSpacing: "0.04em",
          }}
        >
          {title}
        </h2>
        <span
          style={{
            fontFamily: MONO,
            fontSize: "14px",
            letterSpacing: "0.15em",
            color: INK,
            opacity: 0.55,
            textTransform: "uppercase",
            whiteSpace: "nowrap",
          }}
        >
          SEC {index}
        </span>
      </div>
      <RuleLine className="mt-3" />
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────

function GrandparentDashboard() {
  const loaderData = Route.useLoaderData();
  const [confirmation, setConfirmation] = useState<{
    message: string;
    visible: boolean;
  }>({ message: "", visible: false });

  // Determine what to show
  const memberName =
    loaderData.member?.display_name ??
    loaderData.mockMemberName ??
    getCurrentMemberName() ??
    "there";

  const currentMemberId = getCurrentMemberId();

  const familyOthers: FamilyMember[] = loaderData.group?.members
    ? loaderData.group.members.filter((m) => m.id !== currentMemberId)
    : loaderData.mockMembers ?? [];

  const pendingNudges: (Nudge & { from_name?: string })[] =
    loaderData.nudges.map((n) => ({
      ...n,
      from_name: (n as unknown as Record<string, unknown>)
        .from_name as string,
    }));

  async function handleSayHello(member: FamilyMember) {
    const currentId = getCurrentMemberId();
    const currentGroupId = getCurrentGroupId();

    if (!currentId || !currentGroupId) {
      showConfirmation(
        `${member.display_name} will know you're thinking of them.`,
      );
      return;
    }

    try {
      await recordInteraction({
        data: {
          fromMemberId: currentId,
          toMemberId: member.id,
          groupId: currentGroupId,
          interactionType: "nudge_acknowledged",
          metadata: { source: "grandparent_dashboard", gesture: "say_hello" },
        },
      });
      showConfirmation(
        `${member.display_name} will know you're thinking of them.`,
      );
    } catch {
      showConfirmation(
        `${member.display_name} will know you're thinking of them.`,
      );
    }
  }

  async function handleNudgeResponse(
    nudge: Nudge & { from_name?: string },
    responseType: string,
  ) {
    const currentId = getCurrentMemberId();
    const currentGroupId = getCurrentGroupId();

    const fromName = nudge.from_name ?? "Your family";

    if (currentId && currentGroupId) {
      try {
        await recordInteraction({
          data: {
            fromMemberId: currentId,
            toMemberId: nudge.from_member_id,
            groupId: currentGroupId,
            interactionType: "nudge_acknowledged",
            metadata: {
              source: "grandparent_dashboard",
              response: responseType,
              nudgeId: nudge.id,
            },
          },
        });

        if (!nudge.id.startsWith("mock-")) {
          await acknowledgeNudge({ data: { nudgeId: nudge.id } });
        }
      } catch {
        // best-effort
      }
    }

    const messages: Record<string, string> = {
      thinking: `${fromName} will know you're thinking of them.`,
      call: `${fromName} will know you'd like a call.`,
      note: `${fromName} will know you sent a note.`,
    };
    showConfirmation(
      messages[responseType] ??
        `${fromName} will know you're thinking of them.`,
    );
  }

  function showConfirmation(message: string) {
    setConfirmation({ message, visible: true });
    setTimeout(() => {
      setConfirmation((prev) => ({ ...prev, visible: false }));
    }, 5000);
  }

  // ── Render ─────────────────────────────────────────────────────────

  return (
    <main
      className="gp-mode min-h-dvh px-6 py-8"
      style={{
        backgroundColor: WHITE,
        color: INK,
        fontSize: "var(--gp-text-size, 20px)",
        lineHeight: 1.6,
      }}
    >
      <div className="mx-auto max-w-lg">
        {/* Wordmark strip + today's date */}
        <div
          className="flex items-baseline justify-between gap-4"
          style={{
            fontFamily: MONO,
            fontSize: "14px",
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: INK,
          }}
        >
          <span className="font-bold">Family Core</span>
          <span style={{ opacity: 0.6 }}>{getTodayLabel()}</span>
        </div>
        <RuleLine className="mt-3" />

        {/* Greeting */}
        <h1
          className="mt-10 mb-10 font-bold"
          style={{
            fontSize: "var(--gp-heading-size, 28px)",
            color: INK,
            textTransform: "uppercase",
            letterSpacing: "0.04em",
            lineHeight: 1.2,
          }}
        >
          {getTimeGreeting()}, {memberName}
        </h1>

        {/* Confirmation toast */}
        {confirmation.visible && (
          <div
            role="status"
            aria-live="polite"
            className="gp-confirmation mb-10 flex items-start gap-4 p-5"
            style={{
              border: `2px solid ${INK}`,
              backgroundColor: SURFACE,
            }}
          >
            <span
              aria-hidden="true"
              className="mt-1.5 shrink-0"
              style={{ width: "14px", height: "14px", backgroundColor: ACCENT }}
            />
            <p
              style={{
                fontSize: "var(--gp-text-size, 20px)",
                fontWeight: 600,
                color: INK,
                lineHeight: 1.4,
              }}
            >
              {confirmation.message}
            </p>
          </div>
        )}

        {/* Your Family section */}
        <section className="mb-12">
          <SectionHeading index="01" title="Your family" />

          {familyOthers.length > 0 ? (
            <div className="space-y-4">
              {familyOthers.slice(0, 4).map((member) => (
                <button
                  key={member.id}
                  onClick={() => handleSayHello(member)}
                  className="gp-family-btn flex w-full items-center gap-5 border-2 p-5 text-left transition-colors"
                  style={{
                    borderColor: INK,
                    backgroundColor: WHITE,
                    minHeight: "84px",
                  }}
                  aria-label={`Say hello to ${member.display_name}`}
                >
                  <Avatar name={member.display_name} size={72} />
                  <div className="flex flex-col items-start gap-1">
                    <span
                      style={{
                        fontSize: "var(--gp-text-size, 20px)",
                        fontWeight: 600,
                        color: INK,
                      }}
                    >
                      {member.display_name}
                    </span>
                    <span
                      style={{
                        fontFamily: MONO,
                        fontSize: "15px",
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        color: INK,
                        opacity: 0.6,
                      }}
                    >
                      {member.relationship.replace("_", " ")}
                    </span>
                  </div>
                  <span className="ml-auto" aria-hidden="true">
                    <ArrowMark />
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <p
              style={{
                fontSize: "18px",
                color: INK,
                opacity: 0.65,
                lineHeight: 1.5,
              }}
            >
              Your family will appear here once they join.
            </p>
          )}
        </section>

        {/* They've been thinking of you section */}
        <section className="mb-12">
          <SectionHeading index="02" title="They've been thinking of you" />

          {pendingNudges.length > 0 ? (
            <div className="space-y-6">
              {pendingNudges.slice(0, 2).map((nudge) => {
                const fromName = nudge.from_name ?? "Someone";
                return (
                  <div
                    key={nudge.id}
                    className="border-2 p-6"
                    style={{
                      borderColor: INK,
                      backgroundColor: WHITE,
                    }}
                  >
                    <div className="mb-4 flex items-center gap-4">
                      <Avatar name={fromName} size={52} />
                      <div className="flex flex-col items-start gap-0.5">
                        <span
                          style={{
                            fontSize: "20px",
                            fontWeight: 600,
                            color: INK,
                          }}
                        >
                          {fromName}
                        </span>
                        <span
                          style={{
                            fontFamily: MONO,
                            fontSize: "13px",
                            letterSpacing: "0.15em",
                            textTransform: "uppercase",
                            color: INK,
                            opacity: 0.55,
                          }}
                        >
                          {getNudgeTypeLabel(nudge.nudge_type)}
                        </span>
                      </div>
                    </div>
                    <p
                      className="mb-5"
                      style={{
                        fontSize: "18px",
                        color: INK,
                        opacity: 0.85,
                        lineHeight: 1.5,
                      }}
                    >
                      {stripEmoji(nudge.message_text)}
                    </p>
                    <div className="flex flex-col gap-3">
                      <button
                        onClick={() =>
                          handleNudgeResponse(nudge, "thinking")
                        }
                        className="gp-response-btn flex w-full items-center gap-4 px-6 py-4 text-left font-semibold transition-colors"
                        style={{
                          minHeight: "64px",
                          fontSize: "var(--gp-text-size, 20px)",
                          backgroundColor: ACCENT,
                          color: WHITE,
                          border: `2px solid ${ACCENT}`,
                        }}
                      >
                        <Dot />
                        Thinking of you too
                      </button>
                      <button
                        onClick={() => handleNudgeResponse(nudge, "call")}
                        className="gp-response-btn flex w-full items-center gap-4 px-6 py-4 text-left font-semibold transition-colors"
                        style={{
                          minHeight: "64px",
                          fontSize: "var(--gp-text-size, 20px)",
                          backgroundColor: WHITE,
                          color: INK,
                          border: `2px solid ${INK}`,
                        }}
                      >
                        <Dot />
                        Call me?
                      </button>
                      <button
                        onClick={() => handleNudgeResponse(nudge, "note")}
                        className="gp-response-btn flex w-full items-center gap-4 px-6 py-4 text-left font-semibold transition-colors"
                        style={{
                          minHeight: "64px",
                          fontSize: "var(--gp-text-size, 20px)",
                          backgroundColor: WHITE,
                          color: INK,
                          border: `2px solid ${INK}`,
                        }}
                      >
                        <Dot />
                        Send a note
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p
              style={{
                fontSize: "18px",
                color: INK,
                opacity: 0.65,
                lineHeight: 1.5,
              }}
            >
              No new messages right now. Your family is staying in touch!
            </p>
          )}
        </section>

        {/* Back to standard dashboard */}
        <footer className="mt-10">
          <div style={{ borderTop: `2px solid ${INK}` }} />
          <a
            href="/"
            className="gp-back-link inline-flex min-h-[56px] w-full items-center gap-4 font-medium"
            style={{
              fontSize: "18px",
              color: INK,
              textDecoration: "underline",
              textUnderlineOffset: "5px",
            }}
          >
            <Dot />
            Back to Family Core
          </a>
          <div style={{ borderTop: `2px solid ${INK}` }} />
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              setUIMode("standard");
              window.location.href = "/";
            }}
            className="inline-flex min-h-[56px] w-full items-center gap-4 font-medium"
            style={{
              fontSize: "16px",
              color: INK,
              opacity: 0.75,
            }}
          >
            <Dot size={8} />
            Switch to standard view
          </a>
        </footer>
      </div>
    </main>
  );
}
