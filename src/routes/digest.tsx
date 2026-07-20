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
} from "~/lib/api-digest";
import type { Digest } from "~/lib/types";
import type {
  DigestContent,
  DigestPairSnapshot,
  DigestMoment,
  DigestIRLNudge,
} from "~/lib/digest-engine";
import { ScoreRing, ScoreDot, TrendArrow } from "~/components/ScoreIndicator";
import { CATEGORY_EMOJI, CATEGORY_LABEL } from "~/lib/conversation-starters";

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
      // No identity — still show mock data for preview
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
      // Generate preview anyway
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

  const isGrandparent = uiMode === "grandparent";
  const content = digest?.content as DigestContent | undefined;

  // ── Loading state ──────────────────────────────────────────────
  if (loading) {
    return (
      <main
        className={
          isGrandparent
            ? "mx-auto max-w-2xl px-6 py-8 gp-body"
            : "mx-auto max-w-2xl px-6 py-8"
        }
      >
        <p className={isGrandparent ? "text-2xl" : "text-stone-400"}>
          Loading your digest…
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
            ? "mx-auto max-w-2xl px-6 py-8 gp-body"
            : "mx-auto max-w-2xl px-6 py-8"
        }
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
            ? "mx-auto max-w-2xl px-6 py-8 gp-body"
            : "mx-auto max-w-2xl px-6 py-8"
        }
      >
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-center">
          <p className="text-rose-700">
            Something went wrong loading your digest. Please try again.
          </p>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="mt-3 rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-50"
          >
            {generating ? "Generating…" : "Try again"}
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
}: {
  content: DigestContent;
  emailPref: boolean;
  onToggleEmail: () => void;
  onGenerate: () => void;
  generating: boolean;
}) {
  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      {/* Back link */}
      <Link
        to="/"
        className="mb-4 inline-flex items-center gap-1 text-sm text-stone-400 hover:text-stone-600"
      >
        ← Back to Dashboard
      </Link>

      {/* Hero */}
      <section className="mb-8 rounded-2xl bg-gradient-to-br from-amber-50 to-amber-100 p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-200 text-2xl">
            📋
          </div>
          <div>
            <h1 className="text-2xl font-bold text-amber-900">
              Your Week in the Family
            </h1>
            <p className="text-sm text-amber-700">{content.weekLabel}</p>
          </div>
        </div>
        <p className="mt-4 text-sm text-stone-500">
          A private summary of the moments that matter — designed to spark real
          conversations, not more screen time.
        </p>
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Connection Health */}
        <section className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm md:col-span-2">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-stone-800">
            <span>💞</span> Connection Health
          </h2>
          {content.connectionSnapshot.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-3">
              {content.connectionSnapshot.map((snap) => (
                <DigestHealthCard key={snap.memberB.id} snapshot={snap} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-stone-400">
              No connection data yet. Keep interacting!
            </p>
          )}
        </section>

        {/* Moments to Mention */}
        <section className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm md:col-span-2">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-stone-800">
            <span>✨</span> Moments to Mention
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {content.momentsToMention.map((moment, i) => (
              <MomentCard key={i} moment={moment} />
            ))}
          </div>
        </section>

        {/* Conversation Starters */}
        <section className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-stone-800">
            <span>💬</span> Start a Conversation
          </h2>
          {content.conversationStarters.length > 0 ? (
            <div className="space-y-3">
              {content.conversationStarters.map((starter) => (
                <StarterCard key={starter.id} starter={starter} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-stone-400">
              No conversation starters available right now.
            </p>
          )}
        </section>

        {/* IRL Nudge */}
        {content.irlNudge && (
          <section className="rounded-xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-amber-800">
              <span>📍</span> Make It Real
            </h2>
            <IRLNudgeCard nudge={content.irlNudge} />
          </section>
        )}

        {/* Digest delivery notification stub */}
        <section className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm md:col-span-2">
          <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-stone-700">
            <span>📬</span> Digest Delivery
          </h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-stone-600">
                Receive your weekly digest by email
              </p>
              <p className="text-xs text-stone-400">
                {emailPref
                  ? "You'll get a summary every Monday morning"
                  : "Email delivery is turned off"}
              </p>
            </div>
            <button
              role="switch"
              aria-checked={emailPref}
              onClick={onToggleEmail}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                emailPref ? "bg-amber-600" : "bg-stone-300"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
                  emailPref ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>
          <div className="mt-4 rounded-lg bg-teal-50 p-3 text-sm text-teal-800">
            <span className="font-medium">📬 Digest delivered</span> — your
            weekly summary has been prepared. Email sending is stubbed for now.
          </div>
        </section>
      </div>

      {/* Regenerate */}
      <div className="mt-6 text-center">
        <button
          onClick={onGenerate}
          disabled={generating}
          className="rounded-lg border border-stone-200 px-4 py-2 text-sm text-stone-500 hover:bg-stone-50 disabled:opacity-50"
        >
          {generating ? "Refreshing…" : "🔄 Refresh digest"}
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
      className="mx-auto max-w-2xl px-6 py-8 gp-body"
      style={{ fontSize: "var(--gp-text-size, 20px)", lineHeight: 1.6 }}
    >
      {/* Back */}
      <Link
        to="/grandparent"
        className="gp-back-link mb-6 inline-flex items-center gap-2 text-[#1a365d] underline"
        style={{ fontSize: "var(--gp-text-size, 20px)" }}
      >
        ← Back
      </Link>

      {/* Hero */}
      <div
        className="mb-8 rounded-2xl p-6"
        style={{
          backgroundColor: "#fff8e1",
          border: "2px solid #e0d8c8",
        }}
      >
        <h1
          className="font-bold text-[#1a365d]"
          style={{ fontSize: "var(--gp-heading-size, 28px)" }}
        >
          Your Week in the Family
        </h1>
        <p style={{ fontSize: "var(--gp-text-size, 20px)", color: "#5c4a2e" }}>
          {content.weekLabel}
        </p>
        <p
          className="mt-3"
          style={{ fontSize: "var(--gp-text-size, 20px)", color: "#4a3728" }}
        >
          Here are the moments that matter — just for you, {content.memberName}.
        </p>
      </div>

      {/* Moments to Mention (simplified) */}
      <div className="mb-6">
        <h2
          className="mb-4 font-bold text-[#1a365d]"
          style={{ fontSize: "var(--gp-heading-size, 28px)" }}
        >
          ✨ Moments from this week
        </h2>
        <div className="space-y-4">
          {content.momentsToMention.slice(0, 3).map((moment, i) => (
            <div
              key={i}
              className="rounded-xl p-5"
              style={{
                backgroundColor: "#fffdf7",
                border: "2px solid #e0d8c8",
              }}
            >
              <p style={{ fontSize: "var(--gp-text-size, 20px)" }}>
                <span className="mr-2">{moment.emoji}</span>
                {moment.text}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Conversation Starters (simplified) */}
      <div className="mb-6">
        <h2
          className="mb-4 font-bold text-[#1a365d]"
          style={{ fontSize: "var(--gp-heading-size, 28px)" }}
        >
          💬 Ideas to start a conversation
        </h2>
        <div className="space-y-3">
          {content.conversationStarters.map((starter) => (
            <div
              key={starter.id}
              className="rounded-xl p-5"
              style={{
                backgroundColor: "#f0f9ff",
                border: "2px solid #bae6fd",
              }}
            >
              <p style={{ fontSize: "var(--gp-text-size, 20px)" }}>
                {starter.text}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* IRL Nudge (simplified) */}
      {content.irlNudge && (
        <div
          className="mb-6 rounded-xl p-6"
          style={{
            backgroundColor: "#fef3c7",
            border: "2px solid #fcd34d",
          }}
        >
          <p
            className="font-bold text-[#1a365d]"
            style={{ fontSize: "var(--gp-heading-size, 28px)" }}
          >
            📍 A suggestion for you
          </p>
          <p style={{ fontSize: "var(--gp-text-size, 20px)" }}>
            {content.irlNudge.activitySuggestion}
          </p>
        </div>
      )}

      {/* Refresh */}
      <div className="mt-8 text-center">
        <button
          onClick={onGenerate}
          disabled={generating}
          className="gp-family-btn rounded-xl px-6 py-4 font-medium"
          style={{
            fontSize: "var(--gp-text-size, 20px)",
            minHeight: "var(--gp-touch-target, 56px)",
            backgroundColor: "#fef3c7",
            border: "2px solid #e0d8c8",
            color: "#1a365d",
          }}
        >
          {generating ? "Refreshing…" : "🔄 Refresh my digest"}
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
      <div className="mb-4 text-5xl">📋</div>
      <h1
        className="mb-3 font-bold text-[#1a365d]"
        style={{ fontSize: "var(--gp-heading-size, 28px)" }}
      >
        Your Weekly Digest
      </h1>
      <p style={{ fontSize: "var(--gp-text-size, 20px)", color: "#4a3728" }}>
        Your first digest is being prepared — check back soon!
      </p>
      <button
        onClick={onGenerate}
        disabled={generating}
        className="gp-family-btn mt-6 rounded-xl px-6 py-4 font-medium"
        style={{
          fontSize: "var(--gp-text-size, 20px)",
          minHeight: "var(--gp-touch-target, 56px)",
          backgroundColor: "#fef3c7",
          border: "2px solid #e0d8c8",
          color: "#1a365d",
        }}
      >
        {generating ? "Generating…" : "Generate my digest now"}
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
      <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-amber-100 text-4xl">
        📋
      </div>
      <h1 className="text-2xl font-bold text-amber-900">Your Weekly Digest</h1>
      <p className="mt-2 text-stone-500">
        Your first digest is being prepared — check back soon!
      </p>
      <p className="mt-2 text-sm text-stone-400">
        Digests curate your family&apos;s connection moments into a private
        summary designed to spark real conversations.
      </p>
      <button
        onClick={onGenerate}
        disabled={generating}
        className="mt-6 rounded-lg bg-amber-600 px-6 py-3 font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
      >
        {generating ? "Generating…" : "Generate my first digest"}
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Sub-components
// ═══════════════════════════════════════════════════════════════════

function DigestHealthCard({ snapshot }: { snapshot: DigestPairSnapshot }) {
  return (
    <div className="flex flex-col items-center rounded-lg bg-stone-50 p-4 text-center">
      <ScoreRing
        score={snapshot.score}
        category={snapshot.category as "thriving" | "steady" | "cooling" | "dormant"}
        size="md"
        showLabel={false}
      />
      <p className="mt-2 font-medium text-stone-800">
        {snapshot.memberB.name}
      </p>
      <p className="text-xs text-stone-400">
        {snapshot.emoji} {snapshot.label} — {snapshot.score}/100
      </p>
      <div className="mt-1.5">
        <TrendArrow trend={snapshot.score > 50 ? 70 : 30} />
      </div>
    </div>
  );
}

function MomentCard({ moment }: { moment: DigestMoment }) {
  const bgMap: Record<string, string> = {
    reconnection: "from-emerald-50 to-emerald-100 border-emerald-200",
    appreciation: "from-rose-50 to-rose-100 border-rose-200",
    dormancy_alert: "from-amber-50 to-amber-100 border-amber-200",
    celebration: "from-blue-50 to-blue-100 border-blue-200",
  };

  const bgClass = bgMap[moment.type] ?? "from-stone-50 to-stone-100 border-stone-200";

  return (
    <div
      className={`rounded-xl border bg-gradient-to-br p-4 ${bgClass}`}
      style={{ minHeight: "80px" }}
    >
      <div className="flex items-start gap-3">
        <span className="text-xl">{moment.emoji}</span>
        <p className="font-medium text-stone-700">{moment.text}</p>
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

  const emoji = CATEGORY_EMOJI[starter.category as keyof typeof CATEGORY_EMOJI] ?? "💬";
  const label = CATEGORY_LABEL[starter.category as keyof typeof CATEGORY_LABEL] ?? "Idea";

  return (
    <div className="flex items-start gap-3 rounded-lg bg-stone-50 p-4">
      <span className="mt-0.5 text-lg">{emoji}</span>
      <div className="flex-1">
        <p className="text-sm text-stone-700">{starter.text}</p>
        <span className="text-xs text-stone-400">{label}</span>
      </div>
      <button
        onClick={handleCopy}
        className="shrink-0 rounded-md border border-stone-200 bg-white px-2.5 py-1 text-xs font-medium text-stone-500 hover:bg-stone-100 hover:text-stone-700"
      >
        {copied ? "✓ Copied" : "Copy"}
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
      <div className="flex items-start gap-3 rounded-lg bg-white p-4">
        <span className="text-2xl">📍</span>
        <div className="flex-1">
          <p className="font-medium text-amber-900">
            {nudge.memberName} could use some time with you
          </p>
          <p className="mt-1 text-sm text-amber-700">{nudge.activitySuggestion}</p>
          <p className="mt-1 text-xs text-amber-500">
            Connection score: {nudge.score}/100 — a little nudge goes a long way
          </p>
        </div>
      </div>
      <button
        onClick={handleCopy}
        className="w-full rounded-lg border border-amber-300 bg-white px-4 py-2 text-sm font-medium text-amber-800 hover:bg-amber-100"
      >
        {copied ? "✓ Copied suggestion" : "📋 Copy suggestion"}
      </button>
    </div>
  );
}
