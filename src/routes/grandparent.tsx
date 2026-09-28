import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { recordInteraction, acknowledgeNudge } from "~/lib/api";
import { getCurrentMemberId, getCurrentGroupId } from "~/lib/client-store";
import { setUIMode } from "~/lib/ui-mode";
import { getGrandparentScreen } from "~/lib/api-grandparent";
import type { Nudge, FamilyMember } from "~/lib/types";
import { DEMO_NOTICE } from "~/lib/demo-data";
import { Icon } from "~/components/Icon";
import { Logo } from "~/components/Logo";

// ── Grandparent mode ────────────────────────────────────────────────
//
// This is the screen we hand to an elderly parent, so it shows exactly what
// the database knows: the real family, an honest empty state when there is no
// family yet, or a calm retry when the lookup failed. It never shows an
// invented household — see src/lib/api-grandparent.ts. Demo data is available
// only with an explicit `?demo=1` (src/lib/demo-data.ts), and always carries a
// "sample family" notice when it is.
//
// METADATA ONLY: names, relationships, timestamps and app-written nudge text.
// Never the content of anything a family said.

// ── Warm palette (kept in sync with app.css / design-system-warm.md) ──
const CREAM = "var(--color-gp-bg)";
const INK = "var(--color-gp-text)";
const SAND = "var(--color-gp-surface)";
const GREEN = "var(--color-gp-primary)";
const BORDER = "var(--color-gp-border)";

// ── Grandparent typography (nothing smaller than 23px) ───────────────
const GP_BODY = "1.4375rem"; // 23px
const GP_H1 = "2.25rem"; // 36px
const GP_H2 = "2rem"; // 32px

// ── Route ───────────────────────────────────────────────────────────

export const Route = createFileRoute("/grandparent")({
  // `?demo=1` is the explicit opt-in for the sample family. Without it this
  // screen only ever shows real data (or an honest empty/error state).
  validateSearch: (search: Record<string, unknown>): { demo?: "1" } =>
    search.demo === "1" || search.demo === 1 ? { demo: "1" } : {},
  loaderDeps: ({ search }) => ({ demo: search.demo === "1" }),
  loader: async ({ deps }) => {
    const memberId = getCurrentMemberId();
    const groupId = getCurrentGroupId();

    return getGrandparentScreen({
      data: {
        memberId: memberId ?? undefined,
        groupId: groupId ?? undefined,
        demo: deps.demo,
      },
    });
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
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function getTodayLabel(): string {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

// Strip any emoji from nudge copy — DB-backed messages may still contain
// them, and emoji are never used as UI in this product.
const EMOJI_RE =
  /[\p{Extended_Pictographic}\u{1F3FB}-\u{1F3FF}\u{FE0F}\u{200D}]/gu;
function stripEmoji(text: string): string {
  return text.replace(EMOJI_RE, "").replace(/\s+/g, " ").trim();
}

/** Soft round avatar — sand circle, warm border, bold initials. */
function Avatar({ name, size }: { name: string; size: number }) {
  return (
    <span
      aria-hidden="true"
      className="flex shrink-0 items-center justify-center rounded-full font-[family-name:var(--font-gp)]"
      style={{
        width: size,
        height: size,
        backgroundColor: CREAM,
        border: `2px solid ${BORDER}`,
        color: INK,
        fontWeight: 700,
        fontSize: Math.round(size * 0.4),
      }}
    >
      {getInitials(name)}
    </span>
  );
}

/** Header shared by every state of the screen: wordmark + today's date. */
function GrandparentHeader() {
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Logo variant="full" size="md" />
        <span style={{ color: INK, opacity: 0.75 }}>{getTodayLabel()}</span>
      </div>
      <div
        aria-hidden="true"
        className="mt-4"
        style={{ borderTop: `2px solid ${BORDER}`, opacity: 0.5 }}
      />
    </>
  );
}

/** Shown whenever the screen is displaying sample (demo) data. */
function DemoNotice() {
  return (
    <p
      role="status"
      className="mt-6 flex items-start gap-3 p-4"
      style={{
        backgroundColor: CREAM,
        border: `2px dashed var(--color-gp-highlight)`,
        borderRadius: "var(--radius-card-soft)",
        color: INK,
        fontSize: GP_BODY,
        fontWeight: 700,
      }}
    >
      <Icon name="idea" size={32} />
      {DEMO_NOTICE}
    </p>
  );
}

/** Truthful empty state: no family group yet. One sentence, one next step. */
function NoFamilyYet() {
  return (
    <main
      className="gp-mode min-h-dvh px-6 py-8"
      style={{
        backgroundColor: CREAM,
        color: INK,
        fontSize: GP_BODY,
        lineHeight: 1.6,
      }}
    >
      <div className="mx-auto max-w-[520px]">
        <GrandparentHeader />

        <h1 className="mt-9" style={{ fontSize: GP_H1, fontWeight: 700 }}>
          {getTimeGreeting()}
        </h1>

        <div
          className="gp-card mt-7"
          style={{ backgroundColor: SAND, borderColor: BORDER }}
        >
          <p style={{ fontWeight: 700 }}>Nobody is here yet</p>
          <p className="mt-4" style={{ opacity: 0.9 }}>
            Ask your family to send you an invite, and they will appear right
            here.
          </p>
        </div>

        <div className="mt-8 flex flex-col gap-5">
          <a
            href="/dashboard"
            className="gp-btn gp-btn-primary gp-tap-lg"
            style={{ justifyContent: "center" }}
          >
            <Icon name="members" size={32} />
            Go to my family home
          </a>
          <a
            href="/digest"
            className="gp-btn gp-tap"
            style={{ justifyContent: "center", backgroundColor: CREAM }}
          >
            <Icon name="checklist" size={32} />
            Read this week&apos;s letter
          </a>
        </div>

        <p className="mt-8" style={{ opacity: 0.75, fontSize: GP_BODY }}>
          Every connection here is private — metadata only, never content.
        </p>

        <footer className="mt-8">
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              setUIMode("standard");
              window.location.href = "/";
            }}
            className="gp-btn"
            style={{ justifyContent: "center", backgroundColor: CREAM }}
          >
            <Icon name="talk" size={32} />
            Back to the regular view
          </a>
        </footer>
      </div>
    </main>
  );
}

/** A failed lookup — a failure the user can retry, never invented content. */
function CouldNotOpen({ onRetry }: { onRetry: () => void }) {
  return (
    <main
      className="gp-mode min-h-dvh px-6 py-8"
      style={{
        backgroundColor: CREAM,
        color: INK,
        fontSize: GP_BODY,
        lineHeight: 1.6,
      }}
    >
      <div className="mx-auto max-w-[520px]">
        <GrandparentHeader />

        <h1 className="mt-9" style={{ fontSize: GP_H1, fontWeight: 700 }}>
          We can&apos;t open this just now
        </h1>

        <div
          className="gp-card mt-7"
          style={{ backgroundColor: SAND, borderColor: BORDER }}
        >
          <p style={{ opacity: 0.9 }}>
            Something on our side is not working. Nothing has been lost. Please
            try again in a moment.
          </p>
        </div>

        <div className="mt-8">
          <button
            onClick={onRetry}
            className="gp-btn gp-btn-primary gp-tap-lg w-full"
            style={{ justifyContent: "center" }}
          >
            <Icon name="reconnect" size={32} />
            Try again
          </button>
        </div>

        <p className="mt-8" style={{ opacity: 0.75, fontSize: GP_BODY }}>
          Every connection here is private — metadata only, never content.
        </p>

        <footer className="mt-8">
          <a
            href="/"
            className="gp-btn"
            style={{ justifyContent: "center", backgroundColor: CREAM }}
          >
            <Icon name="talk" size={32} />
            Back to the regular view
          </a>
        </footer>
      </div>
    </main>
  );
}

// ── Main Component ──────────────────────────────────────────────────

function GrandparentDashboard() {
  const loaderData = Route.useLoaderData();
  const { demo } = Route.useSearch();
  const wantsDemo = demo === "1";

  // The loader above runs during server rendering, where there is no
  // localStorage to read the device's identity from. So the first client paint
  // re-asks the same server function with the identity this device holds. The
  // loader result stands in until that answers.
  const [data, setData] = useState(loaderData);

  useEffect(() => {
    let cancelled = false;
    const memberId = getCurrentMemberId();
    const groupId = getCurrentGroupId();
    getGrandparentScreen({
      data: {
        memberId: memberId ?? undefined,
        groupId: groupId ?? undefined,
        demo: wantsDemo,
      },
    })
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch(() => {
        if (!cancelled) setData({ status: "error" });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const [confirmation, setConfirmation] = useState<{
    message: string;
    visible: boolean;
  }>({ message: "", visible: false });

  const isDemo = data.status === "demo";

  // The name we greet them by, and the people we show, always come from the
  // server read above — never from a guess.
  const memberName =
    data.status === "ok"
      ? data.member.display_name
      : data.status === "demo"
        ? data.memberName
        : null;

  const familyOthers: FamilyMember[] =
    data.status === "ok"
      ? data.group.members.filter((m) => m.id !== data.member.id)
      : data.status === "demo"
        ? data.members
        : [];

  const pendingNudges: (Nudge & { from_name?: string })[] =
    data.status === "ok" || data.status === "demo" ? data.nudges : [];

  function showConfirmation(message: string) {
    setConfirmation({ message, visible: true });
    setTimeout(() => {
      setConfirmation((prev) => ({ ...prev, visible: false }));
    }, 5000);
  }

  async function handleSayHello(member: FamilyMember) {
    // Sample data is for looking at, not for writing interactions.
    if (!isDemo) {
      const currentId = getCurrentMemberId();
      const currentGroupId = getCurrentGroupId();

      if (currentId && currentGroupId) {
        try {
          await recordInteraction({
            data: {
              fromMemberId: currentId,
              toMemberId: member.id,
              groupId: currentGroupId,
              interactionType: "nudge_acknowledged",
              metadata: {
                source: "grandparent_dashboard",
                gesture: "say_hello",
              },
            },
          });
        } catch {
          // best-effort
        }
      }
    }
    showConfirmation(
      `${member.display_name} will know you're thinking of them.`,
    );
  }

  async function handleNudgeResponse(
    nudge: Nudge & { from_name?: string },
    responseType: string,
  ) {
    const fromName = nudge.from_name ?? "Your family";

    if (!isDemo) {
      const currentId = getCurrentMemberId();
      const currentGroupId = getCurrentGroupId();

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

          await acknowledgeNudge({ data: { nudgeId: nudge.id } });
        } catch {
          // best-effort
        }
      }
    }

    const messages: Record<string, string> = {
      thinking: `${fromName} will know you're thinking of them.`,
      call: `${fromName} will know you'd like a call.`,
      note: `${fromName} will know you sent a note.`,
    };
    showConfirmation(
      messages[responseType] ?? `${fromName} will know you're thinking of them.`,
    );
  }

  // ── Truthful states, in order of what we actually know ─────────────

  if (data.status === "no-family") return <NoFamilyYet />;

  if (data.status === "error") {
    return <CouldNotOpen onRetry={() => window.location.reload()} />;
  }

  // ── Render ─────────────────────────────────────────────────────────

  return (
    <main
      className="gp-mode min-h-dvh px-6 py-8"
      style={{
        backgroundColor: CREAM,
        color: INK,
        fontSize: GP_BODY,
        lineHeight: 1.6,
      }}
    >
      <div className="mx-auto max-w-[520px]">
        {/* Wordmark + today's date — both at reading size, never tiny */}
        <GrandparentHeader />

        {isDemo && <DemoNotice />}

        {/* Greeting */}
        <h1 className="mt-9 mb-9" style={{ fontSize: GP_H1, fontWeight: 700 }}>
          {getTimeGreeting()}, {memberName}
        </h1>

        {/* Confirmation toast — fade only, never moves */}
        {confirmation.visible && (
          <div
            role="status"
            aria-live="polite"
            className="gp-confirmation mb-9 flex items-start gap-4 p-6"
            style={{
              backgroundColor: SAND,
              border: `2px solid ${GREEN}`,
              borderRadius: "var(--radius-card-soft)",
            }}
          >
            <Icon name="check" size={36} />
            <p style={{ fontWeight: 700 }}>{confirmation.message}</p>
          </div>
        )}

        {/* Your family */}
        <section className="mb-10">
          <h2 className="mb-5" style={{ fontSize: GP_H2, fontWeight: 700 }}>
            Your family
          </h2>

          {familyOthers.length > 0 ? (
            <div className="flex flex-col gap-4">
              {familyOthers.slice(0, 4).map((member) => (
                <button
                  key={member.id}
                  onClick={() => handleSayHello(member)}
                  className="gp-family-btn flex w-full items-center gap-5 p-5 text-left"
                  style={{
                    minHeight: 96,
                    backgroundColor: SAND,
                    border: `2px solid ${BORDER}`,
                    borderRadius: "var(--radius-card)",
                    color: INK,
                    fontSize: GP_BODY,
                  }}
                  aria-label={`Say hello to ${member.display_name}`}
                >
                  <Avatar name={member.display_name} size={64} />
                  <span className="flex flex-col items-start">
                    <span style={{ fontWeight: 700 }}>
                      {member.display_name}
                    </span>
                    <span style={{ opacity: 0.75 }}>
                      {member.relationship.replace("_", " ")}
                    </span>
                  </span>
                  <span
                    className="ml-auto shrink-0"
                    style={{
                      color: GREEN,
                      fontWeight: 700,
                      whiteSpace: "nowrap",
                    }}
                  >
                    Say hello
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <p style={{ opacity: 0.8 }}>
              Your family will appear here once they join.
            </p>
          )}
        </section>

        {/* They've been thinking of you */}
        <section className="mb-10">
          <h2 className="mb-5" style={{ fontSize: GP_H2, fontWeight: 700 }}>
            They&apos;ve been thinking of you
          </h2>

          {pendingNudges.length > 0 ? (
            <div className="flex flex-col gap-6">
              {pendingNudges.slice(0, 2).map((nudge) => {
                const fromName = nudge.from_name ?? "Someone";
                return (
                  <div
                    key={nudge.id}
                    className="gp-card"
                    style={{ backgroundColor: SAND, borderColor: BORDER }}
                  >
                    <div className="mb-4 flex items-center gap-4">
                      <Avatar name={fromName} size={56} />
                      <span style={{ fontWeight: 700 }}>{fromName}</span>
                    </div>
                    <p className="mb-6" style={{ opacity: 0.9 }}>
                      {stripEmoji(nudge.message_text)}
                    </p>
                    <div className="flex flex-col gap-4">
                      <button
                        onClick={() => handleNudgeResponse(nudge, "thinking")}
                        className="gp-response-btn gp-btn gp-btn-primary gp-tap-lg"
                        style={{ justifyContent: "center" }}
                      >
                        Thinking of you too
                      </button>
                      <button
                        onClick={() => handleNudgeResponse(nudge, "call")}
                        className="gp-response-btn gp-btn gp-tap"
                        style={{ justifyContent: "center", backgroundColor: CREAM }}
                      >
                        Call me?
                      </button>
                      <button
                        onClick={() => handleNudgeResponse(nudge, "note")}
                        className="gp-response-btn gp-btn gp-tap"
                        style={{ justifyContent: "center", backgroundColor: CREAM }}
                      >
                        Send a note
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p style={{ opacity: 0.8 }}>
              No new messages right now. Your family is staying in touch.
            </p>
          )}
        </section>

        {/* Back to standard view */}
        <footer className="mt-10 flex flex-col gap-5">
          <div
            aria-hidden="true"
            className="h-0"
            style={{ borderTop: `2px solid ${BORDER}`, opacity: 0.5 }}
          />
          <a
            href="/digest"
            className="gp-btn"
            style={{ justifyContent: "center", backgroundColor: CREAM }}
          >
            <Icon name="checklist" size={32} />
            Read this week&apos;s letter
          </a>
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              setUIMode("standard");
              window.location.href = "/";
            }}
            className="gp-btn"
            style={{ justifyContent: "center", backgroundColor: CREAM }}
          >
            <Icon name="talk" size={32} />
            Back to the regular view
          </a>
        </footer>
      </div>
    </main>
  );
}
