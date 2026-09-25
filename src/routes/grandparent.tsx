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
import { Icon } from "~/components/Icon";
import { Logo } from "~/components/Logo";

// ── Warm palette (kept in sync with app.css / design-system-warm.md) ──
const CREAM = "var(--color-gp-bg)";
const INK = "var(--color-gp-text)";
const SAND = "var(--color-gp-surface)";
const GREEN = "var(--color-gp-primary)";
const BORDER = "var(--color-gp-border)";

// ── Grandparent typography (nothing smaller than 23px) ───────────────
const GP_BODY = "1.4375rem"; // 23px
const GP_H1 = "2.25rem"; // 36px
const GP_H2 = "2rem"; // 32px

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
      "It's been a little while, and Emma has been asking about you. She'd love to hear your voice.",
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
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

// Strip any emoji from nudge copy — DB-backed messages may still contain
// them, and emoji are never used as UI in this product.
const EMOJI_RE =
  /[\p{Extended_Pictographic}\u{1F3FB}-\u{1F3FF}\u{FE0F}\u{200D}]/gu;
function stripEmoji(text: string): string {
  return text.replace(EMOJI_RE, "").replace(/\s+/g, " ").trim();
}

/** Soft round avatar — sand circle, warm border, bold initials. */
function Avatar({ name, size }: { name: string; size: number }) {
  return (
    <span
      aria-hidden="true"
      className="flex shrink-0 items-center justify-center rounded-full font-[family-name:var(--font-gp)]"
      style={{
        width: size,
        height: size,
        backgroundColor: CREAM,
        border: `2px solid ${BORDER}`,
        color: INK,
        fontWeight: 700,
        fontSize: Math.round(size * 0.4),
      }}
    >
      {getInitials(name)}
    </span>
  );
}

// ── Main Component ──────────────────────────────────────────────────

function GrandparentDashboard() {
  const loaderData = Route.useLoaderData();
  const [confirmation, setConfirmation] = useState<{
    message: string;
    visible: boolean;
  }>({ message: "", visible: false });

  const memberName =
    loaderData.member?.display_name ??
    loaderData.mockMemberName ??
    getCurrentMemberName() ??
    "there";

  const currentMemberId = getCurrentMemberId();

  const familyOthers: FamilyMember[] = loaderData.group?.members
    ? loaderData.group.members.filter((m) => m.id !== currentMemberId)
    : (loaderData.mockMembers ?? []);

  const pendingNudges: (Nudge & { from_name?: string })[] =
    loaderData.nudges.map((n) => ({
      ...n,
      from_name: (n as unknown as Record<string, unknown>).from_name as string,
    }));

  async function handleSayHello(member: FamilyMember) {
    const currentId = getCurrentMemberId();
    const currentGroupId = getCurrentGroupId();

    if (currentId && currentGroupId) {
      try {
        await recordInteraction({
          data: {
            fromMemberId: currentId,
            toMemberId: member.id,
            groupId: currentGroupId,
            interactionType: "nudge_acknowledged",
            metadata: {
              source: "grandparent_dashboard",
              gesture: "say_hello",
            },
          },
        });
      } catch {
        // best-effort
      }
    }
    showConfirmation(
      `${member.display_name} will know you're thinking of them.`,
    );
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
      messages[responseType] ?? `${fromName} will know you're thinking of them.`,
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
        backgroundColor: CREAM,
        color: INK,
        fontSize: GP_BODY,
        lineHeight: 1.6,
      }}
    >
      <div className="mx-auto max-w-[520px]">
        {/* Wordmark + today's date — both at reading size, never tiny */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Logo variant="full" size="md" />
          <span style={{ color: INK, opacity: 0.75 }}>{getTodayLabel()}</span>
        </div>
        <div
          aria-hidden="true"
          className="mt-4"
          style={{ borderTop: `2px solid ${BORDER}`, opacity: 0.5 }}
        />

        {/* Greeting */}
        <h1 className="mt-9 mb-9" style={{ fontSize: GP_H1, fontWeight: 700 }}>
          {getTimeGreeting()}, {memberName}
        </h1>

        {/* Confirmation toast — fade only, never moves */}
        {confirmation.visible && (
          <div
            role="status"
            aria-live="polite"
            className="gp-confirmation mb-9 flex items-start gap-4 p-6"
            style={{
              backgroundColor: SAND,
              border: `2px solid ${GREEN}`,
              borderRadius: "var(--radius-card-soft)",
            }}
          >
            <Icon name="check" size={36} />
            <p style={{ fontWeight: 700 }}>{confirmation.message}</p>
          </div>
        )}

        {/* Your family */}
        <section className="mb-10">
          <h2 className="mb-5" style={{ fontSize: GP_H2, fontWeight: 700 }}>
            Your family
          </h2>

          {familyOthers.length > 0 ? (
            <div className="flex flex-col gap-4">
              {familyOthers.slice(0, 4).map((member) => (
                <button
                  key={member.id}
                  onClick={() => handleSayHello(member)}
                  className="gp-family-btn flex w-full items-center gap-5 p-5 text-left"
                  style={{
                    minHeight: 96,
                    backgroundColor: SAND,
                    border: `2px solid ${BORDER}`,
                    borderRadius: "var(--radius-card)",
                    color: INK,
                    fontSize: GP_BODY,
                  }}
                  aria-label={`Say hello to ${member.display_name}`}
                >
                  <Avatar name={member.display_name} size={64} />
                  <span className="flex flex-col items-start">
                    <span style={{ fontWeight: 700 }}>
                      {member.display_name}
                    </span>
                    <span style={{ opacity: 0.75 }}>
                      {member.relationship.replace("_", " ")}
                    </span>
                  </span>
                  <span
                    className="ml-auto"
                    style={{ color: GREEN, fontWeight: 700 }}
                  >
                    Say hello
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <p style={{ opacity: 0.8 }}>
              Your family will appear here once they join.
            </p>
          )}
        </section>

        {/* They've been thinking of you */}
        <section className="mb-10">
          <h2 className="mb-5" style={{ fontSize: GP_H2, fontWeight: 700 }}>
            They&apos;ve been thinking of you
          </h2>

          {pendingNudges.length > 0 ? (
            <div className="flex flex-col gap-6">
              {pendingNudges.slice(0, 2).map((nudge) => {
                const fromName = nudge.from_name ?? "Someone";
                return (
                  <div
                    key={nudge.id}
                    className="gp-card"
                    style={{ backgroundColor: SAND, borderColor: BORDER }}
                  >
                    <div className="mb-4 flex items-center gap-4">
                      <Avatar name={fromName} size={56} />
                      <span style={{ fontWeight: 700 }}>{fromName}</span>
                    </div>
                    <p className="mb-6" style={{ opacity: 0.9 }}>
                      {stripEmoji(nudge.message_text)}
                    </p>
                    <div className="flex flex-col gap-4">
                      <button
                        onClick={() => handleNudgeResponse(nudge, "thinking")}
                        className="gp-response-btn gp-btn gp-btn-primary gp-tap-lg"
                        style={{ justifyContent: "center" }}
                      >
                        Thinking of you too
                      </button>
                      <button
                        onClick={() => handleNudgeResponse(nudge, "call")}
                        className="gp-response-btn gp-btn gp-tap"
                        style={{ justifyContent: "center", backgroundColor: CREAM }}
                      >
                        Call me?
                      </button>
                      <button
                        onClick={() => handleNudgeResponse(nudge, "note")}
                        className="gp-response-btn gp-btn gp-tap"
                        style={{ justifyContent: "center", backgroundColor: CREAM }}
                      >
                        Send a note
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p style={{ opacity: 0.8 }}>
              No new messages right now. Your family is staying in touch.
            </p>
          )}
        </section>

        {/* Back to standard view */}
        <footer className="mt-10 flex flex-col gap-5">
          <div
            aria-hidden="true"
            className="h-0"
            style={{ borderTop: `2px solid ${BORDER}`, opacity: 0.5 }}
          />
          <a
            href="/digest"
            className="gp-btn"
            style={{ justifyContent: "center", backgroundColor: CREAM }}
          >
            <Icon name="checklist" size={32} />
            Read this week&apos;s letter
          </a>
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              setUIMode("standard");
              window.location.href = "/";
            }}
            className="gp-btn"
            style={{ justifyContent: "center", backgroundColor: CREAM }}
          >
            <Icon name="talk" size={32} />
            Back to the regular view
          </a>
        </footer>
      </div>
    </main>
  );
}
