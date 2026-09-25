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
import type { Digest, Nudge, ConversationStarter } from "~/lib/types";
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
import { Icon } from "~/components/Icon";
import {
  HandDivider,
  PageTurn,
  SectionHeading,
  SketchUnderline,
} from "~/components/Warm";

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
  const [sendingEmailNudgeId, setSendingEmailNudgeId] = useState<string | null>(
    null,
  );
  const [emailedNudgeIds, setEmailedNudgeIds] = useState<Set<string>>(
    new Set(),
  );
  const [inviteCopied, setInviteCopied] = useState(false);

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
      const result = await getDashboardData({ data: { memberId, groupId } });
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

  async function handleEmailNudge(nudgeId: string) {
    const memberId = getCurrentMemberId();
    if (!memberId) return;

    setSendingEmailNudgeId(nudgeId);
    try {
      const result = await sendNudgeByEmail({ data: { nudgeId, memberId } });
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

  async function handleCheckDormant(groupId: string) {
    await generateNudge({ data: { groupId } });
    await loadDashboard();
  }

  function handleCopyInvite(code: string) {
    navigator.clipboard
      .writeText(`${window.location.origin}/join/${code}`)
      .catch(() => {});
    setInviteCopied(true);
    setTimeout(() => setInviteCopied(false), 2500);
  }

  // ── No Group State ──────────────────────────────────────────────
  if (state === "no-group") {
    return (
      <PageTurn className="min-h-dvh">
        <main className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col items-center justify-center px-5 py-12 md:max-w-[600px] md:px-10">
          <div className="text-center">
            <Logo variant="icon" size="lg" className="mx-auto" />
            <h1 className="fh-h2 mt-5">Your family home</h1>
            <SketchUnderline className="mx-auto mt-2" />
            <p className="fh-body mt-4 max-w-[32ch]" style={{ color: "var(--color-fh-muted)" }}>
              Stay close to the people who matter — without social media.
            </p>
          </div>

          {error && (
            <p className="fh-alert-error mt-7 w-full" role="alert">
              {error}
            </p>
          )}

          <form onSubmit={handleCreate} className="mt-7 w-full">
            <div className="fh-card">
              <h2 className="fh-h3">Start a family home</h2>
              <p className="fh-body-sm mt-1" style={{ color: "var(--color-fh-muted)" }}>
                It takes a moment. Then invite the people you love.
              </p>
              <label htmlFor="create-name" className="fh-label mt-5 mb-1.5 block">
                What should we call your family?
              </label>
              <input
                id="create-name"
                type="text"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                placeholder="e.g. The Johnsons"
                className="fh-input"
                required
              />
              <button
                type="submit"
                disabled={busy}
                className="fh-btn fh-btn-primary mt-5 w-full"
              >
                {busy ? "Setting things up…" : "Create your family home"}
              </button>
            </div>
          </form>

          <div className="my-8 flex w-full items-center gap-4">
            <HandDivider className="flex-1" />
            <span className="fh-caption">or join an existing one</span>
            <HandDivider className="flex-1" />
          </div>

          <form onSubmit={handleJoin} className="w-full">
            <div className="fh-card">
              <h2 className="fh-h3">Join your family</h2>
              <p className="fh-body-sm mt-1" style={{ color: "var(--color-fh-muted)" }}>
                Use the invite code someone in your family sent you.
              </p>
              <label htmlFor="join-code" className="fh-label mt-5 mb-1.5 block">
                Invite code
              </label>
              <input
                id="join-code"
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="ABC123DE"
                maxLength={8}
                className="fh-input"
                required
              />
              <label htmlFor="join-name" className="fh-label mt-4 mb-1.5 block">
                What should your family call you?
              </label>
              <input
                id="join-name"
                type="text"
                value={joinName}
                onChange={(e) => setJoinName(e.target.value)}
                placeholder="e.g. Grandma Sue"
                className="fh-input"
                required
              />
              <label
                htmlFor="join-relationship"
                className="fh-label mt-4 mb-1.5 block"
              >
                Your relationship
              </label>
              <select
                id="join-relationship"
                value={joinRelationship}
                onChange={(e) => setJoinRelationship(e.target.value)}
                className="fh-input"
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
                className="fh-btn fh-btn-secondary mt-5 w-full"
              >
                {busy ? "Coming inside…" : "Join your family"}
              </button>
            </div>
          </form>
        </main>
      </PageTurn>
    );
  }

  // ── Loading State ──────────────────────────────────────────────
  if (state === "loading" || !authChecked) {
    return (
      <main className="flex min-h-dvh items-center justify-center">
        <p className="fh-body" style={{ color: "var(--color-fh-muted)" }}>
          Opening your family home…
        </p>
      </main>
    );
  }

  // ── Dashboard State ────────────────────────────────────────────
  const { group, member, nudges, scores } = groupData ?? {};
  const memberFirstName = (member?.display_name ?? getCurrentMemberName() ?? "there")
    .split(" ")[0];

  return (
    <PageTurn className="min-h-dvh">
      <main className="mx-auto w-full max-w-[480px] px-5 pt-2 pb-14 md:max-w-[700px] md:px-10">
        {/* ── Header ─────────────────────────────────────────────── */}
        <header>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <Logo variant="icon" size="md" />
              <div>
                <h1 className="fh-h2">{group?.name ?? "Family Core"}</h1>
                <p className="fh-caption mt-0.5">
                  Welcome back, {memberFirstName} ·{" "}
                  <button
                    onClick={handleSignOut}
                    className="fh-link fh-caption"
                    style={{ background: "none", border: "none", padding: 0 }}
                  >
                    sign out
                  </button>
                </p>
              </div>
            </div>
          </div>
          <HandDivider className="mt-3" dot />
        </header>

        {/* ── DB not connected notice ────────────────────────────── */}
        {!group && (
          <div className="fh-card mt-6 flex items-start gap-3">
            <Icon name="reminder" size={24} />
            <p className="fh-body-sm">
              Your family&apos;s data store isn&apos;t connected yet. Once it is,
              everyone&apos;s connections will appear here.
            </p>
          </div>
        )}

        <div className="mt-7 flex flex-col gap-7">
          {/* ── Nudges for you ───────────────────────────────────── */}
          <section>
            <SectionHeading
              underline={false}
              className="mb-4"
            >
              Nudges for you
            </SectionHeading>
            {nudges && nudges.length > 0 ? (
              <ul className="flex flex-col gap-5">
                {nudges.map((nudge, index) => {
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
                    <li
                      key={nudge.id}
                      className={`fh-reveal ${
                        index === 0
                          ? "fh-reveal-1"
                          : index === 1
                            ? "fh-reveal-2"
                            : index === 2
                              ? "fh-reveal-3"
                              : ""
                      }`}
                    >
                      <NudgeCard
                        nudge={nudge}
                        score={matchingScore}
                        fromName={fromName}
                        toName={toName}
                        onAcknowledge={handleAcknowledgeNudge}
                        onDismiss={handleDismissNudge}
                        onGenerateStarters={handleGenerateStarters}
                      />
                      <div className="mt-1 flex justify-end px-2">
                        {emailedNudgeIds.has(nudge.id) ? (
                          <span
                            className="fh-caption inline-flex items-center gap-1.5"
                            style={{ color: "var(--color-fh-status-ok)" }}
                          >
                            <Icon name="check" size={18} />
                            Emailed
                          </span>
                        ) : (
                          <button
                            onClick={() => handleEmailNudge(nudge.id)}
                            disabled={sendingEmailNudgeId === nudge.id}
                            className="fh-btn fh-btn-quiet fh-caption inline-flex items-center gap-1.5"
                            style={{ minHeight: 40 }}
                          >
                            <Icon name="bell" size={18} />
                            {sendingEmailNudgeId === nudge.id
                              ? "Sending…"
                              : "Email me this one"}
                          </button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="fh-card flex items-start gap-3">
                <Icon name="nudge" size={24} />
                <p className="fh-body-sm">
                  No nudges right now — you&apos;re staying close all on your own.
                </p>
              </div>
            )}
          </section>

          {/* ── Your family + connection health ──────────────────── */}
          <section className="grid gap-7 md:grid-cols-2">
            <div className="fh-card">
              <h2 className="fh-h3 flex items-center gap-2.5">
                <Icon name="members" size={24} />
                Your family
              </h2>
              <SketchUnderline className="mt-1.5" />
              {group?.members && group.members.length > 0 ? (
                <ul className="mt-5 flex flex-col gap-3">
                  {group.members.map((m) => (
                    <li
                      key={m.id}
                      className="fh-nested flex items-center gap-3 p-3"
                    >
                      <span
                        aria-hidden="true"
                        className="flex shrink-0 items-center justify-center rounded-full font-[family-name:var(--font-body)] font-bold"
                        style={{
                          width: 40,
                          height: 40,
                          backgroundColor: "var(--color-fh-surface)",
                          border: "1px solid var(--color-fh-border)",
                          color: "var(--color-fh-body)",
                          fontSize: "1rem",
                        }}
                      >
                        {m.display_name.charAt(0).toUpperCase()}
                      </span>
                      <div>
                        <p className="fh-body-sm font-bold">
                          {m.display_name}
                          {m.id === member?.id ? " (you)" : ""}
                        </p>
                        <p className="fh-caption capitalize">
                          {m.relationship.replace("_", " ")}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="fh-body-sm mt-4" style={{ color: "var(--color-fh-muted)" }}>
                  Your family will appear here once they join.
                </p>
              )}
              {group && (
                <button
                  onClick={() => navigate({ to: `/group/${group.id}` })}
                  className="fh-btn fh-btn-secondary mt-5 w-full"
                >
                  See everyone
                </button>
              )}
            </div>

            <div className="fh-card">
              <h2 className="fh-h3 flex items-center gap-2.5">
                <Icon name="heart" size={24} />
                How we&apos;re doing
              </h2>
              <SketchUnderline className="mt-1.5" />
              {scores && scores.length > 0 ? (
                <div className="mt-5 flex flex-col gap-2.5">
                  {scores.slice(0, 4).map((s) => {
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
                        compact
                      />
                    );
                  })}
                  {scores.length > 4 && group && (
                    <p className="fh-caption">
                      +{scores.length - 4} more connections —{" "}
                      <button
                        onClick={() => navigate({ to: `/group/${group.id}` })}
                        className="fh-link fh-caption"
                        style={{ background: "none", border: "none", padding: 0 }}
                      >
                        see all
                      </button>
                    </p>
                  )}
                </div>
              ) : (
                <p className="fh-body-sm mt-4" style={{ color: "var(--color-fh-muted)" }}>
                  No connection history yet. A gentle nudge is a good place to
                  begin.
                </p>
              )}
            </div>
          </section>

          {/* ── Weekly letter preview ────────────────────────────── */}
          <DigestPreviewCard digest={groupData?.digest ?? undefined} />

          {/* ── Little things ────────────────────────────────────── */}
          <section>
            <SectionHeading underline={false} className="mb-1">
              Little things
            </SectionHeading>
            <p className="fh-caption mb-4">Small gestures, done together.</p>
            <div className="flex flex-col gap-3">
              {group && (
                <button
                  onClick={() => handleCheckDormant(group.id)}
                  className="fh-btn fh-btn-sand w-full justify-start"
                >
                  <Icon name="bell" size={22} />
                  Check for dormant connections
                </button>
              )}
              {group && (
                <button
                  onClick={() => handleCopyInvite(group.invite_code)}
                  className="fh-btn fh-btn-sand w-full justify-start"
                >
                  <Icon name={inviteCopied ? "check" : "members"} size={22} />
                  {inviteCopied ? "Invite link copied" : "Copy the invite link"}
                </button>
              )}
              <Link
                to="/digest"
                className="fh-btn fh-btn-sand w-full justify-start"
              >
                <Icon name="checklist" size={22} />
                Read this week&apos;s letter
              </Link>
              <button
                onClick={handleLeaveGroup}
                className="fh-btn fh-btn-quiet w-full"
              >
                Leave this family home
              </button>
            </div>
          </section>
        </div>

        <footer className="mt-12">
          <HandDivider className="mb-5" />
          <p className="fh-caption text-center">
            Family Core · the app that puts your phone down
          </p>
        </footer>

        {/* ── Conversation starter sheet ─────────────────────────── */}
        {starterNudge && (
          <>
            {starterLoading ? (
              <div className="fh-backdrop fixed inset-0 z-50 flex items-center justify-center">
                <div className="fh-sheet fh-card-soft">
                  <p className="fh-body-sm">
                    Gathering a few gentle ideas…
                  </p>
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

// ═══════════════════════════════════════════════════════════════════
// Weekly letter preview card
// ═══════════════════════════════════════════════════════════════════

function DigestPreviewCard({ digest }: { digest?: Digest | null }) {
  const content = digest?.content as DigestContent | undefined;

  if (!content) {
    return (
      <section className="fh-card">
        <h2 className="fh-h3 flex items-center gap-2.5">
          <Icon name="checklist" size={24} />
          Your weekly letter
        </h2>
        <SketchUnderline className="mt-1.5" />
        <p className="fh-body-sm mt-4" style={{ color: "var(--color-fh-muted)" }}>
          Your first letter is being written. It gathers the week&apos;s small
          moments and a few things worth talking about.
        </p>
        <Link to="/digest" className="fh-btn fh-btn-sand mt-5 w-full">
          <Icon name="digest" size={22} />
          Preview this week&apos;s letter
        </Link>
      </section>
    );
  }

  const moments = content.momentsToMention?.slice(0, 2) ?? [];
  const weekLabel = content.weekLabel ?? "This week";

  return (
    <section className="fh-card">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="fh-h3 flex items-center gap-2.5">
          <Icon name="checklist" size={24} />
          Your weekly letter
        </h2>
        <span className="fh-caption">{weekLabel}</span>
      </div>
      <SketchUnderline className="mt-1.5" />
      <p className="fh-caption mt-3">
        This week&apos;s moments, gathered by hand.
      </p>

      {moments.length > 0 ? (
        <ul className="mt-4 flex flex-col gap-3">
          {moments.map((moment, i) => (
            <li key={i} className="fh-nested flex items-start gap-3 p-3">
              <Icon name="warm" size={22} />
              <p className="fh-body-sm">{moment.text}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="fh-body-sm mt-4" style={{ color: "var(--color-fh-muted)" }}>
          Your letter is ready — open it for the full week.
        </p>
      )}

      <Link to="/digest" className="fh-btn fh-btn-secondary mt-5 w-full">
        Open letter
      </Link>
    </section>
  );
}
