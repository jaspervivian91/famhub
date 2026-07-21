import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import {
  createFamilyGroup,
  generateNudge,
  getFamilyGroup,
  getPendingNudges,
  getMemberById,
  acknowledgeNudge,
  joinFamilyGroup,
  getPairScores,
  getConversationStarters,
} from "~/lib/api";
import { getMe, signOut } from "~/lib/auth-api";
import { getMyDigest } from "~/lib/api-digest";
import type { Digest, Nudge, PairScore, ConversationStarter } from "~/lib/types";
import type { DigestContent } from "~/lib/digest-engine";
import {
  getCurrentMemberId,
  getCurrentGroupId,
  getCurrentMemberName,
  setCurrentIdentity,
  clearCurrentIdentity,
  clearAllIdentity,
  setCachedAccount,
} from "~/lib/client-store";
import { NudgeCard, ConversationStarterPanel } from "~/components/NudgeCard";
import { ConnectionHealth } from "~/components/ConnectionHealth";

// Loader: fetch group if identity is stored
const getDashboardData = createServerFn({ method: "GET" })
  .validator((d: { memberId?: string; groupId?: string }) => d)
  .handler(async ({ data }) => {
    if (!data.groupId || !data.memberId) return null;

    const [group, member, nudges, scores, digest] = await Promise.all([
      getFamilyGroup({ data: { groupId: data.groupId } }),
      getMemberById({ data: { memberId: data.memberId } }),
      getPendingNudges({ data: { memberId: data.memberId } }),
      getPairScores({ data: { groupId: data.groupId } }),
      getMyDigest({ data: { groupId: data.groupId, memberId: data.memberId } }),
    ]);

    return { group, member, nudges, scores, digest };
  });

export const Route = createFileRoute("/")({
  loader: async () => null,
  component: Dashboard,
});

function Dashboard() {
  const navigate = useNavigate();
  const [authChecked, setAuthChecked] = useState(false);
  const [state, setState] = useState<"loading" | "no-group" | "dashboard">(
    "loading",
  );
  const [groupData, setGroupData] = useState<
    Awaited<ReturnType<typeof getDashboardData>> | null
  >(null);
  const [createName, setCreateName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [joinName, setJoinName] = useState("");
  const [joinRelationship, setJoinRelationship] = useState("family");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Conversation starter modal state
  const [starterNudge, setStarterNudge] = useState<Nudge | null>(null);
  const [starters, setStarters] = useState<ConversationStarter[]>([]);
  const [starterLoading, setStarterLoading] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const account = await getMe();
      if (!account) {
        navigate({ to: "/sign-in" });
        return;
      }
      // Cache auth info for fast subsequent renders
      setCachedAccount(account.id, account.email, account.display_name);
      setAuthChecked(true);
      loadDashboard();
    } catch {
      navigate({ to: "/sign-in" });
    }
  }

  async function handleSignOut() {
    try {
      await signOut();
    } catch {
      // Ignore errors — clear local state regardless
    }
    clearAllIdentity();
    navigate({ to: "/sign-in" });
  }

  async function loadDashboard() {
    const memberId = getCurrentMemberId();
    const groupId = getCurrentGroupId();

    if (!memberId || !groupId) {
      setState("no-group");
      return;
    }

    try {
      const result = await getDashboardData({
        data: { memberId, groupId },
      });
      if (result?.group) {
        setGroupData(result);
        setState("dashboard");
      } else {
        clearCurrentIdentity();
        setState("no-group");
      }
    } catch {
      setState("no-group");
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!createName.trim()) return;
    setBusy(true);
    setError("");

    try {
      const group = await createFamilyGroup({ data: { name: createName } });
      const result = await joinFamilyGroup({
        data: {
          inviteCode: group.invite_code,
          displayName: "You",
          relationship: "parent",
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
      });
      setCurrentIdentity(
        result.member.id,
        result.group.id,
        result.member.display_name,
      );
      await loadDashboard();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (!joinCode.trim() || !joinName.trim()) return;
    setBusy(true);
    setError("");

    try {
      const result = await joinFamilyGroup({
        data: {
          inviteCode: joinCode.trim().toUpperCase(),
          displayName: joinName.trim(),
          relationship: joinRelationship,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
      });
      setCurrentIdentity(
        result.member.id,
        result.group.id,
        result.member.display_name,
      );
      await loadDashboard();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function handleAcknowledgeNudge(nudgeId: string) {
    await acknowledgeNudge({ data: { nudgeId } });
    await loadDashboard();
  }

  async function handleDismissNudge(nudgeId: string) {
    // Dismiss is same as acknowledge for now
    await acknowledgeNudge({ data: { nudgeId } });
    await loadDashboard();
  }

  async function handleGenerateStarters(nudge: Nudge) {
    setStarterNudge(nudge);
    setStarterLoading(true);
    setStarters([]);

    try {
      const toName =
        (nudge as Record<string, unknown>).to_name as string;
      // Estimate days since based on nudge type
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

  function handleLeaveGroup() {
    clearCurrentIdentity();
    setGroupData(null);
    setState("no-group");
  }

  // ── No Group State ──────────────────────────────────────────────
  if (state === "no-group") {
    return (
      <main className="mx-auto flex min-h-dvh max-w-lg flex-col items-center justify-center gap-8 px-6 py-12">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100 text-3xl">
            🏠
          </div>
          <h1 className="text-3xl font-bold text-amber-900">Family Hub</h1>
          <p className="mt-2 text-stone-500">
            Stay close to the people who matter — without social media.
          </p>
        </div>

        {error && (
          <div className="w-full rounded-lg bg-rose-50 p-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        <form
          onSubmit={handleCreate}
          className="w-full rounded-xl border border-amber-200 bg-white p-6 shadow-sm"
        >
          <h2 className="mb-4 text-lg font-semibold text-amber-800">
            Create your family hub
          </h2>
          <label
            htmlFor="create-name"
            className="mb-1 block text-sm font-medium text-stone-600"
          >
            Family name
          </label>
          <input
            id="create-name"
            type="text"
            value={createName}
            onChange={(e) => setCreateName(e.target.value)}
            placeholder="e.g. The Johnsons"
            className="w-full rounded-lg border border-stone-300 px-4 py-3 text-stone-900 placeholder-stone-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200"
            required
          />
          <button
            type="submit"
            disabled={busy}
            className="mt-4 w-full rounded-lg bg-amber-600 px-4 py-3 font-semibold text-white hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-300 disabled:opacity-50"
          >
            {busy ? "Creating…" : "Create Family Hub"}
          </button>
        </form>

        <div className="flex w-full items-center gap-3">
          <div className="h-px flex-1 bg-stone-200" />
          <span className="text-sm text-stone-400">or join existing</span>
          <div className="h-px flex-1 bg-stone-200" />
        </div>

        <form
          onSubmit={handleJoin}
          className="w-full rounded-xl border border-teal-200 bg-white p-6 shadow-sm"
        >
          <h2 className="mb-4 text-lg font-semibold text-teal-800">
            Join a family hub
          </h2>
          <label
            htmlFor="join-code"
            className="mb-1 block text-sm font-medium text-stone-600"
          >
            Invite code
          </label>
          <input
            id="join-code"
            type="text"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            placeholder="ABC123DE"
            maxLength={8}
            className="w-full rounded-lg border border-stone-300 px-4 py-3 font-mono text-stone-900 placeholder-stone-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-200"
            required
          />
          <label
            htmlFor="join-name"
            className="mb-1 mt-3 block text-sm font-medium text-stone-600"
          >
            Your display name
          </label>
          <input
            id="join-name"
            type="text"
            value={joinName}
            onChange={(e) => setJoinName(e.target.value)}
            placeholder="e.g. Grandma Sue"
            className="w-full rounded-lg border border-stone-300 px-4 py-3 text-stone-900 placeholder-stone-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-200"
            required
          />
          <label
            htmlFor="join-relationship"
            className="mb-1 mt-3 block text-sm font-medium text-stone-600"
          >
            Relationship
          </label>
          <select
            id="join-relationship"
            value={joinRelationship}
            onChange={(e) => setJoinRelationship(e.target.value)}
            className="w-full rounded-lg border border-stone-300 px-4 py-3 text-stone-900 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-200"
          >
            <option value="grandparent">Grandparent</option>
            <option value="parent">Parent</option>
            <option value="child">Child</option>
            <option value="aunt_uncle">Aunt / Uncle</option>
            <option value="cousin">Cousin</option>
            <option value="family">Family</option>
          </select>
          <button
            type="submit"
            disabled={busy}
            className="mt-4 w-full rounded-lg bg-teal-600 px-4 py-3 font-semibold text-white hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-300 disabled:opacity-50"
          >
            {busy ? "Joining…" : "Join Family Hub"}
          </button>
        </form>
      </main>
    );
  }

  // ── Loading State ──────────────────────────────────────────────
  if (state === "loading") {
    return (
      <main className="flex min-h-dvh items-center justify-center">
        <p className="text-stone-400">Loading your family hub…</p>
      </main>
    );
  }

  // ── Dashboard State ────────────────────────────────────────────
  const { group, member, nudges, scores } = groupData ?? {};

  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-xl">
            🏠
          </div>
          <div>
            <h1 className="text-xl font-bold text-amber-900">
              {group?.name ?? "Family Hub"}
            </h1>
            <p className="text-sm text-stone-500">
              Welcome, {member?.display_name ?? getCurrentMemberName()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSignOut}
            className="rounded-lg px-3 py-1.5 text-sm text-stone-400 hover:bg-stone-100 hover:text-stone-600"
          >
            Sign out
          </button>
          <button
            onClick={handleLeaveGroup}
            className="rounded-lg px-3 py-1.5 text-sm text-stone-400 hover:bg-stone-100 hover:text-stone-600"
          >
            Leave
          </button>
        </div>
      </div>

      {/* DB not connected banner */}
      {!group && (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          ⚠️ Database not connected yet. Once{" "}
          <code className="rounded bg-amber-100 px-1 font-mono">
            DATABASE_URL
          </code>{" "}
          is set, your family hub will appear here. Run the migration at{" "}
          <code className="rounded bg-amber-100 px-1 font-mono">
            src/db/migrations/001_schema.sql
          </code>{" "}
          to create the tables.
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Members Card */}
        <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-stone-800">
            <span>👥</span> Family Members
          </h2>
          {group?.members && group.members.length > 0 ? (
            <ul className="space-y-3">
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
                      {m.id === member?.id ? " (you)" : ""}
                    </p>
                    <p className="text-xs text-stone-400 capitalize">
                      {m.relationship.replace("_", " ")}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-stone-400">No members yet.</p>
          )}
          {group && (
            <button
              onClick={() => navigate({ to: `/group/${group.id}` })}
              className="mt-4 w-full rounded-lg border border-teal-200 px-4 py-2 text-sm font-medium text-teal-700 hover:bg-teal-50"
            >
              View Group Page →
            </button>
          )}
        </div>

        {/* Connection Health Card */}
        <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-stone-800">
            <span>💞</span> Connection Health
          </h2>
          {scores && scores.length > 0 ? (
            <div className="space-y-2">
              {scores.slice(0, 4).map((s) => {
                // Find names from group members if available
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
                    compact
                  />
                );
              })}
              {scores.length > 4 && (
                <p className="text-xs text-stone-400">
                  +{scores.length - 4} more connections —{" "}
                  {group && (
                    <button
                      onClick={() => navigate({ to: `/group/${group.id}` })}
                      className="text-teal-600 underline"
                    >
                      view all
                    </button>
                  )}
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-stone-400">
              No connection data yet. Nudges will help build momentum.
            </p>
          )}
        </div>

        {/* Nudges Card */}
        <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm md:col-span-2">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-stone-800">
            <span>💌</span> Nudges for You
          </h2>
          {nudges && nudges.length > 0 ? (
            <ul className="space-y-4">
              {nudges.map((nudge) => {
                // Try to find matching score for this nudge
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
                    onAcknowledge={handleAcknowledgeNudge}
                    onDismiss={handleDismissNudge}
                    onGenerateStarters={handleGenerateStarters}
                  />
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-stone-400">
              No nudges right now — you&apos;re staying connected!
            </p>
          )}
        </div>

        {/* Weekly Digest Preview */}
        <DigestPreviewCard
          digest={groupData?.digest ?? undefined}
        />

        {/* Quick Actions */}
        <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm md:col-span-2">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-stone-800">
            <span>✨</span> Quick Actions
          </h2>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={async () => {
                if (!group?.id) return;
                await generateNudge({ data: { groupId: group.id } });
                await loadDashboard();
              }}
              className="rounded-lg border border-rose-200 px-4 py-2 text-sm font-medium text-rose-700 hover:bg-rose-50"
            >
              🔔 Check for dormant connections
            </button>
            {group && (
              <button
                onClick={() => {
                  const code = group.invite_code;
                  navigator.clipboard.writeText(
                    `${window.location.origin}/join/${code}`,
                  );
                  alert("Invite link copied!");
                }}
                className="rounded-lg border border-teal-200 px-4 py-2 text-sm font-medium text-teal-700 hover:bg-teal-50"
              >
                📋 Copy invite link
              </button>
            )}
            <Link
              to="/digest"
              className="rounded-lg border border-amber-200 px-4 py-2 text-sm font-medium text-amber-700 hover:bg-amber-50"
            >
              📋 View Weekly Digest
            </Link>
          </div>
        </div>
      </div>

      {/* Conversation Starter Modal */}
      {starterNudge && (
        <>
          {starterLoading ? (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
              <div className="rounded-2xl bg-white p-6 shadow-xl">
                <p className="text-sm text-stone-500">
                  Generating conversation starters…
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

// ═══════════════════════════════════════════════════════════════════
// Digest Preview Card
// ═══════════════════════════════════════════════════════════════════

function DigestPreviewCard({
  digest,
}: {
  digest?: Digest | null;
}) {
  const content = digest?.content as DigestContent | undefined;

  // No digest at all
  if (!content) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 shadow-sm md:col-span-2">
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-amber-800">
          <span>📋</span> Weekly Digest
        </h2>
        <p className="text-sm text-amber-700">
          Your weekly digest will be ready soon. It curates family moments,
          conversation starters, and connection insights — all in one place.
        </p>
        <Link
          to="/digest"
          className="mt-3 inline-block rounded-lg border border-amber-300 px-4 py-2 text-sm font-medium text-amber-800 hover:bg-amber-100"
        >
          Preview digest →
        </Link>
      </div>
    );
  }

  // Has digest — show preview
  const moments = content.momentsToMention?.slice(0, 2) ?? [];
  const weekLabel = content.weekLabel ?? "This week";

  return (
    <div className="rounded-xl border border-amber-200 bg-white p-5 shadow-sm md:col-span-2">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-amber-800">
          <span>📋</span> Weekly Digest
        </h2>
        <span className="text-xs text-stone-400">{weekLabel}</span>
      </div>

      {moments.length > 0 ? (
        <div className="space-y-2">
          {moments.map((moment, i) => (
            <div
              key={i}
              className="flex items-start gap-3 rounded-lg bg-amber-50 p-3"
            >
              <span className="text-lg">{moment.emoji}</span>
              <p className="text-sm font-medium text-stone-700">
                {moment.text}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-stone-400">
          Your digest is ready — view it for your full weekly summary.
        </p>
      )}

      <Link
        to="/digest"
        className="mt-4 inline-flex items-center gap-1 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-800 hover:bg-amber-100"
      >
        View full digest →
      </Link>
    </div>
  );
}
