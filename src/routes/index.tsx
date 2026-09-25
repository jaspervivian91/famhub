import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { joinWaitlist } from "~/lib/waitlist-api";
import { Logo } from "~/components/Logo";
import { Icon } from "~/components/Icon";
import {
  HandDivider,
  SketchUnderline,
  Sprig,
  PageTurn,
} from "~/components/Warm";

export const Route = createFileRoute("/")({
  component: LandingPage,
});

/* ── The three quiet steps of how Family Core works ─────────────────── */
const HOW_IT_WORKS = [
  {
    icon: "reminder" as const,
    title: "We notice the silence",
    body: "Thirty days without a word, and we gently flag the relationship — nothing more. Frequency, recency and who reaches out first. Never what you said.",
  },
  {
    icon: "nudge" as const,
    title: "We nudge, gently",
    body: "One warm prompt to reach out. No streak counters, no badges, no notification storm — a single note, and then quiet.",
  },
  {
    icon: "heart" as const,
    title: "You reconnect for real",
    body: "You make the call, send the letter, take the walk. The app steps back and the bond grows stronger. That is the whole point.",
  },
];

/* ── A warm illustrated album card (no stock photography, per spec §8) ── */
function AlbumIllustration() {
  return (
    <figure className="fh-card-soft m-0 overflow-hidden p-0">
      <svg
        viewBox="0 0 360 200"
        className="block h-auto w-full"
        role="img"
        aria-label="Illustration of a warm golden-hour hillside"
      >
        <defs>
          <linearGradient id="fh-goldenhour" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#F5F0EB" />
            <stop offset="100%" stopColor="#E8D5C0" />
          </linearGradient>
        </defs>
        <rect width="360" height="200" fill="url(#fh-goldenhour)" />
        {/* low sun */}
        <circle cx="268" cy="66" r="26" fill="#D4845A" opacity="0.9" />
        {/* far hill */}
        <path
          d="M-10 162 C 60 124, 130 150, 196 140 C 258 131, 316 148, 370 138 L 370 210 L -10 210 Z"
          fill="#3A6B4A"
          opacity="0.9"
        />
        {/* near bank */}
        <path
          d="M-10 184 C 70 166, 150 190, 232 178 C 292 169, 330 181, 370 174 L 370 210 L -10 210 Z"
          fill="#1A1A1A"
          opacity="0.75"
        />
        {/* hand-drawn grass ticks */}
        <path
          d="M44 176 C 46 168, 48 164, 50 160 M56 178 C 58 171, 61 167, 63 163"
          stroke="#1A1A1A"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.45"
        />
        {/* two figures, drawn by hand */}
        <path
          d="M150 168 C 150 156, 154 150, 158 150 C 162 150, 166 156, 166 168"
          stroke="#1A1A1A"
          strokeWidth="2.4"
          strokeLinecap="round"
          fill="none"
        />
        <circle cx="158" cy="143" r="7" stroke="#1A1A1A" strokeWidth="2.4" />
        <path
          d="M176 170 C 176 159, 180 153, 183 153 C 186 153, 190 159, 190 170"
          stroke="#1A1A1A"
          strokeWidth="2.4"
          strokeLinecap="round"
          fill="none"
        />
        <circle cx="183" cy="147" r="6" stroke="#1A1A1A" strokeWidth="2.4" />
        {/* held hands */}
        <path
          d="M166 158 C 170 160, 172 160, 176 158"
          stroke="#1A1A1A"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
      </svg>
      <figcaption className="fh-caption px-6 py-4">
        A place for your family&apos;s real photos — warm light, real moments,
        never a stock image.
      </figcaption>
    </figure>
  );
}

function LandingPage() {
  const [email, setEmail] = useState("");
  const [waitlistStatus, setWaitlistStatus] = useState<
    "idle" | "submitting" | "success" | "error"
  >("idle");
  const [waitlistMessage, setWaitlistMessage] = useState("");

  async function handleWaitlistSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;

    setWaitlistStatus("submitting");
    setWaitlistMessage("");

    try {
      const result = await joinWaitlist({ data: { email: email.trim() } });
      if (result.success) {
        setWaitlistStatus("success");
        setWaitlistMessage(result.message);
        setEmail("");
      } else {
        setWaitlistStatus("error");
        setWaitlistMessage(result.message);
      }
    } catch {
      setWaitlistStatus("error");
      setWaitlistMessage("Something went wrong. Please try again.");
    }
  }

  return (
    <PageTurn className="min-h-dvh">
      <main className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col px-5 pt-2 pb-14 md:max-w-[680px] md:px-10">
        {/* ── Header — wordmark + sign in ─────────────────────────── */}
        <header className="flex items-center justify-between gap-4">
          <Logo variant="full" size="md" />
          <Link
            to="/sign-in"
            className="fh-body-sm fh-link"
            style={{ color: "var(--color-fh-muted)", textDecoration: "none" }}
          >
            Sign in
          </Link>
        </header>
        <HandDivider className="mt-3" dot />

        {/* ── Hero ────────────────────────────────────────────────── */}
        <section className="mt-10 flex flex-col items-center text-center md:mt-14">
          <Sprig />
          <h1 className="fh-hero mt-5 max-w-[9.5em]">
            Stay close to the people who{" "}
            <span style={{ color: "var(--color-fh-accent)" }}>matter</span>
          </h1>
          <SketchUnderline
            className="mt-3"
            color="var(--color-fh-highlight)"
          />
          <p className="fh-body mt-7 max-w-[34ch] text-left md:text-center">
            A private little home for your family&apos;s connection. No feeds, no
            likes — just gentle nudges to stay close, and the joy of real calls,
            letters and visits.
          </p>
        </section>

        {/* ── Warm album card ─────────────────────────────────────── */}
        <section className="mt-10">
          <AlbumIllustration />
        </section>

        {/* ── How it works ────────────────────────────────────────── */}
        <section className="mt-9">
          <div className="fh-card-soft">
            <h2 className="fh-h2">How it works</h2>
            <SketchUnderline className="mt-1.5" />
            <ul className="mt-6 flex flex-col gap-6">
              {HOW_IT_WORKS.map((step) => (
                <li key={step.title} className="flex items-start gap-4">
                  <span
                    className="flex items-center justify-center rounded-full"
                    style={{
                      width: 44,
                      height: 44,
                      backgroundColor: "var(--color-fh-surface-soft)",
                      border: "1px solid var(--color-fh-border)",
                    }}
                  >
                    <Icon name={step.icon} size={22} />
                  </span>
                  <div>
                    <h3 className="fh-h4">{step.title}</h3>
                    <p className="fh-body-sm mt-1" style={{ color: "var(--color-fh-muted)" }}>
                      {step.body}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ── Calls to action ─────────────────────────────────────── */}
        <section className="mt-9 flex flex-col items-stretch gap-3">
          <Link to="/sign-up" className="fh-btn fh-btn-primary w-full">
            Create your family home
          </Link>
          <Link to="/join" className="fh-btn fh-btn-secondary w-full">
            I have an invite
          </Link>
          <p className="fh-caption mt-1 text-center">
            Free for your whole family — no card needed.
          </p>
        </section>

        {/* ── The quiet promise ───────────────────────────────────── */}
        <section className="mt-10 px-2 text-center">
          <HandDivider className="mb-6" />
          <p className="fh-body-sm" style={{ color: "var(--color-fh-body)" }}>
            No feeds · No likes · No ads · No noise
          </p>
          <p className="fh-caption mx-auto mt-2 max-w-[30ch]">
            Metadata only — frequency, recency, initiation. We never read your
            messages. Never content.
          </p>
        </section>

        {/* ── Waitlist — kept from the previous page, in a quieter tone ── */}
        <section className="mt-10">
          <div className="fh-card">
            <h2 className="fh-h3">Not ready just yet?</h2>
            <p className="fh-body-sm mt-2" style={{ color: "var(--color-fh-muted)" }}>
              Leave your email and we&apos;ll write to you once — when Family
              Core is ready for your family.
            </p>
            {waitlistStatus === "success" ? (
              <div className="fh-note mt-4 flex items-start gap-3">
                <Icon name="check" size={22} />
                <p className="fh-body-sm">{waitlistMessage}</p>
              </div>
            ) : (
              <form onSubmit={handleWaitlistSubmit} className="mt-4">
                <label htmlFor="waitlist-email" className="fh-label mb-1.5 block">
                  Your email
                </label>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <input
                    id="waitlist-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="fh-input sm:flex-1"
                    required
                    disabled={waitlistStatus === "submitting"}
                  />
                  <button
                    type="submit"
                    disabled={waitlistStatus === "submitting"}
                    className="fh-btn fh-btn-sand"
                  >
                    {waitlistStatus === "submitting" ? "Sending…" : "Join the list"}
                  </button>
                </div>
                {waitlistStatus === "error" && (
                  <p
                    className="fh-body-sm mt-2"
                    style={{ color: "var(--color-fh-status-error)" }}
                  >
                    {waitlistMessage}
                  </p>
                )}
              </form>
            )}
          </div>
        </section>

        {/* ── Footer ──────────────────────────────────────────────── */}
        <footer className="mt-12">
          <HandDivider className="mb-6" dot />
          <nav className="flex items-center justify-center gap-5">
            <Link to="/privacy" className="fh-body-sm fh-link" style={{ textDecoration: "none" }}>
              Privacy
            </Link>
            <span aria-hidden="true" style={{ color: "var(--color-fh-line)" }}>
              ·
            </span>
            <Link to="/terms" className="fh-body-sm fh-link" style={{ textDecoration: "none" }}>
              Terms
            </Link>
          </nav>
          <p className="fh-caption mt-4 text-center">
            Family Core © {new Date().getFullYear()} — the app that puts your
            phone down.
          </p>
        </footer>
      </main>
    </PageTurn>
  );
}
