import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import {
  getFamilyGroup,
  getRelationshipSnapshot,
  getPendingNudges,
  generateNudge,
  acknowledgeNudge,
  getPairScores,
  getConversationStarters,
} from "~/lib/api";
import type { Nudge, ConversationStarter } from "~/lib/types";
import { getCurrentMemberId } from "~/lib/client-store";
import { NudgeCard, ConversationStarterPanel } from "~/components/NudgeCard";
import { ConnectionHealth } from "~/components/ConnectionHealth";
import { Icon } from "~/components/Icon";
import { HandDivider, PageTurn, SketchUnderline } from "~/components/Warm";

const loadGroupData = createServerFn({ method: "GET" })
  .validator((d: { groupId: string; memberId?: string }) => d)
  .handler(async ({ data }) => {
    const [group, relationships, scores] = await Promise.all([
      getFamilyGroup({ data: { groupId: data.groupId } }),
      getRelationshipSnapshot({ data: { groupId: data.groupId } }),
      getPairScores({ data: { groupId: data.groupId } }),
    ]);

    let nudges: Awaited<ReturnType<typeof getPendingNudges>> = [];
    if (data.memberId) {
      nudges = await getPendingNudges({ data: { memberId: data.memberId } });
    }

    return { group, relationships, scores, nudges };
  });

export const Route = createFileRoute("/group/$groupId")({
  loader: async () => null,
  component: GroupPage,
});

function GroupPage() {
  const { groupId } = Route.useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<Awaited<
    ReturnType<typeof loadGroupData>
  > | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  // Conversation starter sheet
  const [starterNudge, setStarterNudge] = useState<Nudge | null>(null);
  const [starters, setStarters] = useState<ConversationStarter[]>([]);
  const [starterLoading, setStarterLoading] = useState(false);

  useEffect(() => {
    load();
  }, [groupId]);

  async function load() {
    const memberId = getCurrentMemberId();
    try {
      const result = await loadGroupData({
        data: { groupId, memberId: memberId ?? undefined },
      });
      setData(result);
    } catch {
      // Will show fallback UI
    }
  }

  async function handleGenerateNudge() {
    setBusy(true);
    try {
      await generateNudge({ data: { groupId } });
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function handleAcknowledge(nudgeId: string) {
    await acknowledgeNudge({ data: { nudgeId } });
    await load();
  }

  async function handleDismiss(nudgeId: string) {
    await acknowledgeNudge({ data: { nudgeId } });
    await load();
  }

  async function handleGenerateStarters(nudge: Nudge) {
    setStarterNudge(nudge);
    setStarterLoading(true);
    setStarters([]);

    try {
      const toName = (nudge as Record<string, unknown>).to_name as string;
      const daysEstimate =
        nudge.nudge_type === "dormancy"
          ? 45
          : nudge.nudge_type === "cooling"
            ? 21
            : 10;

      const result = await getConversationStarters({
        data: {
          relationshipType: "family",
          daysSinceLastContact: daysEstimate,
          memberName: toName || "them",
        },
      });
      setStarters(result);
    } catch {
      setStarters([]);
    } finally {
      setStarterLoading(false);
    }
  }

  function handleCopyInvite(code: string) {
    const link = `${window.location.origin}/join/${code}`;
    navigator.clipboard.writeText(link).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  const { group, relationships, scores, nudges } = data ?? {};

  return (
    <PageTurn className="min-h-dvh">
      <main className="mx-auto w-full max-w-[480px] px-5 pt-2 pb-14 md:max-w-[700px] md:px-10">
        <button
          onClick={() => navigate({ to: "/dashboard" })}
          className="fh-body-sm fh-link inline-flex items-center"
          style={{ textDecoration: "none", color: "var(--color-fh-muted)" }}
        >
          ← Back to my family home
        </button>

        <header className="mt-6">
          <div className="flex items-center gap-4">
            <Icon name="members" size={32} />
            <div>
              <h1 className="fh-h2">{group?.name ?? "Your family"}</h1>
              <p className="fh-caption">
                {group?.members?.length ?? 0} member
                {(group?.members?.length ?? 0) !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
          <HandDivider className="mt-4" dot />
        </header>

        {!group && (
          <div className="fh-card mt-6 flex items-start gap-3">
            <Icon name="reminder" size={24} />
            <p className="fh-body-sm">
              Your family&apos;s data store isn&apos;t connected yet. Once it is,
              everyone will appear here.
            </p>
          </div>
        )}

        <div className="mt-7 flex flex-col gap-7">
          {/* Members */}
          <section className="fh-card">
            <h2 className="fh-h3 flex items-center gap-2.5">
              <Icon name="members" size={24} />
              Everyone
            </h2>
            <SketchUnderline className="mt-1.5" />
            {group?.members && group.members.length > 0 ? (
              <ul className="mt-5 flex flex-col gap-3">
                {group.members.map((m) => (
                  <li key={m.id} className="fh-nested flex items-center gap-3 p-3">
                    <span
                      aria-hidden="true"
                      className="flex shrink-0 items-center justify-center rounded-full font-[family-name:var(--font-body)] font-bold"
                      style={{
                        width: 40,
                        height: 40,
                        backgroundColor: "var(--color-fh-surface)",
                        border: "1px solid var(--color-fh-border)",
                        fontSize: "1rem",
                      }}
                    >
                      {m.display_name.charAt(0).toUpperCase()}
                    </span>
                    <div>
                      <p className="fh-body-sm font-bold">{m.display_name}</p>
                      <p className="fh-caption capitalize">
                        {m.relationship.replace("_", " ")} · {m.timezone}
                      </p>
                    </div>
                    {m.preferences?.ui_mode === "grandparent" && (
                      <span className="fh-chip ml-auto">
                        <Icon name="heart" size={16} />
                        Large text
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="fh-body-sm mt-4" style={{ color: "var(--color-fh-muted)" }}>
                No one has joined yet. Share the invite code below.
              </p>
            )}
          </section>

          {/* Invite */}
          <section className="fh-card">
            <h2 className="fh-h3 flex items-center gap-2.5">
              <Icon name="nudge" size={24} />
              Invite your family
            </h2>
            <SketchUnderline className="mt-1.5" />
            {group ? (
              <>
                <p className="fh-body-sm mt-4" style={{ color: "var(--color-fh-muted)" }}>
                  Share this invite code — it&apos;s how your family comes inside.
                </p>
                <p
                  className="mt-4 py-4 text-center font-[family-name:var(--font-heading)]"
                  style={{
                    backgroundColor: "var(--color-fh-surface-soft)",
                    border: "1px solid var(--color-fh-border)",
                    borderRadius: "var(--radius-input)",
                    fontSize: "1.75rem",
                    letterSpacing: "0.12em",
                    fontWeight: 600,
                    color: "var(--color-fh-body)",
                  }}
                >
                  {group.invite_code}
                </p>
                <button
                  onClick={() => handleCopyInvite(group.invite_code)}
                  className="fh-btn fh-btn-primary mt-4 w-full"
                >
                  <Icon name={copied ? "check" : "members"} size={20} />
                  {copied ? "Invite link copied" : "Copy the invite link"}
                </button>
              </>
            ) : (
              <p className="fh-body-sm mt-4" style={{ color: "var(--color-fh-muted)" }}>
                An invite code will appear here once your family home is set up.
              </p>
            )}
          </section>

          {/* Connection health */}
          <section className="fh-card">
            <h2 className="fh-h3 flex items-center gap-2.5">
              <Icon name="heart" size={24} />
              How we&apos;re doing
            </h2>
            <SketchUnderline className="mt-1.5" />
            {scores && scores.length > 0 ? (
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                {scores.map((s) => {
                  const memberA = group?.members?.find(
                    (m) => m.id === s.fromMemberId,
                  );
                  const memberB = group?.members?.find(
                    (m) => m.id === s.toMemberId,
                  );
                  return (
                    <ConnectionHealth
                      key={`${s.fromMemberId}-${s.toMemberId}`}
                      score={s}
                      nameA={memberA?.display_name ?? "Member A"}
                      nameB={memberB?.display_name ?? "Member B"}
                    />
                  );
                })}
              </div>
            ) : (
              <p className="fh-body-sm mt-4" style={{ color: "var(--color-fh-muted)" }}>
                No connection history yet. A gentle nudge is a good place to
                begin.
              </p>
            )}

            {/* Fallback: raw last-contact data */}
            {(!scores || scores.length === 0) &&
              relationships &&
              relationships.length > 0 && (
                <div className="mt-5">
                  <p className="fh-caption">Last time you spoke</p>
                  <ul className="mt-3 flex flex-col gap-2.5">
                    {relationships.map((r, i) => (
                      <li
                        key={i}
                        className="fh-nested flex items-center justify-between gap-3 p-3"
                      >
                        <span className="fh-body-sm">
                          {r.names[0]} ↔ {r.names[1]}
                        </span>
                        <span
                          className="fh-caption"
                          style={{
                            color:
                              r.daysSince === null || r.daysSince > 30
                                ? "var(--color-fh-status-error)"
                                : r.daysSince > 14
                                  ? "var(--color-fh-status-warn)"
                                  : "var(--color-fh-status-ok)",
                            fontWeight: 700,
                          }}
                        >
                          {r.daysSince === null
                            ? "Never"
                            : r.daysSince === 0
                              ? "Today"
                              : r.daysSince === 1
                                ? "Yesterday"
                                : `${r.daysSince} days ago`}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
          </section>

          {/* Nudges */}
          <section>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="fh-h3 flex items-center gap-2.5">
                <Icon name="nudge" size={24} />
                Gentle nudges
              </h2>
              <button
                onClick={handleGenerateNudge}
                disabled={busy}
                className="fh-btn fh-btn-sand"
                style={{ minHeight: 48 }}
              >
                <Icon name="bell" size={20} />
                {busy ? "Looking…" : "Look for quiet links"}
              </button>
            </div>

            {nudges && nudges.length > 0 ? (
              <ul className="mt-5 flex flex-col gap-5">
                {nudges.map((nudge) => {
                  const matchingScore = scores?.find(
                    (s) =>
                      (s.fromMemberId === nudge.from_member_id &&
                        s.toMemberId === nudge.to_member_id) ||
                      (s.fromMemberId === nudge.to_member_id &&
                        s.toMemberId === nudge.from_member_id),
                  );
                  const fromName = (nudge as Record<string, unknown>)
                    .from_name as string;
                  const toName = (nudge as Record<string, unknown>)
                    .to_name as string;

                  return (
                    <li key={nudge.id}>
                      <NudgeCard
                        nudge={nudge}
                        score={matchingScore}
                        fromName={fromName}
                        toName={toName}
                        onAcknowledge={handleAcknowledge}
                        onDismiss={handleDismiss}
                        onGenerateStarters={handleGenerateStarters}
                      />
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="fh-body-sm mt-4" style={{ color: "var(--color-fh-muted)" }}>
                Everyone looks well connected right now. Nudges will appear here
                when a relationship has gone quiet for a while.
              </p>
            )}
          </section>
        </div>

        <footer className="mt-12">
          <HandDivider className="mb-5" />
          <p className="fh-caption text-center">
            Every connection here is private — metadata only, never messages.
          </p>
        </footer>

        {/* Conversation starter sheet */}
        {starterNudge && (
          <>
            {starterLoading ? (
              <div className="fh-backdrop fixed inset-0 z-50 flex items-center justify-center">
                <div className="fh-sheet fh-card-soft">
                  <p className="fh-body-sm">Gathering a few gentle ideas…</p>
                </div>
              </div>
            ) : starters.length > 0 ? (
              <ConversationStarterPanel
                starters={starters}
                memberName={
                  ((starterNudge as Record<string, unknown>).to_name as
                    | string) ?? "them"
                }
                onClose={() => {
                  setStarterNudge(null);
                  setStarters([]);
                }}
              />
            ) : null}
          </>
        )}
      </main>
    </PageTurn>
  );
}
