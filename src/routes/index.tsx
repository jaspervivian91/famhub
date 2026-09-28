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
        aria-label="Illustration of two hands cupping a warm mug of tea"
      >
        <title>
          Two hands cupping a warm mug of tea — a cosy family moment
        </title>
        <desc>
          Soft children's-book illustration: warm cream lamplight, a cream mug
          of tea held in two rounded hands, terracotta steam, a small pressed
          flower on the table.
        </desc>
        <defs>
          {/*warm cream-to-sand vertical wash (the card's own little sky/table)*/}
          <linearGradient id="hero-base" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#F7F2EC" />
            <stop offset="46%" stopColor="#F1E4D2" />
            <stop offset="100%" stopColor="#E9D5BE" />
          </linearGradient>
          {/*warm lamp glow behind the mug (terracotta at low alpha — a moment of warmth)*/}
          <radialGradient id="hero-glow" cx="0.5" cy="0.42" r="0.62">
            <stop offset="0%" stopColor="#D4845A" stopOpacity="0.16" />
            <stop offset="60%" stopColor="#D4845A" stopOpacity="0.07" />
            <stop offset="100%" stopColor="#D4845A" stopOpacity="0" />
          </radialGradient>
        </defs>
        {/*── background ───────────────────────────────────────────────*/}
        <rect width="360" height="200" fill="url(#hero-base)" />
        {/*warm lamp glow*/}
        <circle cx="180" cy="96" r="124" fill="url(#hero-glow)" />
        {/*soft dust-motes / bokeh*/}
        <circle cx="58" cy="54" r="5" fill="#E8D5C0" opacity="0.6" />
        <circle cx="300" cy="42" r="7" fill="#E8D5C0" opacity="0.5" />
        <circle cx="314" cy="90" r="3.5" fill="#D8C6AF" opacity="0.5" />
        <circle cx="42" cy="118" r="3.5" fill="#D8C6AF" opacity="0.45" />
        <circle cx="258" cy="30" r="4" fill="#E8D5C0" opacity="0.5" />
        <ellipse
          cx="330"
          cy="138"
          rx="6"
          ry="3.8"
          fill="#D8C6AF"
          opacity="0.4"
        />
        <ellipse cx="28" cy="68" rx="5" ry="3.2" fill="#E8D5C0" opacity="0.5" />
        <circle cx="132" cy="26" r="2.5" fill="#D4845A" opacity="0.3" />
        <circle cx="236" cy="22" r="2" fill="#D4845A" opacity="0.25" />
        {/*faint cloth-edge lines, drawn by hand*/}
        <path
          d="M26 148 C 46 145, 70 146, 96 149"
          stroke="#D8C6AF"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
          opacity="0.6"
        />
        <path
          d="M264 149 C 292 146, 316 145, 334 148"
          stroke="#D8C6AF"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
          opacity="0.6"
        />
        {/*── saucer + shadows on the table ─────────────────────────────*/}
        <ellipse
          cx="180"
          cy="163"
          rx="70"
          ry="10"
          fill="#1A1A1A"
          opacity="0.06"
        />
        <ellipse cx="180" cy="152" rx="66" ry="12" fill="#F0E4D3" />
        <ellipse
          cx="180"
          cy="152"
          rx="66"
          ry="12"
          fill="none"
          stroke="#D8C6AF"
          strokeWidth="1.6"
          opacity="0.75"
        />
        <ellipse
          cx="180"
          cy="150"
          rx="40"
          ry="7"
          fill="#EAD9C0"
          opacity="0.8"
        />
        <ellipse
          cx="180"
          cy="157.5"
          rx="40"
          ry="6"
          fill="#1A1A1A"
          opacity="0.07"
        />
        {/*── sleeves (rounded blobs — no stick arms) ───────────────────*/}
        {/*left, forest-green knit*/}
        <path
          d="M-12 208 C -12 192, -2 176, 10 168 C 30 156, 56 152, 78 154 C 92 155, 100 159, 104 166 C 106 174, 106 190, 105 208 Z"
          fill="#3A6B4A"
          stroke="#1A1A1A"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="1"
          strokeOpacity="0.14"
        />
        {/*right, warm sand knit*/}
        <path
          d="M372 208 C 372 192, 362 176, 350 168 C 330 156, 304 152, 282 154 C 268 155, 260 159, 256 166 C 254 174, 254 190, 255 208 Z"
          fill="#D9BD9B"
          stroke="#1A1A1A"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="1"
          strokeOpacity="0.15"
        />
        {/*── the mug ───────────────────────────────────────────────────*/}
        <path
          d="M142 84 C 138 104, 138 128, 143 142 C 145 150, 150 154, 158 154 L 202 154 C 210 154, 215 150, 217 142 C 222 128, 222 104, 218 84 Z"
          fill="#F8F3EC"
          stroke="#1A1A1A"
          strokeWidth="2"
          strokeLinecap="round"
          strokeOpacity="0.28"
        />
        {/*rim wall + tea*/}
        <ellipse
          cx="180"
          cy="80"
          rx="38"
          ry="8"
          fill="#E7D6BE"
          stroke="#1A1A1A"
          strokeWidth="1.6"
          strokeOpacity="0.22"
        />
        <ellipse cx="180" cy="80" rx="32.5" ry="6" fill="#B98F66" />
        <ellipse
          cx="171"
          cy="78.5"
          rx="9"
          ry="2.4"
          fill="#F5EAD9"
          opacity="0.85"
        />
        {/*forest band + tiny terracotta heart*/}
        <path
          d="M139.8 100 C 156 95.4, 204 95.4, 220.2 100 C 219.6 104, 219 107.8, 218.4 111.2 C 203 107.4, 157 107.4, 141.6 111.2 C 141 107.8, 140.2 104, 139.8 100 Z"
          fill="#3A6B4A"
        />
        <path
          d="M180 108.6 C 179.5 108.1, 178.3 107.2, 177.6 106.4 C 177 105.7, 176.9 104.9, 177.4 104.4 C 177.9 103.9, 178.5 104, 178.9 104.4 C 179.3 104.8, 179.7 105.2, 180 105.6 C 180.3 105.2, 180.7 104.8, 181.1 104.4 C 181.5 104, 182.1 103.9, 182.6 104.4 C 183.1 104.9, 183 105.7, 182.4 106.4 C 181.7 107.2, 180.5 108.1, 180 108.6 Z"
          fill="#D4845A"
        />
        {/*── hands, rounded and warm (mitten blobs, no fingers) ────────*/}
        <path
          d="M110 158 C 112 144, 120 133, 132 129 C 142 125.5, 152 127.5, 157 132.5 C 162 137.5, 160 147, 154 152 C 146 159, 134 163, 122 163 C 114 163, 110 161, 110 158 Z"
          fill="#D3A17E"
          stroke="#1A1A1A"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeOpacity="0.28"
        />
        <path
          d="M250 158 C 248 144, 240 133, 228 129 C 218 125.5, 208 127.5, 203 132.5 C 198 137.5, 200 147, 206 152 C 214 159, 226 163, 238 163 C 246 163, 250 161, 250 158 Z"
          fill="#D3A17E"
          stroke="#1A1A1A"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeOpacity="0.28"
        />
        {/*thumb folds + finger creases*/}
        <path
          d="M118 128 C 122 123, 128 122, 132 124"
          stroke="#1A1A1A"
          strokeWidth="1.5"
          fill="none"
          strokeLinecap="round"
          opacity="0.18"
        />
        <path
          d="M242 128 C 238 123, 232 122, 228 124"
          stroke="#1A1A1A"
          strokeWidth="1.5"
          fill="none"
          strokeLinecap="round"
          opacity="0.18"
        />
        <path
          d="M126 146 C 132 142, 140 142, 145 145"
          stroke="#1A1A1A"
          strokeWidth="1.5"
          fill="none"
          strokeLinecap="round"
          opacity="0.2"
        />
        <path
          d="M234 146 C 228 142, 220 142, 215 145"
          stroke="#1A1A1A"
          strokeWidth="1.5"
          fill="none"
          strokeLinecap="round"
          opacity="0.2"
        />
        {/*knit-stitch ticks on the cuffs*/}
        <path
          d="M90 158 C 93 155.5, 97 154.5, 100 155"
          stroke="#F0E4D3"
          strokeWidth="1.8"
          fill="none"
          strokeLinecap="round"
          opacity="0.9"
        />
        <path
          d="M92 162 C 95 159.8, 98 159, 101 159.3"
          stroke="#F0E4D3"
          strokeWidth="1.8"
          fill="none"
          strokeLinecap="round"
          opacity="0.9"
        />
        <path
          d="M262 157 C 259 154.5, 255 153.8, 252 154.2"
          stroke="#B38F6B"
          strokeWidth="1.8"
          fill="none"
          strokeLinecap="round"
          opacity="0.75"
        />
        <path
          d="M260 161 C 257 158.8, 254 158.2, 251 158.6"
          stroke="#B38F6B"
          strokeWidth="1.8"
          fill="none"
          strokeLinecap="round"
          opacity="0.75"
        />
        {/*── pressed flower on the table, in front of the mug (terracotta, sparingly) ──*/}
        <ellipse
          cx="180"
          cy="180.5"
          rx="9"
          ry="2.4"
          fill="#1A1A1A"
          opacity="0.06"
        />
        <circle cx="180" cy="170.8" r="3.2" fill="#D4845A" opacity="0.95" />
        <circle cx="185.2" cy="174.2" r="3.2" fill="#D4845A" opacity="0.95" />
        <circle cx="183.2" cy="180.2" r="3.2" fill="#D4845A" opacity="0.95" />
        <circle cx="176.8" cy="180.2" r="3.2" fill="#D4845A" opacity="0.95" />
        <circle cx="174.8" cy="174.2" r="3.2" fill="#D4845A" opacity="0.95" />
        <circle cx="180" cy="176" r="2.6" fill="#F0E4D3" />
        {/*── steam (terracotta, soft) ──────────────────────────────────*/}
        <path
          d="M166 66 C 164 57, 168 50, 166 42 C 164 35, 168 28, 166 21"
          stroke="#D4845A"
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
          opacity="0.42"
        />
        <path
          d="M180 70 C 178 60, 183 52, 181 43 C 179 35, 183 27, 181 19"
          stroke="#D4845A"
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
          opacity="0.42"
        />
        <path
          d="M194 65 C 192 57, 196 50, 194 43 C 192 36, 195 30, 193.5 24"
          stroke="#D4845A"
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
          opacity="0.42"
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
          <SketchUnderline className="mt-3" color="var(--color-fh-highlight)" />
          <p className="fh-body mt-7 max-w-[34ch] text-left md:text-center">
            A private little home for your family&apos;s connection. No feeds,
            no likes — just gentle nudges to stay close, and the joy of real
            calls, letters and visits.
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
                    <p
                      className="fh-body-sm mt-1"
                      style={{ color: "var(--color-fh-muted)" }}
                    >
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
            <p
              className="fh-body-sm mt-2"
              style={{ color: "var(--color-fh-muted)" }}
            >
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
                <label
                  htmlFor="waitlist-email"
                  className="fh-label mb-1.5 block"
                >
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
                    {waitlistStatus === "submitting"
                      ? "Sending…"
                      : "Join the list"}
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
            <Link
              to="/privacy"
              className="fh-body-sm fh-link"
              style={{ textDecoration: "none" }}
            >
              Privacy
            </Link>
            <span aria-hidden="true" style={{ color: "var(--color-fh-line)" }}>
              ·
            </span>
            <Link
              to="/terms"
              className="fh-body-sm fh-link"
              style={{ textDecoration: "none" }}
            >
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
