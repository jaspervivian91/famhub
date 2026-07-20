import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
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
      "It's been 12 days since you connected with Grandma Sue. Send a quick hello! 👋",
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
      "Little Emma has been asking about you! She'd love to hear from Grandma 💛",
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

const MEMBER_COLORS = [
  "bg-[#7c3aed] text-white",
  "bg-[#059669] text-white",
  "bg-[#d97706] text-white",
  "bg-[#dc2626] text-white",
  "bg-[#2563eb] text-white",
  "bg-[#9333ea] text-white",
];

function getMemberColor(index: number): string {
  return MEMBER_COLORS[index % MEMBER_COLORS.length];
}

function getTimeGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
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

  const groupName =
    loaderData.group?.name ?? loaderData.mockGroupName ?? "Family Hub";

  const currentMemberId = getCurrentMemberId();

  const familyOthers: FamilyMember[] = loaderData.group?.members
    ? loaderData.group.members.filter((m) => m.id !== currentMemberId)
    : loaderData.mockMembers ?? [];

  const pendingNudges: (Nudge & { from_name?: string })[] =
    loaderData.nudges.map((n) => ({
      ...n,
      from_name: (n as Record<string, unknown>).from_name as string,
    }));

  async function handleSayHello(member: FamilyMember) {
    const currentId = getCurrentMemberId();
    const currentGroupId = getCurrentGroupId();

    if (!currentId || !currentGroupId) {
      showConfirmation(
        `❤️ ${member.display_name} will know you're thinking of them`,
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
        `❤️ ${member.display_name} will know you're thinking of them`,
      );
    } catch {
      showConfirmation(
        `❤️ ${member.display_name} will know you're thinking of them`,
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
      thinking: `❤️ ${fromName} will know you're thinking of them`,
      call: `📞 ${fromName} will know you'd like a call`,
      note: `📝 ${fromName} will know you sent a note`,
    };
    showConfirmation(
      messages[responseType] ??
        `❤️ ${fromName} will know you're thinking of them`,
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
        backgroundColor: "var(--gp-bg, #fffdf7)",
        color: "var(--gp-text, #1a1a1a)",
        fontSize: "var(--gp-text-size, 20px)",
        lineHeight: 1.6,
      }}
    >
      <div className="mx-auto max-w-lg">
        {/* Greeting */}
        <h1
          className="mb-8 font-bold"
          style={{
            fontSize: "var(--gp-heading-size, 28px)",
            color: "var(--gp-text, #1a1a1a)",
          }}
        >
          {getTimeGreeting()}, {memberName}
        </h1>

        {/* Confirmation toast */}
        {confirmation.visible && (
          <div
            role="status"
            aria-live="polite"
            className="gp-confirmation mb-8 rounded-2xl p-6 text-center font-semibold"
            style={{
              fontSize: "var(--gp-text-size, 20px)",
              backgroundColor: "#ffd700",
              color: "#1a365d",
              transition: "opacity 0.5s ease-in-out",
              opacity: confirmation.visible ? 1 : 0,
            }}
          >
            {confirmation.message}
          </div>
        )}

        {/* Your Family section */}
        <section className="mb-10">
          <h2
            className="mb-6 font-bold"
            style={{
              fontSize: "var(--gp-heading-size, 28px)",
              color: "var(--gp-text, #1a1a1a)",
            }}
          >
            Your family
          </h2>

          {familyOthers.length > 0 ? (
            <div className="space-y-4">
              {familyOthers.slice(0, 4).map((member, idx) => (
                <button
                  key={member.id}
                  onClick={() => handleSayHello(member)}
                  className="gp-family-btn flex w-full items-center gap-5 rounded-2xl border-2 p-5 text-left transition-colors"
                  style={{
                    borderColor: "#ffd700",
                    backgroundColor: "#ffffff",
                    minHeight: "72px",
                  }}
                  aria-label={`Say hello to ${member.display_name}`}
                >
                  <div
                    className={`flex shrink-0 items-center justify-center rounded-full font-bold ${getMemberColor(idx)}`}
                    style={{
                      width: "72px",
                      height: "72px",
                      fontSize: "28px",
                    }}
                    aria-hidden="true"
                  >
                    {getInitials(member.display_name)}
                  </div>
                  <div className="flex flex-col items-start">
                    <span
                      className="font-semibold"
                      style={{
                        fontSize: "var(--gp-text-size, 20px)",
                        color: "var(--gp-text, #1a1a1a)",
                      }}
                    >
                      {member.display_name}
                    </span>
                    <span
                      className="capitalize"
                      style={{
                        fontSize: "18px",
                        color: "#555",
                      }}
                    >
                      {member.relationship.replace("_", " ")}
                    </span>
                  </div>
                  <span className="ml-auto text-2xl" aria-hidden="true">
                    →
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <p
              style={{
                fontSize: "var(--gp-text-size, 20px)",
                color: "#666",
              }}
            >
              Your family will appear here once they join.
            </p>
          )}
        </section>

        {/* They've been thinking of you section */}
        <section className="mb-10">
          <h2
            className="mb-6 font-bold"
            style={{
              fontSize: "var(--gp-heading-size, 28px)",
              color: "var(--gp-text, #1a1a1a)",
            }}
          >
            They&apos;ve been thinking of you
          </h2>

          {pendingNudges.length > 0 ? (
            <div className="space-y-6">
              {pendingNudges.slice(0, 2).map((nudge) => {
                const fromName = nudge.from_name ?? "Someone";
                return (
                  <div
                    key={nudge.id}
                    className="rounded-2xl border-2 p-6"
                    style={{
                      borderColor: "#ffd700",
                      backgroundColor: "#ffffff",
                    }}
                  >
                    <p
                      className="mb-3 font-semibold"
                      style={{
                        fontSize: "var(--gp-text-size, 20px)",
                        color: "var(--gp-text, #1a1a1a)",
                      }}
                    >
                      {fromName}
                    </p>
                    <p
                      className="mb-5"
                      style={{
                        fontSize: "18px",
                        color: "#444",
                        lineHeight: 1.5,
                      }}
                    >
                      {nudge.message_text}
                    </p>
                    <div className="flex flex-col gap-3">
                      <button
                        onClick={() =>
                          handleNudgeResponse(nudge, "thinking")
                        }
                        className="gp-response-btn w-full rounded-2xl px-6 py-4 text-left font-semibold transition-colors"
                        style={{
                          minHeight: "56px",
                          fontSize: "var(--gp-text-size, 20px)",
                          backgroundColor: "var(--gp-accent-bg, #ffd700)",
                          color: "var(--gp-accent-text, #1a365d)",
                          border: "none",
                        }}
                      >
                        ❤️ Thinking of you too
                      </button>
                      <button
                        onClick={() => handleNudgeResponse(nudge, "call")}
                        className="gp-response-btn w-full rounded-2xl px-6 py-4 text-left font-semibold transition-colors"
                        style={{
                          minHeight: "56px",
                          fontSize: "var(--gp-text-size, 20px)",
                          backgroundColor: "#ffffff",
                          color: "#1a365d",
                          border: "2px solid #1a365d",
                        }}
                      >
                        📞 Call me?
                      </button>
                      <button
                        onClick={() => handleNudgeResponse(nudge, "note")}
                        className="gp-response-btn w-full rounded-2xl px-6 py-4 text-left font-semibold transition-colors"
                        style={{
                          minHeight: "56px",
                          fontSize: "var(--gp-text-size, 20px)",
                          backgroundColor: "#ffffff",
                          color: "#1a365d",
                          border: "2px solid #1a365d",
                        }}
                      >
                        📝 Send a note
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p
              style={{
                fontSize: "var(--gp-text-size, 20px)",
                color: "#666",
              }}
            >
              No new messages right now. Your family is staying in touch!
            </p>
          )}
        </section>

        {/* Back to standard dashboard */}
        <div className="mt-8 border-t pt-6" style={{ borderColor: "#e0d8c8" }}>
          <a
            href="/"
            className="gp-back-link inline-flex items-center rounded-2xl px-6 py-4 font-medium transition-colors"
            style={{
              fontSize: "18px",
              color: "#1a365d",
              textDecoration: "underline",
              minHeight: "56px",
            }}
          >
            ← Back to Family Hub
          </a>
        </div>

        {/* Mode toggle at bottom */}
        <div className="mt-6 border-t pt-6" style={{ borderColor: "#e0d8c8" }}>
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              setUIMode("standard");
              window.location.href = "/";
            }}
            className="inline-flex items-center rounded-2xl px-6 py-4 font-medium transition-colors"
            style={{
              fontSize: "16px",
              color: "#666",
              minHeight: "56px",
            }}
          >
            Switch to standard view
          </a>
        </div>
      </div>
    </main>
  );
}
