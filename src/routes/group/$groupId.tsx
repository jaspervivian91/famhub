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
import type { Nudge, PairScore, ConversationStarter } from "~/lib/types";
import { getCurrentMemberId } from "~/lib/client-store";
import { NudgeCard, ConversationStarterPanel } from "~/components/NudgeCard";
import { ConnectionHealth } from "~/components/ConnectionHealth";

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
      nudges = await getPendingNudges({
        data: { memberId: data.memberId },
      });
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
  const [data, setData] = useState<
    Awaited<ReturnType<typeof loadGroupData>> | null
  >(null);
  const [busy, setBusy] = useState(false);

  // Conversation starter modal
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
        nudge.nudge_type === "dormancy" ? 45 : nudge.nudge_type === "cooling" ? 21 : 10;

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

  const { group, relationships, scores, nudges } = data ?? {};

  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <button
        onClick={() => navigate({ to: "/" })}
        className="mb-4 flex items-center gap-1 text-sm text-stone-400 hover:text-stone-600"
      >
        &larr; Back to Dashboard
      </button>

      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 text-2xl">
          &#x1F3E0;
        </div>
        <div>
          <h1 className="text-2xl font-bold text-amber-900">
            {group?.name ?? "Family Group"}
          </h1>
          <p className="text-sm text-stone-500">
            {group?.members?.length ?? 0} member
            {(group?.members?.length ?? 0) !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {!group && (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Database not connected. Connect DATABASE_URL and run the migration to get started.
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Members */}
        <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-stone-800">
            &#x1F465; Members
          </h2>
          {group?.members && group.members.length > 0 ? (
            <ul className="space-y-2">
              {group.members.map((m) => (
                <li
                  key={m.id}
                  className="flex items-center gap-3 rounded-lg bg-stone-50 p-3"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-200 text-sm font-bold text-amber-800">
                    {m.display_name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-stone-800">
                      {m.display_name}
                    </p>
                    <p className="text-xs text-stone-400 capitalize">
                      {m.relationship.replace("_", " ")} &middot; {m.timezone}
                    </p>
                  </div>
                  {m.preferences?.ui_mode === "grandparent" && (
                    <span className="ml-auto rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-600">
                      &#x1F474;
                    </span>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-stone-400">
              No members in this group yet.
            </p>
          )}
        </div>

        {/* Invite */}
        <div className="rounded-xl border border-teal-200 bg-teal-50/50 p-5 shadow-sm">
          <h2 className="mb-2 text-lg font-semibold text-teal-800">
            &#x1F4CB; Invite Family
          </h2>
          {group && (
            <>
              <p className="mb-3 text-sm text-teal-700">
                Share this invite code with your family:
              </p>
              <div className="mb-3 rounded-lg bg-white px-4 py-3 text-center font-mono text-2xl font-bold tracking-widest text-teal-800">
                {group.invite_code}
              </div>
              <button
                onClick={() => {
                  const link = `${window.location.origin}/join/${group.invite_code}`;
                  navigator.clipboard.writeText(link);
                  alert("Invite link copied!");
                }}
                className="w-full rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
              >
                Copy invite link
              </button>
            </>
          )}
        </div>

        {/* Connection Health (with scores) */}
        <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm md:col-span-2">
          <h2 className="mb-4 text-lg font-semibold text-stone-800">
            &#x1F49E; Connection Health
          </h2>
          {scores && scores.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {scores.map((s) => {
                const memberA = group?.members?.find(
                  (m) => m.id === s.fromMemberId,
                );
                const memberB = group?.members?.find(
                  (m) => m.id === s.toMemberId,
                );
                const nameA = memberA?.display_name ?? "Member A";
                const nameB = memberB?.display_name ?? "Member B";
                return (
                  <ConnectionHealth
                    key={`${s.fromMemberId}-${s.toMemberId}`}
                    score={s}
                    nameA={nameA}
                    nameB={nameB}
                  />
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-stone-400">
              No connection data yet. Generate nudges to start tracking relationships.
            </p>
          )}

          {/* Legacy relationships display (fallback when scores aren't available) */}
          {(!scores || scores.length === 0) && relationships && relationships.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-xs font-medium text-stone-500">
                Last contact (raw data):
              </p>
              {relationships.map((r, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-lg bg-stone-50 p-3"
                >
                  <span className="text-sm font-medium text-stone-700">
                    {r.names[0]} &harr; {r.names[1]}
                  </span>
                  <span
                    className={`rounded-full px-3 py-0.5 text-xs font-medium ${
                      r.daysSince === null
                        ? "bg-stone-200 text-stone-600"
                        : r.daysSince > 30
                          ? "bg-rose-100 text-rose-700"
                          : r.daysSince > 14
                            ? "bg-amber-100 text-amber-700"
                            : "bg-teal-100 text-teal-700"
                    }`}
                  >
                    {r.daysSince === null
                      ? "Never"
                      : r.daysSince === 0
                        ? "Today"
                        : r.daysSince === 1
                          ? "Yesterday"
                          : `${r.daysSince}d ago`}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Nudge Suggestions */}
        <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm md:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-stone-800">
              &#x1F48C; Nudge Suggestions
            </h2>
            <button
              onClick={handleGenerateNudge}
              disabled={busy}
              className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-50"
            >
              {busy ? "Checking..." : "Check for dormant links"}
            </button>
          </div>

          {nudges && nudges.length > 0 ? (
            <ul className="space-y-4">
              {nudges.map((nudge) => {
                const matchingScore = scores?.find(
                  (s) =>
                    (s.fromMemberId === nudge.from_member_id &&
                      s.toMemberId === nudge.to_member_id) ||
                    (s.fromMemberId === nudge.to_member_id &&
                      s.toMemberId === nudge.from_member_id),
                );
                const fromName =
                  (nudge as Record<string, unknown>).from_name as string;
                const toName =
                  (nudge as Record<string, unknown>).to_name as string;

                return (
                  <NudgeCard
                    key={nudge.id}
                    nudge={nudge}
                    score={matchingScore}
                    fromName={fromName}
                    toName={toName}
                    onAcknowledge={handleAcknowledge}
                    onDismiss={handleDismiss}
                    onGenerateStarters={handleGenerateStarters}
                  />
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-stone-400">
              All connections look healthy. Nudges will appear here when
              someone hasn&apos;t been in touch for a while.
            </p>
          )}
        </div>
      </div>

      {/* Conversation Starter Modal */}
      {starterNudge && (
        <>
          {starterLoading ? (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
              <div className="rounded-2xl bg-white p-6 shadow-xl">
                <p className="text-sm text-stone-500">
                  Generating conversation starters...
                </p>
              </div>
            </div>
          ) : starters.length > 0 ? (
            <ConversationStarterPanel
              starters={starters}
              memberName={
                ((starterNudge as Record<string, unknown>).to_name as string) ??
                "them"
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
  );
}
