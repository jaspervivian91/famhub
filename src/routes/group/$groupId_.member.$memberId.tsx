/**
 * Relationship profile — the per-person view inside a family group.
 *
 * Reference: /home/team/shared/design/relationship-profile.svg (warm mockup).
 * Everything on this screen is derived from interaction METADATA — who reached
 * out, when, and which kind of contact — never from what anyone said.
 *
 * Loader pattern mirrors src/routes/group/$groupId.tsx: a single server
 * function fetches the whole screen, and the component renders from state.
 *
 * ABOUT THE FILE NAME — `$groupId_.member.$memberId.tsx`. The trailing `_` on
 * the group segment is TanStack Router's non-nesting escape: it keeps
 * /group/$groupId/member/$memberId a sibling of the group page instead of a
 * child of it. Nested, this screen would render inside group/$groupId.tsx,
 * which draws no <Outlet/>, so it would never appear. Keep the underscore.
 */
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import {
  loadRelationshipProfile,
  sendGentleHello,
  type GentleHelloResult,
  type RelationshipProfileData,
} from "~/lib/api-profile";
import {
  WARM_BAND_COPY,
  firstName,
  formatDaysAgo,
  initials,
  objectPronoun,
  trendLine,
  TYPE_ICON,
} from "~/lib/relationship-profile";
import { getCurrentMemberId } from "~/lib/client-store";
import { Icon, IconChip } from "~/components/Icon";
import { WarmthMeter } from "~/components/WarmthMeter";
import { TrendArrow } from "~/components/ScoreIndicator";
import { HandDivider, PageTurn, SketchUnderline } from "~/components/Warm";

export const Route = createFileRoute("/group/$groupId_/member/$memberId")({
  loader: async () => null,
  component: MemberProfilePage,
});

function MemberProfilePage() {
  const { groupId, memberId } = Route.useParams();
  const navigate = useNavigate();

  const [data, setData] = useState<RelationshipProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  // "Send a gentle hello" sheet
  const [helloOpen, setHelloOpen] = useState(false);
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState<GentleHelloResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const viewerMemberId = getCurrentMemberId() ?? undefined;
      const result = await loadRelationshipProfile({
        data: { groupId, memberId, viewerMemberId },
      });
      setData(result);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [groupId, memberId]);

  useEffect(() => {
    load();
  }, [load]);

  function closeHello() {
    if (sending) return;
    setHelloOpen(false);
    setSent(null);
    setError(null);
    setNote("");
  }

  async function handleSend() {
    if (!data?.member || !data.viewer) return;
    setSending(true);
    setError(null);
    try {
      const result = await sendGentleHello({
        data: {
          groupId,
          fromMemberId: data.viewer.id,
          toMemberId: data.member.id,
          note: note.trim() || undefined,
        },
      });
      if (result.ok) setSent(result);
      else setError(result.error ?? "That hello didn't send. Please try again.");
    } catch {
      setError("That hello didn't send. Please try again.");
    } finally {
      setSending(false);
    }
  }

  const member = data?.member ?? null;
  const isSelf = data?.isSelf ?? false;
  const pronoun = objectPronoun(member?.pronoun);
  const name = member?.display_name ?? "this person";
  const first = member ? firstName(member.display_name) : name;

  return (
    <PageTurn className="min-h-dvh">
      <main className="mx-auto w-full max-w-[480px] px-5 pt-2 pb-14 md:max-w-[700px] md:px-10">
        <button
          onClick={() => navigate({ to: "/dashboard" })}
          className="fh-body-sm fh-link inline-flex items-center"
          style={{ minHeight: 44, color: "var(--color-fh-muted)" }}
        >
          ← Back to my family home
        </button>

        {/* Where this person lives in the family — the group page */}
        {data?.group && (
          <button
            onClick={() => navigate({ to: `/group/${groupId}` })}
            className="fh-chip mt-3 inline-flex"
            style={{ minHeight: 44, cursor: "pointer" }}
            aria-label={`Back to ${data.group.name}`}
          >
            <Icon name="members" size={16} />
            {data.group.name}
          </button>
        )}

        {loading && !data && (
          <p className="fh-body-sm mt-8" style={{ color: "var(--color-fh-muted)" }}>
            Looking back over your last few months together…
          </p>
        )}

        {!loading && !data?.ok && (
          <div className="fh-card mt-6 flex items-start gap-3">
            <Icon name="reminder" size={24} />
            <div>
              <p className="fh-body-sm font-bold">We couldn&apos;t open this profile</p>
              <p className="fh-body-sm mt-1" style={{ color: "var(--color-fh-muted)" }}>
                {data?.group
                  ? "This person isn't part of that family group any more."
                  : "Your family's data store isn't connected yet. Once it is, everyone will appear here."}
              </p>
            </div>
          </div>
        )}

        {data?.ok && member && (
          <>
            {/* ── Header: who this is ─────────────────────────────────── */}
            <header className="mt-6 flex items-center gap-5">
              <span
                aria-hidden="true"
                className="flex shrink-0 items-center justify-center rounded-full font-[family-name:var(--font-body)] font-bold"
                style={{
                  width: 80,
                  height: 80,
                  backgroundColor: "var(--color-fh-surface)",
                  border: "1px solid var(--color-fh-border)",
                  color: "var(--color-fh-body)",
                  fontSize: "1.6rem",
                  letterSpacing: "0.06em",
                }}
              >
                {initials(member.display_name)}
              </span>
              <div className="min-w-0">
                <h1 className="fh-h2">{member.display_name}</h1>
                <span className="fh-chip mt-2 inline-flex capitalize">
                  {member.relationship.replace("_", " ")}
                </span>
              </div>
            </header>

            {/* ── How we're doing ─────────────────────────────────────── */}
            <section className="fh-card mt-7" aria-labelledby="how-were-doing">
              <h2 id="how-were-doing" className="fh-h3">
                How we&apos;re doing
              </h2>

              {data.score && data.partner ? (
                <>
                  <p
                    className="fh-body-sm mt-2"
                    style={{ color: "var(--color-fh-muted)" }}
                  >
                    {WARM_BAND_COPY[data.score.category]}
                  </p>

                  <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2">
                    <WarmthMeter score={data.score.score} />
                    <span
                      className="tabular-nums"
                      style={{
                        fontFamily: "var(--font-body)",
                        fontWeight: 700,
                        fontSize: "1.125rem",
                      }}
                    >
                      {data.score.score} / 100
                    </span>
                  </div>

                  <p className="fh-caption mt-4">
                    last talked · {formatDaysAgo(data.lastTalkedDays)}
                  </p>
                  <p className="fh-caption mt-1 inline-flex items-center gap-2">
                    <TrendArrow trend={data.score.factors.trend} />
                    {trendLine(data.score.factors.trend)}
                  </p>
                  <p className="fh-caption mt-1">
                    {data.viewer
                      ? `between you and ${member.display_name}`
                      : data.isSelf
                        ? `between ${data.partner.display_name} and you`
                        : `between ${data.partner.display_name} and ${member.display_name}`}
                  </p>

                  {data.viewer && (
                    <button
                      onClick={() => setHelloOpen(true)}
                      className="fh-btn fh-btn-primary mt-5 w-full"
                      style={{ minHeight: 60 }}
                    >
                      <Icon name="warm" size={20} />
                      Send a gentle hello
                    </button>
                  )}
                  {isSelf && (
                    <p className="fh-caption mt-2">
                      This is your own card. Open anyone else in the family to
                      see how you&apos;re doing together — and to send them a
                      hello.
                    </p>
                  )}
                  {!data.viewer && !isSelf && (
                    <p className="fh-caption mt-2">
                      Open this from your own family home and you can send{" "}
                      {first} a hello.
                    </p>
                  )}
                </>
              ) : (
                <div className="mt-4 flex items-start gap-3">
                  <IconChip name="clock" size={20} />
                  <p className="fh-body-sm" style={{ color: "var(--color-fh-muted)" }}>
                    No connection history yet — a gentle hello is a good place
                    to begin.
                  </p>
                </div>
              )}
            </section>

            {/* ── A little rhythm ─────────────────────────────────────── */}
            <section className="mt-8 flex items-start gap-4" aria-labelledby="rhythm">
              <IconChip name="clock" size={20} className="mt-0.5" />
              <div className="min-w-0">
                <h2 id="rhythm" className="fh-label">
                  A little rhythm, gently kept
                </h2>
                <p
                  className="fh-body-sm mt-1"
                  style={{ color: "var(--color-fh-muted)" }}
                >
                  {data.rhythm
                    ? data.rhythm.sentence
                    : `A quiet season so far — a gentle hello could start a rhythm with ${first}.`}
                </p>
              </div>
            </section>

            {/* ── Moments we treasure ────────────────────────────────── */}
            <section className="mt-9" aria-labelledby="moments">
              <h2 id="moments" className="fh-h3">
                Moments we treasure
              </h2>
              <SketchUnderline className="mt-1.5" />

              {data.moments.length > 0 ? (
                <ul className="mt-5 flex flex-col gap-3">
                  {data.moments.map((moment) => (
                    <li
                      key={moment.id}
                      className="fh-nested flex items-start gap-3 p-4"
                    >
                      <IconChip
                        name={TYPE_ICON[moment.type]}
                        size={18}
                        className="mt-0.5"
                      />
                      <div className="min-w-0">
                        <p className="fh-body-sm font-bold">{moment.title}</p>
                        {moment.note && (
                          <p
                            className="fh-body-sm mt-0.5"
                            style={{ color: "var(--color-fh-muted)" }}
                          >
                            {moment.note}
                          </p>
                        )}
                        <p
                          className="fh-caption mt-1"
                          style={{ color: "#A08E7C" }}
                        >
                          {moment.dateLabel}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="fh-note mt-5 flex items-start gap-3">
                  <IconChip name="warm" size={18} />
                  <p className="fh-body-sm">
                    No moments kept yet. The first call or note you share will
                    find its place here.
                  </p>
                </div>
              )}
            </section>

            {/* ── Postcard teaser — a Premium idea, clearly not built ─── */}
            <section className="fh-note mt-6 flex items-start gap-3" aria-labelledby="postcard">
              <IconChip name="nudge" size={18} className="mt-0.5" />
              <div className="min-w-0">
                <h2
                  id="postcard"
                  className="fh-label flex flex-wrap items-center gap-2"
                >
                  A card in the post
                  <span className="fh-chip">With Premium</span>
                </h2>
                <p
                  className="fh-body-sm mt-1"
                  style={{ color: "var(--color-fh-muted)" }}
                >
                  &ldquo;For {first}, with love&rdquo; — a card written here,
                  printed and posted, so it lands on the doormat.
                </p>
                <p className="fh-caption mt-1">
                  Not available yet — this is a look at what Premium will bring.
                </p>
              </div>
            </section>

            <footer className="mt-12">
              <HandDivider className="mb-5" />
              <p className="fh-caption text-center">
                every connection here is private — metadata only, never content
              </p>
            </footer>
          </>
        )}

        {/* ── Send a gentle hello ─────────────────────────────────────── */}
        {helloOpen && member && (
          <div
            className="fh-backdrop fixed inset-0 z-50 flex items-end justify-center sm:items-center"
            role="dialog"
            aria-modal="true"
            aria-labelledby="hello-title"
            onClick={closeHello}
          >
            <div
              className="fh-sheet w-full max-w-md p-6"
              style={{
                backgroundColor: "var(--color-fh-bg)",
                borderRadius:
                  "var(--radius-card-soft) var(--radius-card-soft) 0 0",
              }}
              onClick={(event) => event.stopPropagation()}
            >
              {sent?.ok ? (
                <>
                  <h2 id="hello-title" className="fh-h3 flex items-center gap-2.5">
                    <Icon name="warm" size={24} />
                    Your hello is on its way
                  </h2>
                  <p className="fh-body mt-3">
                    It will be waiting for {member.display_name} next time they
                    open Family Core
                    {sent.emailed ? ", and a copy is on its way to their inbox" : ""}
                    .
                  </p>
                  <p className="fh-caption mt-3">
                    Family Core only passes the hello along — it never reads
                    what families say to each other.
                  </p>
                  <button
                    onClick={closeHello}
                    className="fh-btn fh-btn-primary mt-6 w-full"
                    style={{ minHeight: 60 }}
                  >
                    Close
                  </button>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between gap-4">
                    <h2
                      id="hello-title"
                      className="fh-h3 flex items-center gap-2.5"
                    >
                      <Icon name="warm" size={24} />
                      Send a gentle hello
                    </h2>
                    <button
                      onClick={closeHello}
                      className="fh-btn fh-btn-quiet"
                      style={{ minHeight: 44, minWidth: 44 }}
                      aria-label="Close"
                    >
                      Close
                    </button>
                  </div>

                  <p className="fh-body-sm mt-3">
                    This will be waiting for{" "}
                    <strong style={{ color: "var(--color-fh-body)" }}>{name}</strong>{" "}
                    next time they open Family Core
                    {member.account_id ? " or check their inbox" : ""}.
                  </p>

                  <label
                    htmlFor="hello-note"
                    className="fh-label mt-5 block"
                  >
                    Add a few of your own words{" "}
                    <span className="fh-caption">(optional)</span>
                  </label>
                  <textarea
                    id="hello-note"
                    className="fh-input mt-2"
                    rows={3}
                    maxLength={600}
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    placeholder={`Hello ${first}, thinking of you…`}
                  />
                  <p className="fh-caption mt-2">
                    Leave it blank and we&apos;ll send a warm hello in your name —
                    you don&apos;t have to write a word.
                  </p>

                  {error && <p className="fh-alert-error mt-4">{error}</p>}

                  <button
                    onClick={handleSend}
                    disabled={sending}
                    className="fh-btn fh-btn-primary mt-5 w-full"
                    style={{ minHeight: 60 }}
                  >
                    <Icon name="nudge" size={20} />
                    {sending ? "Sending…" : "Send the hello"}
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </main>
    </PageTurn>
  );
}
