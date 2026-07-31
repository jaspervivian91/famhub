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
      "Little Emma has been asking about you! She'd love to hear from Grandma",
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
  if (hour < 12) return "GOOD MORNING";
  if (hour < 17) return "GOOD AFTERNOON";
  return "GOOD EVENING";
}

function getDateString(): string {
  const now = new Date();
  const days = [
    "SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY",
    "THURSDAY", "FRIDAY", "SATURDAY",
  ];
  const months = [
    "JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE",
    "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER",
  ];
  return `${days[now.getDay()]} ${now.getDate()} ${months[now.getMonth()]}`;
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
        `${member.display_name} WILL KNOW YOU'RE THINKING OF THEM`,
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
        `${member.display_name} WILL KNOW YOU'RE THINKING OF THEM`,
      );
    } catch {
      showConfirmation(
        `${member.display_name} WILL KNOW YOU'RE THINKING OF THEM`,
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
      thinking: `${fromName} WILL KNOW YOU'RE THINKING OF THEM`,
      call: `${fromName} WILL KNOW YOU'D LIKE A CALL`,
      note: `${fromName} WILL KNOW YOU SENT A NOTE`,
    };
    showConfirmation(
      messages[responseType] ??
        `${fromName} WILL KNOW YOU'RE THINKING OF THEM`,
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
        backgroundColor: "#FFFFFF",
        color: "#1A1A1A",
        fontSize: "20px",
        lineHeight: 1.6,
      }}
    >
      <div className="mx-auto max-w-[375px]">
        {/* Greeting */}
        <h1
          className="mb-8 font-bold uppercase"
          style={{
            fontSize: "32px",
            fontWeight: 800,
            fontFamily: "Inter, sans-serif",
            letterSpacing: "0.04em",
            color: "#1A1A1A",
          }}
        >
          HELLO, {memberName}
        </h1>

        {/* Date — monospace, full */}
        <p
          className="mb-8 font-mono"
          style={{
            fontSize: "16px",
            color: "#1A1A1A",
            opacity: 0.5,
          }}
        >
          {getDateString()}
        </p>

        {/* Ruled line separator */}
        <div
          className="mb-10 w-full"
          style={{ borderTop: "2px solid #1A1A1A" }}
        />

        {/* Confirmation toast */}
        {confirmation.visible && (
          <div
            role="status"
            aria-live="polite"
            className="gp-confirmation mb-8 p-6 text-center font-bold uppercase"
            style={{
              fontSize: "20px",
              backgroundColor: "#F0EDE8",
              color: "#1A1A1A",
              border: "2px solid #C8603A",
              fontFamily: "Inter, sans-serif",
              fontWeight: 800,
              letterSpacing: "0.04em",
              opacity: confirmation.visible ? 1 : 0,
            }}
          >
            {confirmation.message}
          </div>
        )}

        {/* Your Family section */}
        <section className="mb-10">
          <h2
            className="mb-6 font-bold uppercase"
            style={{
              fontSize: "28px",
              fontWeight: 800,
              fontFamily: "Inter, sans-serif",
              letterSpacing: "0.06em",
              color: "#1A1A1A",
            }}
          >
            YOUR FAMILY
          </h2>

          {familyOthers.length > 0 ? (
            <div className="space-y-4">
              {familyOthers.slice(0, 4).map((member, idx) => (
                <button
                  key={member.id}
                  onClick={() => handleSayHello(member)}
                  className="gp-family-btn flex w-full items-center gap-5 p-5 text-left font-bold uppercase"
                  style={{
                    backgroundColor: "#F0EDE8",
                    border: "2px solid #1A1A1A",
                    color: "#1A1A1A",
                    minHeight: "72px",
                    fontFamily: "Inter, sans-serif",
                    fontWeight: 800,
                    letterSpacing: "0.04em",
                  }}
                  aria-label={`Say hello to ${member.display_name}`}
                >
                  {/* Square avatar — filled */}
                  <div
                    className="flex shrink-0 items-center justify-center font-bold"
                    style={{
                      width: "44px",
                      height: "44px",
                      backgroundColor: "#1A1A1A",
                      color: "#FFFFFF",
                      fontSize: "22px",
                      fontFamily: "Inter, sans-serif",
                    }}
                    aria-hidden="true"
                  >
                    {getInitials(member.display_name)}
                  </div>
                  <div className="flex flex-col items-start">
                    <span
                      className="font-bold uppercase"
                      style={{
                        fontSize: "20px",
                        fontFamily: "Inter, sans-serif",
                        fontWeight: 800,
                        letterSpacing: "0.03em",
                        color: "#1A1A1A",
                      }}
                    >
                      {member.display_name}
                    </span>
                    <span
                      className="font-mono uppercase"
                      style={{
                        fontSize: "14px",
                        color: "#1A1A1A",
                        opacity: 0.5,
                      }}
                    >
                      {member.relationship.replace("_", " ")}
                    </span>
                  </div>
                  {/* Crosshair marker instead of arrow emoji */}
                  <span
                    className="ml-auto font-mono"
                    style={{ fontSize: "24px", color: "#1A1A1A", opacity: 0.3 }}
                    aria-hidden="true"
                  >
                    +
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <p
              style={{
                fontSize: "20px",
                color: "#1A1A1A",
                opacity: 0.4,
              }}
            >
              YOUR FAMILY WILL APPEAR HERE ONCE THEY JOIN.
            </p>
          )}
        </section>

        {/* They've been thinking of you section */}
        <section className="mb-10">
          <h2
            className="mb-6 font-bold uppercase"
            style={{
              fontSize: "28px",
              fontWeight: 800,
              fontFamily: "Inter, sans-serif",
              letterSpacing: "0.06em",
              color: "#1A1A1A",
            }}
          >
            THEY&apos;VE BEEN THINKING OF YOU
          </h2>

          {pendingNudges.length > 0 ? (
            <div className="space-y-6">
              {pendingNudges.slice(0, 2).map((nudge) => {
                const fromName = nudge.from_name ?? "Someone";
                return (
                  <div
                    key={nudge.id}
                    className="p-6"
                    style={{
                      border: "2px solid #1A1A1A",
                      backgroundColor: "#F0EDE8",
                    }}
                  >
                    <p
                      className="mb-3 font-bold uppercase"
                      style={{
                        fontSize: "20px",
                        fontWeight: 800,
                        fontFamily: "Inter, sans-serif",
                        letterSpacing: "0.04em",
                        color: "#1A1A1A",
                      }}
                    >
                      {fromName}
                    </p>
                    <p
                      className="mb-5"
                      style={{
                        fontSize: "18px",
                        color: "#1A1A1A",
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
                        className="gp-response-btn w-full px-6 py-4 text-left font-bold uppercase"
                        style={{
                          minHeight: "64px",
                          fontSize: "18px",
                          fontWeight: 800,
                          fontFamily: "Inter, sans-serif",
                          letterSpacing: "0.04em",
                          backgroundColor: "#C8603A",
                          color: "#FFFFFF",
                          border: "2px solid #1A1A1A",
                        }}
                      >
                        SAY HELLO
                      </button>
                      <button
                        onClick={() => handleNudgeResponse(nudge, "call")}
                        className="gp-response-btn w-full px-6 py-4 text-left font-bold uppercase"
                        style={{
                          minHeight: "64px",
                          fontSize: "18px",
                          fontWeight: 800,
                          fontFamily: "Inter, sans-serif",
                          letterSpacing: "0.04em",
                          backgroundColor: "#FFFFFF",
                          color: "#1A1A1A",
                          border: "2px solid #1A1A1A",
                        }}
                      >
                        CALL ME?
                      </button>
                      <button
                        onClick={() => handleNudgeResponse(nudge, "note")}
                        className="gp-response-btn w-full px-6 py-4 text-left font-bold uppercase"
                        style={{
                          minHeight: "64px",
                          fontSize: "18px",
                          fontWeight: 800,
                          fontFamily: "Inter, sans-serif",
                          letterSpacing: "0.04em",
                          backgroundColor: "#FFFFFF",
                          color: "#1A1A1A",
                          border: "2px solid #1A1A1A",
                        }}
                      >
                        SEND A NOTE
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p
              style={{
                fontSize: "20px",
                color: "#1A1A1A",
                opacity: 0.4,
              }}
            >
              NO NEW MESSAGES RIGHT NOW. YOUR FAMILY IS STAYING IN TOUCH.
            </p>
          )}
        </section>

        {/* Back to standard dashboard */}
        <div
          className="mt-8 pt-6"
          style={{ borderTop: "2px solid #1A1A1A" }}
        >
          <a
            href="/"
            className="gp-back-link inline-flex items-center px-6 py-4 font-bold uppercase underline"
            style={{
              fontSize: "18px",
              color: "#1A1A1A",
              minHeight: "56px",
              fontFamily: "Inter, sans-serif",
              fontWeight: 800,
              letterSpacing: "0.04em",
            }}
          >
            BACK TO FAMILY HUB
          </a>
        </div>

        {/* Mode toggle at bottom */}
        <div
          className="mt-6 pt-6"
          style={{ borderTop: "2px solid #1A1A1A" }}
        >
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              setUIMode("standard");
              window.location.href = "/";
            }}
            className="inline-flex items-center px-6 py-4 font-bold uppercase"
            style={{
              fontSize: "16px",
              color: "#1A1A1A",
              opacity: 0.4,
              minHeight: "56px",
              fontFamily: "Inter, sans-serif",
              fontWeight: 800,
              letterSpacing: "0.04em",
            }}
          >
            SWITCH TO STANDARD VIEW
          </a>
        </div>
      </div>
    </main>
  );
}
