import { Link, createFileRoute, notFound } from "@tanstack/react-router";
import { useState } from "react";

import { getPublicHome } from "~/lib/public-home";

export const Route = createFileRoute("/h/$publicId")({
  loader: async ({ params }) => {
    const result = await getPublicHome({ data: { publicId: params.publicId } });
    // Unknown, unpublished or a malformed id: all the same quiet answer, and
    // never another home's data.
    if (!result.found) throw notFound();
    return result.home;
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: loaderData ? `${loaderData.address} — HomeStory` : "No page here — HomeStory" },
      {
        name: "description",
        content: loaderData
          ? `The story of ${loaderData.address}: its records, the people who have lived in it, and the chapter its owner has added.`
          : "There is no HomeStory page at this address.",
      },
    ],
  }),
  notFoundComponent: NoPageHere,
  component: PublicHomePage,
});

function NoPageHere() {
  return (
    <div className="hs-wrap py-24 md:py-32">
      <p className="hs-label">No page here</p>
      <h1 className="hs-h2 mt-4 max-w-[24ch]">
        There is no HomeStory page at this address.
      </h1>
      <p className="hs-caption mt-5 max-w-[46ch]">
        A home’s page is only reachable once its owner has published it. If you
        scanned a plaque at a front door, this home’s story is not public just
        now.
      </p>
      <p className="mt-10">
        <Link to="/" className="hs-link">
          HomeStory — every home has a story
        </Link>
      </p>
    </div>
  );
}

function PublicHomePage() {
  const home = Route.useLoaderData();

  /** "23 February 2026" — the certificate date, shown beside the attribution. */
  function formatEpcDate(iso: string): string {
    const date = new Date(`${iso.slice(0, 10)}T12:00:00Z`);
    if (Number.isNaN(date.getTime())) return iso;
    return date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  }

  const record = [
    { label: "Built", value: home.buildEra },
    { label: "Floor area", value: home.floorArea },
    { label: "EPC rating", value: home.epcRating },
    { label: "Walls", value: home.wallType },
    { label: "Roof", value: home.roofType },
    { label: "Windows", value: home.windowType },
    { label: "Last sale price", value: home.lastSalePrice },
    { label: "Last sold", value: home.lastSaleDate },
  ].filter((row): row is { label: string; value: string } => Boolean(row.value));

  // The licence requires the attribution wherever EPC-derived facts appear, so
  // it is shown whenever any value is still exactly as the register recorded it.
  const showEpcAttribution = home.epcFields.length > 0;
  const epcRecordedOn = home.epcRecordedOn ? formatEpcDate(home.epcRecordedOn) : "";

  return (
    <article className="hs-wrap pb-20 pt-10 md:pb-28 md:pt-16">
      {/* ── The door ────────────────────────────────────────────────── */}
      <header>
        <p className="hs-label">A HomeStory page</p>
        <h1 className="hs-h2 mt-4 max-w-[22ch] md:text-[3rem]">{home.address}</h1>
        <p className="hs-lede mt-5 max-w-[52ch]">
          The story of this house, kept by the people who live in it and passed on
          to whoever comes next.
        </p>
      </header>

      {/* ── The house ───────────────────────────────────────────────── */}
      {record.length > 0 && (
        <section className="mt-12 border-t border-hs-rule-brass pt-8 md:mt-16">
          <h2 className="hs-h3">The house</h2>
          <dl className="mt-6 grid gap-x-10 gap-y-6 sm:grid-cols-2">
            {record.map((row) => (
              <div key={row.label} className="border-b border-hs-rule pb-4">
                <dt className="hs-caption">{row.label}</dt>
                <dd className="mt-1 font-body text-lg text-hs-ink">{row.value}</dd>
              </div>
            ))}
          </dl>
          {showEpcAttribution && (
            <p className="hs-caption mt-6 max-w-[54ch]">
              Energy performance data from the EPC register (Open Government
              Licence v3.0), © Crown copyright
              {epcRecordedOn ? `. Certificate recorded ${epcRecordedOn}` : ""}.
            </p>
          )}
        </section>
      )}

      {/* ── Previous owners ─────────────────────────────────────────── */}
      {home.previousOwners && (
        <section className="mt-12 border-t border-hs-rule-brass pt-8 md:mt-16">
          <h2 className="hs-h3">Previous owners</h2>
          <p className="mt-5 max-w-[58ch] whitespace-pre-line font-body text-[1.0625rem] leading-[1.85] text-hs-ink">
            {home.previousOwners}
          </p>
        </section>
      )}

      {/* ── The owner's chapter ─────────────────────────────────────── */}
      {home.story && (
        <section className="mt-12 border-t border-hs-rule-brass pt-8 md:mt-16">
          <h2 className="hs-h3">The owner’s chapter</h2>
          <p className="mt-5 max-w-[58ch] whitespace-pre-line font-body text-[1.0625rem] leading-[1.85] text-hs-ink">
            {home.story}
          </p>
        </section>
      )}

      {/* ── Photographs ─────────────────────────────────────────────── */}
      {home.photos.length > 0 && (
        <section className="mt-12 border-t border-hs-rule-brass pt-8 md:mt-16">
          <h2 className="hs-h3">Photographs</h2>
          <div className="mt-6 grid gap-5 sm:grid-cols-2 sm:gap-6">
            {home.photos.map((photo) => (
              <div key={photo.id} className="aspect-[4/5] overflow-hidden bg-hs-surface">
                <img
                  src={photo.url}
                  alt={`A photograph of ${home.address}, added by its owner.`}
                  className="h-full w-full object-cover object-center"
                  loading="lazy"
                  decoding="async"
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Key dates ───────────────────────────────────────────────── */}
      {home.keyDates.length > 0 && (
        <section className="mt-12 border-t border-hs-rule-brass pt-8 md:mt-16">
          <h2 className="hs-h3">Key dates</h2>
          <dl className="mt-5">
            {home.keyDates.map((entry, index) => (
              <div
                key={`${entry.date}-${index}`}
                className="flex flex-col gap-1 border-b border-hs-rule py-4 sm:flex-row sm:items-baseline sm:gap-8"
              >
                <dt className="font-display text-xl text-hs-ink sm:w-32 sm:shrink-0">
                  {entry.date}
                </dt>
                <dd className="font-body text-base leading-[1.8] text-hs-ink">
                  {entry.label}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {/* ── Hidden gems ─────────────────────────────────────────────── */}
      {home.hiddenGems.length > 0 && (
        <section className="mt-12 border-t border-hs-rule-brass pt-8 md:mt-16">
          <h2 className="hs-h3">Hidden gems</h2>
          <ul className="mt-5">
            {home.hiddenGems.map((gem, index) => (
              <li
                key={index}
                className="border-b border-hs-rule py-4 font-body text-base leading-[1.8] text-hs-ink"
              >
                {gem}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ── Ask your house ──────────────────────────────────────────── */}
      <section className="mt-12 border-t border-hs-rule-brass pt-8 md:mt-16">
        <h2 className="hs-h3">Ask your house</h2>
        {home.premium ? (
          <>
            <p className="hs-caption mt-3 max-w-[50ch]">
              Ask about this house and it will answer from what this page records —
              and only from that.
            </p>
            <AskYourHouse publicId={home.publicId} connected={home.aiConnected} />
          </>
        ) : (
          <p className="hs-caption mt-3 max-w-[52ch]">
            This page is on the free tier. Ask Your House — where Claude answers a
            visitor’s questions from what this page records — is part of HomeStory
            Premium, a one-off £24.99 for the house, not a subscription.{" "}
            <Link
              to="/homes/$id/premium"
              params={{ id: home.publicId }}
              className="hs-link"
            >
              Add Premium to this house
            </Link>
            .
          </p>
        )}
      </section>

      {/* ── The plaque at the door ──────────────────────────────────── */}
      <section className="mt-12 border-t border-hs-rule pt-6 md:mt-16">
        <p className="hs-caption max-w-[52ch]">
          A brass plaque, engraved with this page’s QR code, can be mounted
          beside the front door so the story stays with the house.
        </p>
        <p className="mt-3">
          <Link to="/homes/$id/plaque" params={{ id: home.publicId }} className="hs-link">
            Reserve a plaque for this home
          </Link>
        </p>
      </section>

      <p className="hs-caption mt-14 border-t border-hs-rule pt-6">
        History narratives powered by Claude AI.
      </p>
    </article>
  );
}

type Answer = { question: string; text: string; declined?: boolean };

function AskYourHouse({ publicId, connected }: { publicId: string; connected: boolean }) {
  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [line, setLine] = useState<string | null>(null);

  async function ask(event: React.FormEvent) {
    event.preventDefault();
    const asked = question.trim();
    if (asked.length < 3 || asking) return;
    setLine(null);
    setAnswer(null);
    setAsking(true);
    try {
      const response = await fetch(`/api/public/${publicId}/ask`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question: asked }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        answer?: string;
        declined?: boolean;
        error?: string;
      };
      if (!response.ok || payload.error) {
        setLine(payload.error ?? "That question could not be answered just now.");
      } else if (payload.answer) {
        setAnswer({ question: asked, text: payload.answer, declined: payload.declined });
        setQuestion("");
      } else {
        setLine("That question could not be answered just now.");
      }
    } catch {
      setLine("That question could not be answered just now.");
    } finally {
      setAsking(false);
    }
  }

  if (!connected) {
    return (
      <div className="mt-6 border-t border-hs-rule pt-6">
        <p className="hs-caption max-w-[52ch]">
          Ask Your House is not connected yet. When Claude is connected, it will
          answer questions about this house from the page’s own records — and say
          plainly when the page does not record something, rather than guessing.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-6">
      <form onSubmit={ask} className="flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-6">
        <div className="flex-1">
          <label htmlFor="ask-your-house" className="hs-caption block">
            Your question
          </label>
          <input
            id="ask-your-house"
            type="text"
            value={question}
            placeholder="Who lived here in 1940?"
            className="hs-line-input hs-line-input-brass"
            maxLength={300}
            onChange={(event) => setQuestion(event.target.value)}
          />
        </div>
        <button
          type="submit"
          className="hs-btn hs-btn-ink w-full sm:w-auto"
          disabled={asking || question.trim().length < 3}
        >
          {asking ? "Looking…" : "Ask"}
        </button>
      </form>

      <p className="hs-caption mt-3" aria-live="polite">
        {asking ? "Claude is reading this page…" : ""}
      </p>

      {line && (
        <p className="hs-caption mt-4 max-w-[52ch] text-hs-ink" role="status">
          {line}
        </p>
      )}

      {answer && (
        <div className="mt-8 border-t border-hs-rule pt-6">
          <p className="font-body text-base italic text-hs-muted">{answer.question}</p>
          <p className="mt-4 max-w-[58ch] whitespace-pre-line font-body text-[1.0625rem] leading-[1.85] text-hs-ink">
            {answer.text}
          </p>
          <p className="hs-caption mt-4">Answered from this page’s records by Claude AI.</p>
        </div>
      )}
    </div>
  );
}
