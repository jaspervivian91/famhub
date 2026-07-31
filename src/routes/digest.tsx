import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getUIMode } from "~/lib/ui-mode";
import {
  getCurrentMemberId,
  getCurrentGroupId,
  getCurrentMemberName,
} from "~/lib/client-store";
import {
  getMyDigest,
  generateMyDigest,
  updateDigestPreference,
  sendDigestByEmail,
} from "~/lib/api-digest";
import type { Digest } from "~/lib/types";
import type {
  DigestContent,
  DigestPairSnapshot,
  DigestMoment,
  DigestIRLNudge,
} from "~/lib/digest-engine";
import { ScoreDot } from "~/components/ScoreIndicator";
import { CATEGORY_LABEL } from "~/lib/conversation-starters";
import { Logo } from "~/components/Logo";

export const Route = createFileRoute("/digest")({
  component: DigestPage,
});

function DigestPage() {
  const [uiMode, setUIMode] = useState<"standard" | "grandparent">("standard");
  const [digest, setDigest] = useState<Digest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [emailPref, setEmailPref] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const memberId = typeof window !== "undefined" ? getCurrentMemberId() : null;
  const groupId = typeof window !== "undefined" ? getCurrentGroupId() : null;

  useEffect(() => {
    setUIMode(getUIMode());
  }, []);

  useEffect(() => {
    loadDigest();
  }, []);

  async function loadDigest() {
    if (!memberId || !groupId) {
      setLoading(true);
      try {
        const result = await generateMyDigest({
          data: { groupId: "preview", memberId: "preview-user" },
        });
        setDigest(result ?? null);
      } catch {
        // Will fall through to empty state
      }
      setLoading(false);
      return;
    }

    try {
      const result = await getMyDigest({
        data: { groupId, memberId },
      });
      setDigest(result ?? null);
    } catch {
      setError("Could not load your digest.");
    }
    setLoading(false);
  }

  async function handleGenerate() {
    if (!memberId || !groupId) {
      setGenerating(true);
      try {
        const result = await generateMyDigest({
          data: { groupId: "preview", memberId: "preview-user" },
        });
        setDigest(result ?? null);
      } catch {
        setError("Could not generate digest.");
      }
      setGenerating(false);
      return;
    }

    setGenerating(true);
    try {
      const result = await generateMyDigest({
        data: { groupId, memberId },
      });
      setDigest(result ?? null);
    } catch {
      setError("Could not generate digest.");
    }
    setGenerating(false);
  }

  async function handleToggleEmail() {
    if (!memberId) return;
    const next = !emailPref;
    setEmailPref(next);
    try {
      await updateDigestPreference({
        data: { memberId, receiveEmail: next },
      });
    } catch {
      // Best effort
    }
  }

  async function handleSendDigestEmail() {
    if (!memberId || !groupId) return;
    setSendingEmail(true);
    setEmailSent(false);
    try {
      const result = await sendDigestByEmail({
        data: { groupId, memberId },
      });
      if (result.success) {
        setEmailSent(true);
      } else {
        setError(result.error ?? "Could not send email");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send email");
    }
    setSendingEmail(false);
  }

  const isGrandparent = uiMode === "grandparent";
  const content = digest?.content as DigestContent | undefined;

  // ── Loading state ──────────────────────────────────────────────
  if (loading) {
    return (
      <main
        className={
          isGrandparent
            ? "mx-auto max-w-[375px] px-6 py-8 gp-body"
            : "mx-auto max-w-[375px] px-6 py-8"
        }
        style={isGrandparent ? {} : { backgroundColor: "#F5F0EB" }}
      >
        <p className={isGrandparent ? "text-[20px]" : "font-mono text-[11px] text-[#1A1A1A]/50"}>
          LOADING YOUR DIGEST…
        </p>
      </main>
    );
  }

  // ── Empty / No digest yet ──────────────────────────────────────
  if (!content && !loading) {
    return (
      <main
        className={
          isGrandparent
            ? "mx-auto max-w-[375px] px-6 py-8 gp-body"
            : "mx-auto max-w-[375px] px-6 py-8"
        }
        style={isGrandparent ? {} : { backgroundColor: "#F5F0EB" }}
      >
        {isGrandparent ? (
          <GrandparentEmptyState onGenerate={handleGenerate} generating={generating} />
        ) : (
          <StandardEmptyState onGenerate={handleGenerate} generating={generating} />
        )}
      </main>
    );
  }

  // ── Digest exists ──────────────────────────────────────────────
  if (!content) {
    return (
      <main
        className={
          isGrandparent
            ? "mx-auto max-w-[375px] px-6 py-8 gp-body"
            : "mx-auto max-w-[375px] px-6 py-8"
        }
        style={isGrandparent ? {} : { backgroundColor: "#F5F0EB" }}
      >
        <div className="border border-[#C8603A] bg-[#F5F0EB] p-6 text-center" style={{ borderRadius: 0 }}>
          <p className="font-mono text-[11px] text-[#C8603A]">
            SOMETHING WENT WRONG LOADING YOUR DIGEST. PLEASE TRY AGAIN.
          </p>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="mt-3 border-2 border-[#1A1A1A] bg-[#C8603A] px-4 py-2 font-[Inter] text-[13px] font-bold uppercase tracking-[0.04em] text-[#F5F0EB] hover:bg-[#C8603A]/90 disabled:opacity-50"
            style={{ borderRadius: 0 }}
          >
            {generating ? "GENERATING…" : "TRY AGAIN"}
          </button>
        </div>
      </main>
    );
  }

  if (isGrandparent) {
    return (
      <GrandparentDigest
        content={content}
        onGenerate={handleGenerate}
        generating={generating}
      />
    );
  }

  return (
    <StandardDigest
      content={content}
      emailPref={emailPref}
      onToggleEmail={handleToggleEmail}
      onGenerate={handleGenerate}
      generating={generating}
      onSendEmail={handleSendDigestEmail}
      sendingEmail={sendingEmail}
      emailSent={emailSent}
    />
  );
}

// ═══════════════════════════════════════════════════════════════════
// Standard Mode
// ═══════════════════════════════════════════════════════════════════

function StandardDigest({
  content,
  emailPref,
  onToggleEmail,
  onGenerate,
  generating,
  onSendEmail,
  sendingEmail,
  emailSent,
}: {
  content: DigestContent;
  emailPref: boolean;
  onToggleEmail: () => void;
  onGenerate: () => void;
  generating: boolean;
  onSendEmail: () => void;
  sendingEmail: boolean;
  emailSent: boolean;
}) {
  return (
    <main
      className="mx-auto max-w-[375px] px-6 py-8"
      style={{ backgroundColor: "#F5F0EB" }}
    >
      {/* Back link */}
      <Link
        to="/"
        className="mb-4 inline-flex items-center gap-1 font-mono text-[11px] text-[#1A1A1A]/50 hover:text-[#1A1A1A]"
      >
        BACK TO DASHBOARD
      </Link>

      {/* Hero */}
      <section
        className="mb-8 border border-[#1A1A1A] bg-[#EDEDEA] p-6"
        style={{ borderRadius: 0 }}
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center">
            <Logo variant="icon" size="lg" />
          </div>
          <div>
            <h1 className="font-[Inter] text-[22px] font-bold uppercase tracking-[0.04em] text-[#1A1A1A]">
              DIGEST
            </h1>
            <p className="font-mono text-[11px] text-[#1A1A1A]/50">{content.weekLabel}</p>
          </div>
        </div>
        <p className="mt-4 font-mono text-[11px] text-[#1A1A1A]/50">
          A PRIVATE SUMMARY OF THE MOMENTS THAT MATTER — DESIGNED TO SPARK REAL
          CONVERSATIONS, NOT MORE SCREEN TIME.
        </p>
      </section>

      <div className="flex flex-col gap-6">
        {/* Connection Health */}
        <section className="border border-[#1A1A1A]/20 bg-[#EDEDEA] p-5" style={{ borderRadius: 0 }}>
          <h2 className="mb-4 font-[Inter] text-[13px] font-bold uppercase tracking-[0.06em] text-[#1A1A1A]">
            CONNECTION HEALTH
          </h2>
          {content.connectionSnapshot.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-3">
              {content.connectionSnapshot.map((snap) => (
                <DigestHealthCard key={snap.memberB.id} snapshot={snap} />
              ))}
            </div>
          ) : (
            <p className="font-mono text-[11px] text-[#1A1A1A]/50">
              NO CONNECTION DATA YET. KEEP INTERACTING.
            </p>
          )}
        </section>

        {/* Moments to Mention */}
        <section className="border border-[#1A1A1A]/20 bg-[#EDEDEA] p-5" style={{ borderRadius: 0 }}>
          <h2 className="mb-4 font-[Inter] text-[13px] font-bold uppercase tracking-[0.06em] text-[#1A1A1A]">
            MOMENTS TO MENTION
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {content.momentsToMention.map((moment, i) => (
              <MomentCard key={i} moment={moment} />
            ))}
          </div>
        </section>

        {/* Conversation Starters */}
        <section className="border border-[#1A1A1A]/20 bg-[#EDEDEA] p-5" style={{ borderRadius: 0 }}>
          <h2 className="mb-4 font-[Inter] text-[13px] font-bold uppercase tracking-[0.06em] text-[#1A1A1A]">
            START A CONVERSATION
          </h2>
          {content.conversationStarters.length > 0 ? (
            <div className="space-y-3">
              {content.conversationStarters.map((starter) => (
                <StarterCard key={starter.id} starter={starter} />
              ))}
            </div>
          ) : (
            <p className="font-mono text-[11px] text-[#1A1A1A]/50">
              NO CONVERSATION STARTERS AVAILABLE RIGHT NOW.
            </p>
          )}
        </section>

        {/* IRL Nudge */}
        {content.irlNudge && (
          <section
            className="border border-[#1A1A1A] bg-[#F5F0EB] p-5"
            style={{ borderRadius: 0, borderLeftWidth: "2px", borderLeftColor: "#C8603A" }}
          >
            <h2 className="mb-4 font-[Inter] text-[13px] font-bold uppercase tracking-[0.06em] text-[#1A1A1A]">
              MAKE IT REAL
            </h2>
            <IRLNudgeCard nudge={content.irlNudge} />
          </section>
        )}

        {/* Digest delivery section */}
        <section className="border border-[#1A1A1A]/20 bg-[#EDEDEA] p-5" style={{ borderRadius: 0 }}>
          <h2 className="mb-3 font-[Inter] text-[13px] font-bold uppercase tracking-[0.06em] text-[#1A1A1A]">
            DIGEST DELIVERY
          </h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-mono text-[11px] text-[#1A1A1A]/70">
                RECEIVE YOUR WEEKLY DIGEST BY EMAIL
              </p>
              <p className="font-mono text-[9px] text-[#1A1A1A]/40">
                {emailPref
                  ? "YOU'LL GET A SUMMARY EVERY MONDAY"
                  : "EMAIL DELIVERY IS TURNED OFF"}
              </p>
            </div>
            <button
              role="switch"
              aria-checked={emailPref}
              onClick={onToggleEmail}
              className="relative inline-flex h-6 w-11 items-center border border-[#1A1A1A]"
              style={{
                borderRadius: 0,
                backgroundColor: emailPref ? "#C8603A" : "#EDEDEA",
              }}
            >
              <span
                className="inline-block h-4 w-4 border border-[#1A1A1A]"
                style={{
                  borderRadius: 0,
                  backgroundColor: "#F5F0EB",
                  transform: emailPref ? "translateX(22px)" : "translateX(2px)",
                  transition: "transform 150ms cubic-bezier(0.25, 0.1, 0.25, 1)",
                }}
              />
            </button>
          </div>
          <div className="mt-4">
            {emailSent ? (
              <div className="border border-[#1A1A1A] bg-[#EDEDEA] p-3 font-mono text-[11px] text-[#1A1A1A]" style={{ borderRadius: 0 }}>
                EMAIL SENT. CHECK YOUR INBOX FOR YOUR DIGEST.
              </div>
            ) : (
              <button
                onClick={onSendEmail}
                disabled={sendingEmail}
                className="w-full border-2 border-[#1A1A1A] bg-[#C8603A] px-4 py-3 font-[Inter] text-[13px] font-bold uppercase tracking-[0.04em] text-[#F5F0EB] hover:bg-[#C8603A]/90 focus:outline-none focus:ring-2 focus:ring-[#1A1A1A] disabled:opacity-50"
                style={{ borderRadius: 0 }}
              >
                {sendingEmail ? "SENDING…" : "EMAIL ME THIS DIGEST"}
              </button>
            )}
          </div>
        </section>
      </div>

      {/* Regenerate */}
      <div className="mt-6 text-center">
        <button
          onClick={onGenerate}
          disabled={generating}
          className="border border-[#1A1A1A] bg-transparent px-4 py-2 font-[Inter] text-[13px] font-bold uppercase tracking-[0.04em] text-[#1A1A1A] hover:bg-[#EDEDEA] disabled:opacity-50"
          style={{ borderRadius: 0 }}
        >
          {generating ? "REFRESHING…" : "REFRESH DIGEST"}
        </button>
      </div>
    </main>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Grandparent Mode
// ═══════════════════════════════════════════════════════════════════

function GrandparentDigest({
  content,
  onGenerate,
  generating,
}: {
  content: DigestContent;
  onGenerate: () => void;
  generating: boolean;
}) {
  return (
    <main
      className="mx-auto max-w-[375px] px-6 py-8 gp-body"
      style={{ fontSize: "var(--gp-text-size, 20px)", lineHeight: 1.6 }}
    >
      {/* Back */}
      <Link
        to="/grandparent"
        className="gp-back-link mb-6 inline-flex items-center gap-2 font-sans text-[#1A1A1A] underline"
        style={{ fontSize: "var(--gp-text-size, 20px)" }}
      >
        BACK
      </Link>

      {/* Hero */}
      <div
        className="mb-8 p-6"
        style={{
          backgroundColor: "#F0EDE8",
          border: "2px solid #1A1A1A",
        }}
      >
        <h1
          className="font-bold uppercase text-[#1A1A1A]"
          style={{
            fontSize: "var(--gp-heading-size, 28px)",
            fontFamily: "Inter, sans-serif",
            fontWeight: 800,
            letterSpacing: "0.04em",
          }}
        >
          YOUR WEEK IN THE FAMILY
        </h1>
        <p
          className="font-mono"
          style={{ fontSize: "var(--gp-text-size, 20px)", color: "#1A1A1A", opacity: 0.5 }}
        >
          {content.weekLabel}
        </p>
        <p
          className="mt-3 text-[#1A1A1A]"
          style={{ fontSize: "var(--gp-text-size, 20px)" }}
        >
          HERE ARE THE MOMENTS THAT MATTER — JUST FOR YOU, {content.memberName}.
        </p>
      </div>

      {/* Moments to Mention (simplified) */}
      <div className="mb-6">
        <h2
          className="mb-4 font-bold uppercase text-[#1A1A1A]"
          style={{
            fontSize: "var(--gp-heading-size, 28px)",
            fontFamily: "Inter, sans-serif",
            fontWeight: 800,
            letterSpacing: "0.04em",
          }}
        >
          MOMENTS FROM THIS WEEK
        </h2>
        <div className="space-y-4">
          {content.momentsToMention.slice(0, 3).map((moment, i) => (
            <div
              key={i}
              className="p-5"
              style={{
                backgroundColor: "#F0EDE8",
                border: "2px solid #1A1A1A",
              }}
            >
              <p style={{ fontSize: "var(--gp-text-size, 20px)", color: "#1A1A1A" }}>
                {moment.text}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Conversation Starters (simplified) */}
      <div className="mb-6">
        <h2
          className="mb-4 font-bold uppercase text-[#1A1A1A]"
          style={{
            fontSize: "var(--gp-heading-size, 28px)",
            fontFamily: "Inter, sans-serif",
            fontWeight: 800,
            letterSpacing: "0.04em",
          }}
        >
          IDEAS TO START A CONVERSATION
        </h2>
        <div className="space-y-3">
          {content.conversationStarters.map((starter) => (
            <div
              key={starter.id}
              className="p-5"
              style={{
                backgroundColor: "#F0EDE8",
                border: "2px solid #1A1A1A",
              }}
            >
              <p style={{ fontSize: "var(--gp-text-size, 20px)", color: "#1A1A1A" }}>
                {starter.text}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* IRL Nudge (simplified) */}
      {content.irlNudge && (
        <div
          className="mb-6 p-6"
          style={{
            backgroundColor: "#F5F0EB",
            border: "2px solid #C8603A",
          }}
        >
          <p
            className="font-bold uppercase text-[#1A1A1A]"
            style={{
              fontSize: "var(--gp-heading-size, 28px)",
              fontFamily: "Inter, sans-serif",
              fontWeight: 800,
              letterSpacing: "0.04em",
            }}
          >
            A SUGGESTION FOR YOU
          </p>
          <p style={{ fontSize: "var(--gp-text-size, 20px)", color: "#1A1A1A" }}>
            {content.irlNudge.activitySuggestion}
          </p>
        </div>
      )}

      {/* Refresh */}
      <div className="mt-8 text-center">
        <button
          onClick={onGenerate}
          disabled={generating}
          className="gp-family-btn px-6 py-4 font-bold uppercase"
          style={{
            fontSize: "var(--gp-text-size, 20px)",
            minHeight: "var(--gp-touch-target, 56px)",
            backgroundColor: "#F0EDE8",
            border: "2px solid #1A1A1A",
            color: "#1A1A1A",
            fontFamily: "Inter, sans-serif",
            fontWeight: 800,
            letterSpacing: "0.04em",
          }}
        >
          {generating ? "REFRESHING…" : "REFRESH MY DIGEST"}
        </button>
      </div>
    </main>
  );
}

function GrandparentEmptyState({
  onGenerate,
  generating,
}: {
  onGenerate: () => void;
  generating: boolean;
}) {
  return (
    <div className="text-center" style={{ fontSize: "var(--gp-text-size, 20px)" }}>
      <h1
        className="mb-3 font-bold uppercase text-[#1A1A1A]"
        style={{
          fontSize: "var(--gp-heading-size, 28px)",
          fontFamily: "Inter, sans-serif",
          fontWeight: 800,
          letterSpacing: "0.04em",
        }}
      >
        YOUR WEEKLY DIGEST
      </h1>
      <p style={{ fontSize: "var(--gp-text-size, 20px)", color: "#1A1A1A" }}>
        YOUR FIRST DIGEST IS BEING PREPARED — CHECK BACK SOON.
      </p>
      <button
        onClick={onGenerate}
        disabled={generating}
        className="gp-family-btn mt-6 px-6 py-4 font-bold uppercase"
        style={{
          fontSize: "var(--gp-text-size, 20px)",
          minHeight: "var(--gp-touch-target, 56px)",
          backgroundColor: "#F0EDE8",
          border: "2px solid #1A1A1A",
          color: "#1A1A1A",
          fontFamily: "Inter, sans-serif",
          fontWeight: 800,
          letterSpacing: "0.04em",
        }}
      >
        {generating ? "GENERATING…" : "GENERATE MY DIGEST NOW"}
      </button>
    </div>
  );
}

function StandardEmptyState({
  onGenerate,
  generating,
}: {
  onGenerate: () => void;
  generating: boolean;
}) {
  return (
    <div className="text-center">
      <div className="mx-auto mb-6 flex items-center justify-center">
        <Logo variant="icon" size="xl" />
      </div>
      <h1 className="font-[Inter] text-[22px] font-bold uppercase tracking-[0.04em] text-[#1A1A1A]">
        YOUR WEEKLY DIGEST
      </h1>
      <p className="mt-2 font-mono text-[11px] text-[#1A1A1A]/50">
        YOUR FIRST DIGEST IS BEING PREPARED — CHECK BACK SOON.
      </p>
      <p className="mt-2 font-mono text-[9px] text-[#1A1A1A]/40">
        DIGESTS CURATE YOUR FAMILY&apos;S CONNECTION MOMENTS INTO A PRIVATE
        SUMMARY DESIGNED TO SPARK REAL CONVERSATIONS.
      </p>
      <button
        onClick={onGenerate}
        disabled={generating}
        className="mt-6 border-2 border-[#1A1A1A] bg-[#C8603A] px-6 py-3 font-[Inter] text-[13px] font-bold uppercase tracking-[0.04em] text-[#F5F0EB] hover:bg-[#C8603A]/90 disabled:opacity-50"
        style={{ borderRadius: 0 }}
      >
        {generating ? "GENERATING…" : "GENERATE MY FIRST DIGEST"}
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Sub-components
// ═══════════════════════════════════════════════════════════════════

function DigestHealthCard({ snapshot }: { snapshot: DigestPairSnapshot }) {
  return (
    <div
      className="flex flex-col items-center border border-[#1A1A1A]/10 bg-[#F5F0EB] p-4 text-center"
      style={{ borderRadius: 0 }}
    >
      <ScoreDot category={snapshot.category as "thriving" | "steady" | "cooling" | "dormant"} />
      <p className="mt-2 font-[Inter] text-[13px] font-bold uppercase tracking-[0.04em] text-[#1A1A1A]">
        {snapshot.memberB.name}
      </p>
      <p className="font-mono text-[9px] uppercase tracking-[0.03em] text-[#1A1A1A]/50">
        {snapshot.label} — {snapshot.score}
      </p>
      <div className="mt-1.5">
        <span className="font-mono text-[9px] tabular-nums text-[#1A1A1A]/50">
          {snapshot.score > 50 ? "TRENDING UP" : "NEEDS ATTENTION"}
        </span>
      </div>
    </div>
  );
}

function MomentCard({ moment }: { moment: DigestMoment }) {
  const borderMap: Record<string, string> = {
    reconnection: "border-l-[#1A1A1A]",
    appreciation: "border-l-[#C8603A]",
    dormancy_alert: "border-l-[#C8603A]",
    celebration: "border-l-[#1A1A1A]",
  };

  const borderClass = borderMap[moment.type] ?? "border-l-[#1A1A1A]/40";

  return (
    <div
      className={`border border-[#1A1A1A]/10 bg-[#F5F0EB] p-4 ${borderClass}`}
      style={{ borderRadius: 0, borderLeftWidth: "2px", minHeight: "80px" }}
    >
      <div className="flex items-start gap-3">
        {/* Square dot marker */}
        <span
          className="mt-1 block h-2 w-2 shrink-0 bg-[#1A1A1A]"
          style={{ borderRadius: 0 }}
          aria-hidden="true"
        />
        <p className="font-[Inter] text-[13px] font-normal text-[#1A1A1A]">
          {moment.text}
        </p>
      </div>
    </div>
  );
}

function StarterCard({
  starter,
}: {
  starter: { id: string; text: string; category: string };
}) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(starter.text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const label = CATEGORY_LABEL[starter.category as keyof typeof CATEGORY_LABEL] ?? "IDEA";

  return (
    <div
      className="flex items-start gap-3 border border-[#1A1A1A]/10 bg-[#F5F0EB] p-4"
      style={{ borderRadius: 0 }}
    >
      {/* Square dot */}
      <span
        className="mt-1 block h-2 w-2 shrink-0 bg-[#1A1A1A]"
        style={{ borderRadius: 0 }}
        aria-hidden="true"
      />
      <div className="flex-1">
        <p className="font-[Inter] text-[13px] font-normal text-[#1A1A1A]">
          {starter.text}
        </p>
        <span className="font-mono text-[9px] uppercase tracking-[0.06em] text-[#1A1A1A]/40">
          {label}
        </span>
      </div>
      <button
        onClick={handleCopy}
        className="shrink-0 border border-[#1A1A1A] bg-transparent px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.06em] text-[#1A1A1A]/70 hover:bg-[#EDEDEA]"
        style={{ borderRadius: 0 }}
      >
        {copied ? "COPIED" : "COPY"}
      </button>
    </div>
  );
}

function IRLNudgeCard({ nudge }: { nudge: DigestIRLNudge }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(nudge.activitySuggestion).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3 border border-[#1A1A1A]/10 bg-[#EDEDEA] p-4" style={{ borderRadius: 0 }}>
        {/* Square dot */}
        <span
          className="mt-1 block h-2 w-2 shrink-0 bg-[#C8603A]"
          style={{ borderRadius: 0 }}
          aria-hidden="true"
        />
        <div className="flex-1">
          <p className="font-[Inter] text-[13px] font-bold uppercase tracking-[0.04em] text-[#1A1A1A]">
            {nudge.memberName} COULD USE SOME TIME WITH YOU
          </p>
          <p className="mt-1 font-[Inter] text-[13px] text-[#1A1A1A]">
            {nudge.activitySuggestion}
          </p>
          <p className="mt-1 font-mono text-[9px] text-[#1A1A1A]/50">
            CONNECTION SCORE: {nudge.score} — A LITTLE NUDGE GOES A LONG WAY
          </p>
        </div>
      </div>
      <button
        onClick={handleCopy}
        className="w-full border border-[#1A1A1A] bg-transparent px-4 py-2 font-[Inter] text-[13px] font-bold uppercase tracking-[0.04em] text-[#1A1A1A] hover:bg-[#EDEDEA]"
        style={{ borderRadius: 0 }}
      >
        {copied ? "COPIED SUGGESTION" : "COPY SUGGESTION"}
      </button>
    </div>
  );
}
