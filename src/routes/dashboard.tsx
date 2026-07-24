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
  sendNudgeByEmail,
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
import { Logo } from "~/components/Logo";

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

export const Route = createFileRoute("/dashboard")({
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
  const [sendingEmailNudgeId, setSendingEmailNudgeId] = useState<
    string | null
  >(null);
  const [emailedNudgeIds, setEmailedNudgeIds] = useState<Set<string>>(
    new Set(),
  );

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
    navigate({ to: "/" });
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

  async function handleEmailNudge(nudgeId: string) {
    const memberId = getCurrentMemberId();
    if (!memberId) return;

    setSendingEmailNudgeId(nudgeId);
    try {
      const result = await sendNudgeByEmail({
        data: { nudgeId, memberId },
      });
      if (result.success) {
        setEmailedNudgeIds((prev) => new Set(prev).add(nudgeId));
      }
    } catch {
      // Best effort
    }
    setSendingEmailNudgeId(null);
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
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-fh-hearth/40">
            <Logo variant="icon" size="lg" />
          </div>
          <h1 className="font-[family-name:var(--font-heading)] text-3xl text-fh-heading">Family Hub</h1>
          <p className="mt-2 text-fh-muted">
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
          className="w-full rounded-xl border border-fh-border bg-white p-6 shadow-sm"
        >
          <h2 className="mb-4 font-[family-name:var(--font-heading)] text-lg text-fh-heading">
            Create your family hub
          </h2>
          <label
            htmlFor="create-name"
            className="mb-1 block text-sm font-medium text-fh-body"
          >
            Family name
          </label>
          <input
            id="create-name"
            type="text"
            value={createName}
            onChange={(e) => setCreateName(e.target.value)}
            placeholder="e.g. The Johnsons"
            className="w-full rounded-lg border border-fh-border px-4 py-3 text-fh-body placeholder-fh-muted focus:border-fh-ember focus:outline-none focus:ring-2 focus:ring-fh-hearth/50"
            required
          />
          <button
            type="submit"
            disabled={busy}
            className="mt-4 w-full rounded-lg bg-fh-ember px-4 py-3 font-semibold text-white hover:bg-fh-ember/90 focus:outline-none focus:ring-2 focus:ring-fh-hearth disabled:opacity-50"
          >
            {busy ? "Creating…" : "Create Family Hub"}
          </button>
        </form>

        <div className="flex w-full items-center gap-3">
          <div className="h-px flex-1 bg-fh-border" />
          <span className="text-sm text-fh-muted">or join existing</span>
          <div className="h-px flex-1 bg-fh-border" />
        </div>

        <form
          onSubmit={handleJoin}
          className="w-full rounded-xl border border-fh-border bg-white p-6 shadow-sm"
        >
          <h2 className="mb-4 font-[family-name:var(--font-heading)] text-lg text-fh-heading">
            Join a family hub
          </h2>
          <label
            htmlFor="join-code"
            className="mb-1 block text-sm font-medium text-fh-body"
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
            className="w-full rounded-lg border border-fh-border px-4 py-3 font-mono text-fh-body placeholder-fh-muted focus:border-fh-tide focus:outline-none focus:ring-2 focus:ring-fh-tide/20"
            required
          />
          <label
            htmlFor="join-name"
            className="mb-1 mt-3 block text-sm font-medium text-fh-body"
          >
            Your display name
          </label>
          <input
            id="join-name"
            type="text"
            value={joinName}
            onChange={(e) => setJoinName(e.target.value)}
            placeholder="e.g. Grandma Sue"
            className="w-full rounded-lg border border-fh-border px-4 py-3 text-fh-body placeholder-fh-muted focus:border-fh-tide focus:outline-none focus:ring-2 focus:ring-fh-tide/20"
            required
          />
          <label
            htmlFor="join-relationship"
            className="mb-1 mt-3 block text-sm font-medium text-fh-body"
          >
            Relationship
          </label>
          <select
            id="join-relationship"
            value={joinRelationship}
            onChange={(e) => setJoinRelationship(e.target.value)}
            className="w-full rounded-lg border border-fh-border px-4 py-3 text-fh-body focus:border-fh-tide focus:outline-none focus:ring-2 focus:ring-fh-tide/20"
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
            className="mt-4 w-full rounded-lg bg-fh-tide px-4 py-3 font-semibold text-white hover:bg-fh-tide/90 focus:outline-none focus:ring-2 focus:ring-fh-tide/30 disabled:opacity-50"
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
        <p className="text-fh-muted">Loading your family hub…</p>
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
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-fh-hearth/40">
            <Logo variant="icon" size="sm" />
          </div>
          <div>
            <h1 className="font-[family-name:var(--font-heading)] text-xl text-fh-heading">
              {group?.name ?? "Family Hub"}
            </h1>
            <p className="text-sm text-fh-muted">
              Welcome, {member?.display_name ?? getCurrentMemberName()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSignOut}
            className="rounded-lg px-3 py-1.5 text-sm text-fh-muted hover:bg-fh-surface hover:text-fh-body"
          >
            Sign out
          </button>
          <button
            onClick={handleLeaveGroup}
            className="rounded-lg px-3 py-1.5 text-sm text-fh-muted hover:bg-fh-surface hover:text-fh-body"
          >
            Leave
          </button>
        </div>
      </div>

      {/* DB not connected banner */}
      {!group && (
        <div className="mb-6 rounded-lg border border-fh-gold/30 bg-fh-gold/10 p-4 text-sm text-fh-heading">
          ⚠️ Database not connected yet. Once{" "}
          <code className="rounded bg-fh-gold/20 px-1 font-mono">
            DATABASE_URL
          </code>{" "}
          is set, your family hub will appear here. Run the migration at{" "}
          <code className="rounded bg-fh-gold/20 px-1 font-mono">
            src/db/migrations/001_schema.sql
          </code>{" "}
          to create the tables.
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Members Card */}
        <div className="rounded-xl border border-fh-border bg-white p-5 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 font-[family-name:var(--font-heading)] text-lg text-fh-heading">
            <span>👥</span> Family Members
          </h2>
          {group?.members && group.members.length > 0 ? (
            <ul className="space-y-3">
              {group.members.map((m) => (
                <li
                  key={m.id}
                  className="flex items-center gap-3 rounded-lg bg-fh-surface p-3"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-fh-hearth/60 text-sm font-bold text-fh-heading">
                    {m.display_name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-fh-body">
                      {m.display_name}
                      {m.id === member?.id ? " (you)" : ""}
                    </p>
                    <p className="text-xs text-fh-muted capitalize">
                      {m.relationship.replace("_", " ")}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-fh-muted">No members yet.</p>
          )}
          {group && (
            <button
              onClick={() => navigate({ to: `/group/${group.id}` })}
              className="mt-4 w-full rounded-lg border border-fh-tide/30 px-4 py-2 text-sm font-medium text-fh-tide hover:bg-fh-tide/10"
            >
              View Group Page →
            </button>
          )}
        </div>

        {/* Connection Health Card */}
        <div className="rounded-xl border border-fh-border bg-white p-5 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 font-[family-name:var(--font-heading)] text-lg text-fh-heading">
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
                <p className="text-xs text-fh-muted">
                  +{scores.length - 4} more connections —{" "}
                  {group && (
                    <button
                      onClick={() => navigate({ to: `/group/${group.id}` })}
                      className="text-fh-tide underline"
                    >
                      view all
                    </button>
                  )}
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-fh-muted">
              No connection data yet. Nudges will help build momentum.
            </p>
          )}
        </div>

        {/* Nudges Card */}
        <div className="rounded-xl border border-fh-border bg-white p-5 shadow-sm md:col-span-2">
          <h2 className="mb-4 flex items-center gap-2 font-[family-name:var(--font-heading)] text-lg text-fh-heading">
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
                  <li key={nudge.id} className="space-y-0">
                    <NudgeCard
                      nudge={nudge}
                      score={matchingScore}
                      fromName={fromName}
                      toName={toName}
                      onAcknowledge={handleAcknowledgeNudge}
                      onDismiss={handleDismissNudge}
                      onGenerateStarters={handleGenerateStarters}
                    />
                    <div className="flex justify-end px-1 pt-1">
                      {emailedNudgeIds.has(nudge.id) ? (
                        <span className="text-xs text-emerald-600">
                          ✅ Emailed!
                        </span>
                      ) : (
                        <button
                          onClick={() => handleEmailNudge(nudge.id)}
                          disabled={sendingEmailNudgeId === nudge.id}
                          className="text-xs text-fh-muted hover:text-fh-ember disabled:opacity-50"
                        >
                          {sendingEmailNudgeId === nudge.id
                            ? "Sending…"
                            : "🔔 Email me"}
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-fh-muted">
              No nudges right now — you&apos;re staying connected!
            </p>
          )}
        </div>

        {/* Weekly Digest Preview */}
        <DigestPreviewCard
          digest={groupData?.digest ?? undefined}
        />

        {/* Quick Actions */}
        <div className="rounded-xl border border-fh-border bg-white p-5 shadow-sm md:col-span-2">
          <h2 className="mb-4 flex items-center gap-2 font-[family-name:var(--font-heading)] text-lg text-fh-heading">
            <span>✨</span> Quick Actions
          </h2>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={async () => {
                if (!group?.id) return;
                await generateNudge({ data: { groupId: group.id } });
                await loadDashboard();
              }}
              className="rounded-lg border border-fh-dusk/30 px-4 py-2 text-sm font-medium text-fh-dusk hover:bg-fh-dusk/10"
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
                className="rounded-lg border border-fh-tide/30 px-4 py-2 text-sm font-medium text-fh-tide hover:bg-fh-tide/10"
              >
                📋 Copy invite link
              </button>
            )}
            <Link
              to="/digest"
              className="rounded-lg border border-fh-gold/40 px-4 py-2 text-sm font-medium text-fh-heading hover:bg-fh-gold/10"
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
                <p className="text-sm text-fh-muted">
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
      <div className="rounded-xl border border-fh-gold/30 bg-fh-gold/10 p-5 shadow-sm md:col-span-2">
        <h2 className="mb-3 flex items-center gap-2 font-[family-name:var(--font-heading)] text-lg text-fh-heading">
          <span>📋</span> Weekly Digest
        </h2>
        <p className="text-sm text-fh-body">
          Your weekly digest will be ready soon. It curates family moments,
          conversation starters, and connection insights — all in one place.
        </p>
        <Link
          to="/digest"
          className="mt-3 inline-block rounded-lg border border-fh-gold/40 px-4 py-2 text-sm font-medium text-fh-heading hover:bg-fh-gold/20"
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
    <div className="rounded-xl border border-fh-gold/30 bg-white p-5 shadow-sm md:col-span-2">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-[family-name:var(--font-heading)] text-lg text-fh-heading">
          <span>📋</span> Weekly Digest
        </h2>
        <span className="text-xs text-fh-muted">{weekLabel}</span>
      </div>

      {moments.length > 0 ? (
        <div className="space-y-2">
          {moments.map((moment, i) => (
            <div
              key={i}
              className="flex items-start gap-3 rounded-lg bg-fh-gold/10 p-3"
            >
              <span className="text-lg">{moment.emoji}</span>
              <p className="text-sm font-medium text-fh-body">
                {moment.text}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-fh-muted">
          Your digest is ready — view it for your full weekly summary.
        </p>
      )}

      <Link
        to="/digest"
        className="mt-4 inline-flex items-center gap-1 rounded-lg border border-fh-gold/40 bg-fh-gold/10 px-4 py-2 text-sm font-medium text-fh-heading hover:bg-fh-gold/20"
      >
        View full digest →
      </Link>
    </div>
  );
}
