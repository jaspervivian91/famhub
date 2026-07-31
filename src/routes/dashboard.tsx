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
      <main
        className="mx-auto flex min-h-dvh max-w-[375px] flex-col items-center justify-center gap-8 px-6 py-12"
        style={{ backgroundColor: "#F5F0EB" }}
      >
        {/* Logo + wordmark */}
        <div className="text-center">
          <div className="mx-auto mb-4 flex items-center justify-center">
            <Logo variant="stacked" size="lg" />
          </div>
        </div>

        {/* Ruled line separator */}
        <div className="w-full border-t border-[#1A1A1A]" style={{ borderWidth: "0.5px" }} />

        {error && (
          <div
            className="w-full border border-[#C8603A] bg-[#F5F0EB] p-3 font-mono text-[11px] text-[#C8603A]"
            style={{ borderRadius: 0 }}
          >
            {error}
          </div>
        )}

        {/* Create form */}
        <form
          onSubmit={handleCreate}
          className="w-full border border-[#1A1A1A] bg-[#EDEDEA] p-6"
          style={{ borderRadius: 0 }}
        >
          <h2 className="mb-4 font-[Inter] text-[16px] font-bold uppercase tracking-[0.06em] text-[#1A1A1A]">
            CREATE YOUR FAMILY HUB
          </h2>
          <label
            htmlFor="create-name"
            className="mb-1 block font-mono text-[9px] uppercase tracking-[0.06em] text-[#1A1A1A]/50"
          >
            FAMILY NAME
          </label>
          <input
            id="create-name"
            type="text"
            value={createName}
            onChange={(e) => setCreateName(e.target.value)}
            placeholder="e.g. The Johnsons"
            className="w-full border border-[#1A1A1A] bg-[#F5F0EB] px-4 py-3 font-[Inter] text-[13px] text-[#1A1A1A] placeholder-[#1A1A1A]/30 focus:border-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]"
            style={{ borderRadius: 0 }}
            required
          />
          <button
            type="submit"
            disabled={busy}
            className="mt-4 w-full border-2 border-[#1A1A1A] bg-[#C8603A] px-4 py-3 font-[Inter] text-[13px] font-bold uppercase tracking-[0.04em] text-[#F5F0EB] hover:bg-[#C8603A]/90 focus:outline-none focus:ring-2 focus:ring-[#1A1A1A] disabled:opacity-50"
            style={{ borderRadius: 0 }}
          >
            {busy ? "CREATING…" : "CREATE FAMILY HUB"}
          </button>
        </form>

        {/* Divider */}
        <div className="flex w-full items-center gap-3">
          <div className="h-px flex-1 bg-[#1A1A1A]/20" />
          <span className="font-mono text-[9px] uppercase tracking-[0.06em] text-[#1A1A1A]/40">
            OR JOIN EXISTING
          </span>
          <div className="h-px flex-1 bg-[#1A1A1A]/20" />
        </div>

        {/* Join form */}
        <form
          onSubmit={handleJoin}
          className="w-full border border-[#1A1A1A] bg-[#EDEDEA] p-6"
          style={{ borderRadius: 0 }}
        >
          <h2 className="mb-4 font-[Inter] text-[16px] font-bold uppercase tracking-[0.06em] text-[#1A1A1A]">
            JOIN A FAMILY HUB
          </h2>
          <label
            htmlFor="join-code"
            className="mb-1 block font-mono text-[9px] uppercase tracking-[0.06em] text-[#1A1A1A]/50"
          >
            INVITE CODE
          </label>
          <input
            id="join-code"
            type="text"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            placeholder="ABC123DE"
            maxLength={8}
            className="w-full border border-[#1A1A1A] bg-[#F5F0EB] px-4 py-3 font-mono text-[13px] text-[#1A1A1A] placeholder-[#1A1A1A]/30 focus:border-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]"
            style={{ borderRadius: 0 }}
            required
          />
          <label
            htmlFor="join-name"
            className="mb-1 mt-3 block font-mono text-[9px] uppercase tracking-[0.06em] text-[#1A1A1A]/50"
          >
            YOUR DISPLAY NAME
          </label>
          <input
            id="join-name"
            type="text"
            value={joinName}
            onChange={(e) => setJoinName(e.target.value)}
            placeholder="e.g. Grandma Sue"
            className="w-full border border-[#1A1A1A] bg-[#F5F0EB] px-4 py-3 font-[Inter] text-[13px] text-[#1A1A1A] placeholder-[#1A1A1A]/30 focus:border-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]"
            style={{ borderRadius: 0 }}
            required
          />
          <label
            htmlFor="join-relationship"
            className="mb-1 mt-3 block font-mono text-[9px] uppercase tracking-[0.06em] text-[#1A1A1A]/50"
          >
            RELATIONSHIP
          </label>
          <select
            id="join-relationship"
            value={joinRelationship}
            onChange={(e) => setJoinRelationship(e.target.value)}
            className="w-full border border-[#1A1A1A] bg-[#F5F0EB] px-4 py-3 font-[Inter] text-[13px] text-[#1A1A1A] focus:border-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]"
            style={{ borderRadius: 0 }}
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
            className="mt-4 w-full border-2 border-[#1A1A1A] bg-[#1A1A1A] px-4 py-3 font-[Inter] text-[13px] font-bold uppercase tracking-[0.04em] text-[#F5F0EB] hover:bg-[#1A1A1A]/90 focus:outline-none focus:ring-2 focus:ring-[#1A1A1A] disabled:opacity-50"
            style={{ borderRadius: 0 }}
          >
            {busy ? "JOINING…" : "JOIN FAMILY HUB"}
          </button>
        </form>
      </main>
    );
  }

  // ── Loading State ──────────────────────────────────────────────
  if (state === "loading") {
    return (
      <main
        className="flex min-h-dvh items-center justify-center"
        style={{ backgroundColor: "#F5F0EB" }}
      >
        <p className="font-mono text-[11px] text-[#1A1A1A]/50">
          LOADING YOUR FAMILY HUB…
        </p>
      </main>
    );
  }

  // ── Dashboard State ────────────────────────────────────────────
  const { group, member, nudges, scores } = groupData ?? {};

  return (
    <main
      className="mx-auto max-w-[375px] px-6 py-8"
      style={{ backgroundColor: "#F5F0EB" }}
    >
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center" style={{ width: 44, height: 44 }}>
            <Logo variant="icon" size="md" />
          </div>
          <div>
            <h1 className="font-[Inter] text-[16px] font-bold uppercase tracking-[0.06em] text-[#1A1A1A]">
              {group?.name ?? "FAMILY HUB"}
            </h1>
            <p className="font-mono text-[9px] uppercase tracking-[0.03em] text-[#1A1A1A]/50">
              {member?.display_name ?? getCurrentMemberName()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleSignOut}
            className="border border-[#1A1A1A]/20 px-2 py-1 font-mono text-[9px] uppercase tracking-[0.06em] text-[#1A1A1A]/50 hover:bg-[#EDEDEA] hover:text-[#1A1A1A]"
            style={{ borderRadius: 0 }}
          >
            OUT
          </button>
          <button
            onClick={handleLeaveGroup}
            className="border border-[#1A1A1A]/20 px-2 py-1 font-mono text-[9px] uppercase tracking-[0.06em] text-[#1A1A1A]/50 hover:bg-[#EDEDEA] hover:text-[#1A1A1A]"
            style={{ borderRadius: 0 }}
          >
            LEAVE
          </button>
        </div>
      </div>

      {/* Ruled line separator */}
      <div className="mb-6 w-full border-t border-[#1A1A1A]" style={{ borderWidth: "0.5px" }} />

      {/* DB not connected banner */}
      {!group && (
        <div className="mb-6 border border-[#1A1A1A] bg-[#EDEDEA] p-4 font-mono text-[11px] text-[#1A1A1A]">
          DATABASE NOT CONNECTED YET. ONCE{" "}
          <code className="bg-[#F5F0EB] px-1 font-mono text-[11px]">DATABASE_URL</code>{" "}
          IS SET, YOUR FAMILY HUB WILL APPEAR HERE. RUN THE MIGRATION AT{" "}
          <code className="bg-[#F5F0EB] px-1 font-mono text-[11px]">src/db/migrations/001_schema.sql</code>{" "}
          TO CREATE THE TABLES.
        </div>
      )}

      <div className="flex flex-col gap-6">
        {/* Members Card */}
        <div className="border border-[#1A1A1A]/20 bg-[#EDEDEA] p-5" style={{ borderRadius: 0 }}>
          <h2 className="mb-4 font-[Inter] text-[13px] font-bold uppercase tracking-[0.06em] text-[#1A1A1A]">
            FAMILY MEMBERS
          </h2>
          {group?.members && group.members.length > 0 ? (
            <ul className="space-y-2">
              {group.members.map((m) => (
                <li
                  key={m.id}
                  className="flex items-center gap-3 border border-[#1A1A1A]/10 bg-[#F5F0EB] p-3"
                  style={{ borderRadius: 0 }}
                >
                  {/* Square avatar — 44x44, outlined */}
                  <div
                    className="flex shrink-0 items-center justify-center font-[Inter] text-[18px] font-bold uppercase text-[#1A1A1A]"
                    style={{
                      width: 44,
                      height: 44,
                      backgroundColor: "#EDEDEA",
                      border: "1.5px solid #1A1A1A",
                    }}
                  >
                    {m.display_name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-[Inter] text-[13px] font-semibold text-[#1A1A1A]">
                      {m.display_name}
                      {m.id === member?.id ? " (YOU)" : ""}
                    </p>
                    <p className="font-mono text-[9px] uppercase tracking-[0.06em] text-[#1A1A1A]/50">
                      {m.relationship.replace("_", " ")}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="font-mono text-[11px] text-[#1A1A1A]/50">NO MEMBERS YET.</p>
          )}
          {group && (
            <button
              onClick={() => navigate({ to: `/group/${group.id}` })}
              className="mt-4 w-full border border-[#1A1A1A] bg-transparent px-4 py-2 font-[Inter] text-[13px] font-bold uppercase tracking-[0.04em] text-[#1A1A1A] hover:bg-[#EDEDEA]"
              style={{ borderRadius: 0 }}
            >
              VIEW GROUP PAGE
            </button>
          )}
        </div>

        {/* Connection Health Card */}
        <div className="border border-[#1A1A1A]/20 bg-[#EDEDEA] p-5" style={{ borderRadius: 0 }}>
          <h2 className="mb-4 font-[Inter] text-[13px] font-bold uppercase tracking-[0.06em] text-[#1A1A1A]">
            CONNECTION HEALTH
          </h2>
          {scores && scores.length > 0 ? (
            <div className="space-y-2">
              {scores.slice(0, 4).map((s) => {
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
                <p className="font-mono text-[9px] text-[#1A1A1A]/50">
                  +{scores.length - 4} MORE CONNECTIONS —{" "}
                  {group && (
                    <button
                      onClick={() => navigate({ to: `/group/${group.id}` })}
                      className="font-mono text-[9px] underline text-[#1A1A1A]/70"
                    >
                      VIEW ALL
                    </button>
                  )}
                </p>
              )}
            </div>
          ) : (
            <p className="font-mono text-[11px] text-[#1A1A1A]/50">
              NO CONNECTION DATA YET. NUDGES WILL HELP BUILD MOMENTUM.
            </p>
          )}
        </div>

        {/* Nudges Card */}
        <div className="border border-[#1A1A1A]/20 bg-[#EDEDEA] p-5" style={{ borderRadius: 0 }}>
          <h2 className="mb-4 font-[Inter] text-[13px] font-bold uppercase tracking-[0.06em] text-[#1A1A1A]">
            NUDGES FOR YOU
          </h2>
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
                        <span className="font-mono text-[9px] uppercase tracking-[0.06em] text-[#1A1A1A]/50">
                          EMAILED
                        </span>
                      ) : (
                        <button
                          onClick={() => handleEmailNudge(nudge.id)}
                          disabled={sendingEmailNudgeId === nudge.id}
                          className="font-mono text-[9px] uppercase tracking-[0.06em] text-[#1A1A1A]/50 hover:text-[#C8603A] disabled:opacity-50"
                        >
                          {sendingEmailNudgeId === nudge.id
                            ? "SENDING…"
                            : "EMAIL ME"}
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="font-mono text-[11px] text-[#1A1A1A]/50">
              NO NUDGES RIGHT NOW — YOU&apos;RE STAYING CONNECTED.
            </p>
          )}
        </div>

        {/* Weekly Digest Preview */}
        <DigestPreviewCard
          digest={groupData?.digest ?? undefined}
        />

        {/* Quick Actions */}
        <div className="border border-[#1A1A1A]/20 bg-[#EDEDEA] p-5" style={{ borderRadius: 0 }}>
          <h2 className="mb-4 font-[Inter] text-[13px] font-bold uppercase tracking-[0.06em] text-[#1A1A1A]">
            QUICK ACTIONS
          </h2>
          <div className="flex flex-col gap-2">
            <button
              onClick={async () => {
                if (!group?.id) return;
                await generateNudge({ data: { groupId: group.id } });
                await loadDashboard();
              }}
              className="border border-[#1A1A1A] bg-transparent px-4 py-2 font-[Inter] text-[13px] font-bold uppercase tracking-[0.04em] text-[#1A1A1A] hover:bg-[#EDEDEA]"
              style={{ borderRadius: 0 }}
            >
              CHECK FOR DORMANT CONNECTIONS
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
                className="border border-[#1A1A1A] bg-transparent px-4 py-2 font-[Inter] text-[13px] font-bold uppercase tracking-[0.04em] text-[#1A1A1A] hover:bg-[#EDEDEA]"
                style={{ borderRadius: 0 }}
              >
                COPY INVITE LINK
              </button>
            )}
            <Link
              to="/digest"
              className="border border-[#1A1A1A] bg-transparent px-4 py-2 font-[Inter] text-[13px] font-bold uppercase tracking-[0.04em] text-[#1A1A1A] hover:bg-[#EDEDEA]"
              style={{ borderRadius: 0 }}
            >
              VIEW WEEKLY DIGEST
            </Link>
          </div>
        </div>
      </div>

      {/* Conversation Starter Modal */}
      {starterNudge && (
        <>
          {starterLoading ? (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1A1A1A]/30">
              <div className="border-2 border-[#1A1A1A] bg-[#F5F0EB] p-6" style={{ borderRadius: 0 }}>
                <p className="font-mono text-[11px] text-[#1A1A1A]/50">
                  GENERATING CONVERSATION STARTERS…
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
      <div className="border border-[#1A1A1A]/20 bg-[#EDEDEA] p-5" style={{ borderRadius: 0 }}>
        <h2 className="mb-3 font-[Inter] text-[13px] font-bold uppercase tracking-[0.06em] text-[#1A1A1A]">
          WEEKLY DIGEST
        </h2>
        <p className="font-mono text-[11px] text-[#1A1A1A]/50">
          YOUR WEEKLY DIGEST WILL BE READY SOON. IT CURATES FAMILY MOMENTS,
          CONVERSATION STARTERS, AND CONNECTION INSIGHTS — ALL IN ONE PLACE.
        </p>
        <Link
          to="/digest"
          className="mt-3 inline-block border border-[#1A1A1A] bg-transparent px-4 py-2 font-[Inter] text-[13px] font-bold uppercase tracking-[0.04em] text-[#1A1A1A] hover:bg-[#EDEDEA]"
          style={{ borderRadius: 0 }}
        >
          PREVIEW DIGEST
        </Link>
      </div>
    );
  }

  // Has digest — show preview
  const moments = content.momentsToMention?.slice(0, 2) ?? [];
  const weekLabel = content.weekLabel ?? "THIS WEEK";

  return (
    <div className="border border-[#1A1A1A]/20 bg-[#EDEDEA] p-5" style={{ borderRadius: 0 }}>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-[Inter] text-[13px] font-bold uppercase tracking-[0.06em] text-[#1A1A1A]">
          WEEKLY DIGEST
        </h2>
        <span className="font-mono text-[9px] uppercase tracking-[0.03em] text-[#1A1A1A]/50">
          {weekLabel}
        </span>
      </div>

      {moments.length > 0 ? (
        <div className="space-y-2">
          {moments.map((moment, i) => (
            <div
              key={i}
              className="flex items-start gap-3 border border-[#1A1A1A]/10 bg-[#F5F0EB] p-3"
              style={{ borderRadius: 0 }}
            >
              {/* Square dot marker */}
              <span className="mt-1 block h-2 w-2 shrink-0 bg-[#1A1A1A]" style={{ borderRadius: 0 }} aria-hidden="true" />
              <p className="font-[Inter] text-[13px] font-normal text-[#1A1A1A]">
                {moment.text}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="font-mono text-[11px] text-[#1A1A1A]/50">
          YOUR DIGEST IS READY — VIEW IT FOR YOUR FULL WEEKLY SUMMARY.
        </p>
      )}

      <Link
        to="/digest"
        className="mt-4 inline-flex items-center border border-[#1A1A1A] bg-transparent px-4 py-2 font-[Inter] text-[13px] font-bold uppercase tracking-[0.04em] text-[#1A1A1A] hover:bg-[#EDEDEA]"
        style={{ borderRadius: 0 }}
      >
        VIEW FULL DIGEST
      </Link>
    </div>
  );
}
