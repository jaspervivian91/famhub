import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getUIMode } from "~/lib/ui-mode";
import {
  getCurrentMemberId,
  getCurrentGroupId,
} from "~/lib/client-store";
import {
  getMyDigest,
  generateMyDigest,
  updateDigestPreference,
  sendDigestByEmail,
} from "~/lib/api-digest";
import type { Digest, ScoreCategory } from "~/lib/types";
import type {
  DigestContent,
  DigestPairSnapshot,
  DigestMoment,
  DigestIRLNudge,
} from "~/lib/digest-engine";
import { ScoreDot } from "~/components/ScoreIndicator";
import { Logo } from "~/components/Logo";
import { Icon, type IconName } from "~/components/Icon";
import {
  HandDivider,
  PageTurn,
  SketchUnderline,
} from "~/components/Warm";

export const Route = createFileRoute("/digest")({
  component: DigestPage,
});

/* ── Illustrated replacements for the old emoji chrome ──────────────── */
const MOMENT_ICON: Record<string, IconName> = {
  reconnection: "reconnect",
  appreciation: "heart",
  dormancy_alert: "clock",
  celebration: "celebration",
};

const STARTER_ICON: Record<string, IconName> = {
  memory: "talk",
  photo: "warm",
  question: "idea",
  activity: "pin",
};

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
      const result = await getMyDigest({ data: { groupId, memberId } });
      setDigest(result ?? null);
    } catch {
      setError("We couldn't open your letter just now.");
    }
    setLoading(false);
  }

  async function handleGenerate() {
    setGenerating(true);
    try {
      const result = await generateMyDigest({
        data: memberId && groupId
          ? { groupId, memberId }
          : { groupId: "preview", memberId: "preview-user" },
      });
      setDigest(result ?? null);
      setError("");
    } catch {
      setError("We couldn't write this week's letter just now.");
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
      const result = await sendDigestByEmail({ data: { groupId, memberId } });
      if (result.success) {
        setEmailSent(true);
      } else {
        setError(result.error ?? "We couldn't send the letter");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "We couldn't send the letter");
    }
    setSendingEmail(false);
  }

  const isGrandparent = uiMode === "grandparent";
  const content = digest?.content as DigestContent | undefined;

  // ── Loading state ──────────────────────────────────────────────
  if (loading) {
    return (
      <main className="mx-auto w-full max-w-[480px] px-5 py-10">
        <p className="fh-body" style={{ color: "var(--color-fh-muted)" }}>
          Opening your letter…
        </p>
      </main>
    );
  }

  // ── Empty / no letter yet ──────────────────────────────────────
  if (!content) {
    return isGrandparent ? (
      <GrandparentEmptyState onGenerate={handleGenerate} generating={generating} />
    ) : (
      <StandardEmptyState
        onGenerate={handleGenerate}
        generating={generating}
        error={error}
      />
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
      error={error}
    />
  );
}

// ═══════════════════════════════════════════════════════════════════
// Standard mode — the letter
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
  error,
}: {
  content: DigestContent;
  emailPref: boolean;
  onToggleEmail: () => void;
  onGenerate: () => void;
  generating: boolean;
  onSendEmail: () => void;
  sendingEmail: boolean;
  emailSent: boolean;
  error: string;
}) {
  return (
    <PageTurn className="min-h-dvh">
      <main className="mx-auto w-full max-w-[480px] px-5 pt-2 pb-16 md:max-w-[640px] md:px-10">
        <Link
          to="/dashboard"
          className="fh-body-sm fh-link inline-flex items-center"
          style={{ textDecoration: "none", color: "var(--color-fh-muted)" }}
        >
          ← Back to my family home
        </Link>

        {/* ── The letter ─────────────────────────────────────────── */}
        <article
          className="mt-5 px-6 py-8 md:px-10 md:py-10"
          style={{
            backgroundColor: "var(--color-fh-surface)",
            border: "1px solid var(--color-fh-border)",
            borderRadius: "26px 24px 24px 22px", // drawn by hand, one corner softer
            boxShadow: "var(--shadow-soft)",
          }}
        >
          <header className="text-center">
            <div className="flex items-center justify-center gap-2">
              <Logo variant="icon" size="sm" />
              <span className="fh-caption">
                Your family · {content.weekLabel}
              </span>
            </div>
            <HandDivider className="mt-4" dot />
            <h1 className="fh-h2 mt-5">Your week in the family</h1>
            <SketchUnderline className="mx-auto mt-2" color="var(--color-fh-highlight)" />
          </header>

          <p className="fh-body mt-7" style={{ fontWeight: 700 }}>
            Dear {content.memberName},
          </p>
          <p className="fh-body mt-3">
            Here is this week&apos;s letter from your family — a few quiet notes
            about the people who love you. No scoreboards, no feeds. Just
            moments worth talking about.
          </p>

          {content.momentsToMention.length > 0 && (
            <section className="mt-8">
              <h2 className="fh-h3">Moments worth mentioning</h2>
              <SketchUnderline className="mt-1.5" />
              <ul className="mt-5 flex flex-col gap-4">
                {content.momentsToMention.map((moment, i) => (
                  <MomentRow key={i} moment={moment} />
                ))}
              </ul>
            </section>
          )}

          {content.connectionSnapshot.length > 0 && (
            <section className="mt-8">
              <h2 className="fh-h3">How we&apos;re doing</h2>
              <SketchUnderline className="mt-1.5" />
              <ul className="mt-5 flex flex-col gap-2.5">
                {content.connectionSnapshot.map((snap) => (
                  <DigestHealthRow key={snap.memberB.id} snapshot={snap} />
                ))}
              </ul>
            </section>
          )}

          {content.conversationStarters.length > 0 && (
            <section className="mt-8">
              <h2 className="fh-h3">A few threads to pull</h2>
              <SketchUnderline className="mt-1.5" />
              <ul className="mt-5 flex flex-col gap-3">
                {content.conversationStarters.map((starter) => (
                  <StarterRow key={starter.id} starter={starter} />
                ))}
              </ul>
            </section>
          )}

          {content.irlNudge && (
            <section className="mt-8">
              <h2 className="fh-h3">Make it real</h2>
              <SketchUnderline className="mt-1.5" />
              <div className="mt-5">
                <IRLNudgeCard nudge={content.irlNudge} />
              </div>
            </section>
          )}

          <HandDivider className="mt-9" />

          <p className="fh-body mt-6">
            That&apos;s all for this week. The phone is yours — go make one of
            these moments happen.
          </p>
          <p className="fh-body mt-5" style={{ fontWeight: 700 }}>
            With love,
          </p>
          <p className="fh-h3 mt-0.5">
            Your family
            <span
              aria-hidden="true"
              className="ml-2 inline-block align-middle rounded-full"
              style={{
                width: 9,
                height: 9,
                backgroundColor: "var(--color-fh-highlight)",
              }}
            />
          </p>
        </article>

        {/* ── Delivery ───────────────────────────────────────────── */}
        <section className="fh-card mt-7">
          <h2 className="fh-h4 flex items-center gap-2.5">
            <Icon name="bell" size={22} />
            Email this letter every Monday
          </h2>
          <p className="fh-caption mt-1">
            Just for you · private · never shared
          </p>
          <div className="mt-4 flex items-center justify-between gap-4">
            <span className="fh-body-sm">
              {emailPref
                ? "You'll get a summary each Monday morning"
                : "Email delivery is turned off"}
            </span>
            <button
              role="switch"
              aria-checked={emailPref}
              aria-label="Email this letter every Monday"
              onClick={onToggleEmail}
              className="relative inline-flex h-8 w-14 shrink-0 items-center rounded-full"
              style={{
                backgroundColor: emailPref
                  ? "var(--color-fh-accent)"
                  : "var(--color-fh-border)",
                transition: "background-color var(--duration-fade) ease-out",
              }}
            >
              <span
                className="inline-block h-6 w-6 rounded-full"
                style={{
                  backgroundColor: "var(--color-fh-bg)",
                  transform: emailPref ? "translateX(30px)" : "translateX(4px)",
                  transition: "transform var(--duration-fade) var(--ease-gentle)",
                }}
              />
            </button>
          </div>
          <div className="mt-5">
            {emailSent ? (
              <p
                className="fh-note fh-body-sm inline-flex items-center gap-2"
                style={{ color: "var(--color-fh-status-ok)" }}
              >
                <Icon name="check" size={20} />
                Sent — it&apos;s on its way to your inbox.
              </p>
            ) : (
              <button
                onClick={onSendEmail}
                disabled={sendingEmail}
                className="fh-btn fh-btn-primary w-full"
              >
                <Icon name="digest" size={20} />
                {sendingEmail ? "Sending…" : "Email me this letter now"}
              </button>
            )}
          </div>
          {error && (
            <p
              className="fh-body-sm mt-3"
              style={{ color: "var(--color-fh-status-error)" }}
            >
              {error}
            </p>
          )}
        </section>

        <div className="mt-7 text-center">
          <button
            onClick={onGenerate}
            disabled={generating}
            className="fh-btn fh-btn-sand"
          >
            <Icon name="reconnect" size={20} />
            {generating ? "Writing…" : "Write this week's letter again"}
          </button>
        </div>
      </main>
    </PageTurn>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Grandparent mode — larger, warmer, simplest
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
      className="gp-mode mx-auto w-full max-w-[520px] px-5 py-8"
      style={{ backgroundColor: "var(--color-gp-bg)", color: "var(--color-gp-text)" }}
    >
      <Link
        to="/grandparent"
        className="gp-btn"
        style={{ minHeight: 60, width: "auto", padding: "12px 20px" }}
      >
        <Icon name="talk" size={32} />
        Back
      </Link>

      <div className="gp-card mt-6">
        <h1 style={{ fontSize: "2.25rem" }}>Your week in the family</h1>
        <p className="mt-2">{content.weekLabel}</p>
        <p className="mt-3">
          Here are the moments that matter — just for you, {content.memberName}.
        </p>
      </div>

      <section className="mt-8">
        <h2 className="mb-5" style={{ fontSize: "2rem" }}>
          Moments from this week
        </h2>
        <div className="flex flex-col gap-5">
          {content.momentsToMention.slice(0, 3).map((moment, i) => (
            <div key={i} className="gp-card flex items-start gap-4">
              <Icon name={MOMENT_ICON[moment.type] ?? "warm"} size={32} />
              <p>{moment.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-9">
        <h2 className="mb-5" style={{ fontSize: "2rem" }}>
          Ideas to start a conversation
        </h2>
        <div className="flex flex-col gap-5">
          {content.conversationStarters.map((starter) => (
            <div key={starter.id} className="gp-card flex items-start gap-4">
              <Icon name={STARTER_ICON[starter.category] ?? "idea"} size={32} />
              <p>{starter.text}</p>
            </div>
          ))}
        </div>
      </section>

      {content.irlNudge && (
        <section className="mt-9">
          <div
            className="gp-card"
            style={{ backgroundColor: "var(--color-gp-surface)" }}
          >
            <p
              className="flex items-center gap-3"
              style={{ fontSize: "2rem", fontWeight: 700 }}
            >
              <Icon name="pin" size={36} />
              A suggestion for you
            </p>
            <p className="mt-4">{content.irlNudge.activitySuggestion}</p>
          </div>
        </section>
      )}

      <div className="mt-10">
        <button
          onClick={onGenerate}
          disabled={generating}
          className="gp-btn gp-btn-primary"
          style={{ minHeight: 72, justifyContent: "center" }}
        >
          <Icon name="reconnect" size={32} />
          {generating ? "Writing…" : "Write my letter again"}
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
    <main
      className="gp-mode mx-auto w-full max-w-[520px] px-5 py-10 text-center"
      style={{ backgroundColor: "var(--color-gp-bg)", color: "var(--color-gp-text)" }}
    >
      <Icon name="checklist" size={56} className="mx-auto" />
      <h1 className="mt-6" style={{ fontSize: "2.25rem" }}>
        Your weekly letter
      </h1>
      <p className="mt-4">
        Your first letter is being written. Check back soon.
      </p>
      <button
        onClick={onGenerate}
        disabled={generating}
        className="gp-btn gp-btn-primary gp-tap-lg mt-8"
        style={{ justifyContent: "center" }}
      >
        {generating ? "Writing…" : "Write my letter now"}
      </button>
    </main>
  );
}

function StandardEmptyState({
  onGenerate,
  generating,
  error,
}: {
  onGenerate: () => void;
  generating: boolean;
  error: string;
}) {
  return (
    <PageTurn className="min-h-dvh">
      <main className="mx-auto w-full max-w-[480px] px-5 py-16 text-center">
        <Icon name="checklist" size={56} className="mx-auto" />
        <h1 className="fh-h2 mt-6">Your weekly letter</h1>
        <p className="fh-body mt-3" style={{ color: "var(--color-fh-muted)" }}>
          Your first letter is being written. Check back soon.
        </p>
        <p className="fh-caption mx-auto mt-3 max-w-[36ch]">
          Each letter gathers your family&apos;s small moments into something
          private, warm, and worth a phone call.
        </p>
        <button
          onClick={onGenerate}
          disabled={generating}
          className="fh-btn fh-btn-primary mt-7"
        >
          {generating ? "Writing…" : "Write my first letter"}
        </button>
        {error && (
          <p className="fh-body-sm mt-4" style={{ color: "var(--color-fh-status-error)" }}>
            {error}
          </p>
        )}
      </main>
    </PageTurn>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Rows
// ═══════════════════════════════════════════════════════════════════

function MomentRow({ moment }: { moment: DigestMoment }) {
  return (
    <li className="flex items-start gap-3">
      <Icon name={MOMENT_ICON[moment.type] ?? "warm"} size={24} />
      <div>
        <p className="fh-body-sm" style={{ fontWeight: 700 }}>
          {moment.text}
        </p>
      </div>
    </li>
  );
}

function DigestHealthRow({ snapshot }: { snapshot: DigestPairSnapshot }) {
  return (
    <li className="flex items-center gap-3">
      <ScoreDot category={snapshot.category as ScoreCategory} />
      <p className="fh-body-sm">
        You ↔ {snapshot.memberB.name} · {snapshot.label}
      </p>
      <span className="fh-caption ml-auto tabular-nums">
        {snapshot.score}/100
      </span>
    </li>
  );
}

function StarterRow({
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

  return (
    <li className="fh-nested flex items-start gap-3 p-4">
      <Icon name={STARTER_ICON[starter.category] ?? "idea"} size={22} />
      <div className="flex-1">
        <p className="fh-body-sm">“{starter.text}”</p>
        <p className="fh-caption mt-1 capitalize">{starter.category}</p>
      </div>
      <button
        onClick={handleCopy}
        className="fh-btn fh-btn-secondary fh-caption shrink-0"
        style={{ minHeight: 44, padding: "8px 14px" }}
      >
        {copied ? (
          <>
            <Icon name="check" size={16} /> Copied
          </>
        ) : (
          "Copy"
        )}
      </button>
    </li>
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
    <div
      className="fh-nested p-5"
      style={{ borderColor: "var(--color-fh-highlight)" }}
    >
      <p className="fh-h4 flex items-start gap-3">
        <Icon name="pin" size={24} />
        {nudge.memberName} could use some time with you
      </p>
      <p className="fh-body-sm mt-3">{nudge.activitySuggestion}</p>
      <p className="fh-caption mt-2">
        Connection score: {nudge.score}/100 — a little nudge goes a long way.
      </p>
      <button
        onClick={handleCopy}
        className="fh-btn fh-btn-quiet mt-2 inline-flex items-center gap-2 px-0"
        style={{ minHeight: 44 }}
      >
        {copied ? <Icon name="check" size={18} /> : <Icon name="pin" size={18} />}
        {copied ? "Copied" : "Copy this idea"}
      </button>
    </div>
  );
}
