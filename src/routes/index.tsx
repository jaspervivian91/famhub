import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { joinWaitlist } from "~/lib/waitlist-api";
import { Logo } from "~/components/Logo";

export const Route = createFileRoute("/")({
  component: LandingPage,
});

/* ── Shared inline style constants (kept in sync with brand spec) ───── */
const MONO =
  "'JetBrains Mono', 'SF Mono', 'Courier New', monospace";
const SANS = "Inter, ui-sans-serif, system-ui, sans-serif";
const INK = "#1A1A1A";
const CANVAS = "#F5F0EB";
const ACCENT = "#3A6B4A";
const SURFACE = "#EBF0EC";

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
    <div className="relative min-h-dvh" style={{ backgroundColor: CANVAS }}>
      {/* ── Structural grid lines (fixed, subtle guides only) ── */}
      {/* Left margin guide */}
      <div
        className="pointer-events-none fixed inset-y-0 z-0"
        style={{ left: "24px", width: "0", borderLeft: "0.5px dashed #EBF0EC" }}
      />
      {/* Right margin guide */}
      <div
        className="pointer-events-none fixed inset-y-0 z-0"
        style={{ right: "24px", width: "0", borderRight: "0.5px dashed #EBF0EC" }}
      />
      {/* Center guide */}
      <div
        className="pointer-events-none fixed inset-y-0 z-0"
        style={{ left: "50%", width: "0", borderLeft: "0.3px dashed #EBF0EC" }}
      />

      <main className="relative z-10 mx-auto flex min-h-dvh max-w-[327px] flex-col px-0 pt-8 pb-0">
        {/* ── 01 Header — in-flow spec strip (scrolls with page) ── */}
        <header className="pt-2">
          <div className="flex items-baseline justify-between">
            <span
              style={{
                fontFamily: MONO,
                fontSize: "8px",
                letterSpacing: "0.22em",
                color: INK,
                textTransform: "uppercase",
              }}
            >
              Family Core
            </span>
            <span
              style={{
                fontFamily: MONO,
                fontSize: "8px",
                letterSpacing: "0.22em",
                color: INK,
                textTransform: "uppercase",
                opacity: 0.55,
              }}
            >
              Private Network
            </span>
          </div>
          {/* Ruled line with square registration dots at both ends */}
          <div className="relative mt-3" style={{ borderTop: "1px solid #1A1A1A" }}>
            <div
              className="absolute"
              style={{
                width: "7px",
                height: "7px",
                backgroundColor: INK,
                top: "-4px",
                left: "-2px",
              }}
            />
            <div
              className="absolute"
              style={{
                width: "7px",
                height: "7px",
                backgroundColor: INK,
                top: "-4px",
                right: "-2px",
              }}
            />
          </div>
        </header>

        {/* ── 02 Hero — brand mark + core message ─────────────────── */}
        <section className="mt-14 flex flex-col items-center text-center">
          {/* Eyebrow */}
          <p
            style={{
              fontFamily: MONO,
              fontSize: "9px",
              letterSpacing: "0.3em",
              color: INK,
              opacity: 0.7,
              textTransform: "uppercase",
            }}
          >
            Private • AI-Powered • Family
          </p>

          {/* Logo — stacked variant */}
          <div className="mt-8">
            <Logo variant="stacked" size="xl" />
          </div>

          {/* Heading */}
          <h1
            className="mt-8"
            style={{
              fontFamily: SANS,
              fontSize: "30px",
              fontWeight: 800,
              color: INK,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              lineHeight: 1.16,
            }}
          >
            Stay Close
            <br />
            To The People
            <br />
            Who Matter.
          </h1>

          {/* Ruled line under heading — accent registration square at end */}
          <div className="relative mt-6" style={{ width: "175px", borderTop: "0.5px solid #1A1A1A" }}>
            <div
              className="absolute"
              style={{
                width: "7px",
                height: "7px",
                backgroundColor: ACCENT,
                top: "-3.5px",
                right: "0px",
              }}
            />
          </div>

          {/* Body */}
          <p
            className="mt-8 leading-relaxed"
            style={{
              fontFamily: MONO,
              fontSize: "11px",
              letterSpacing: "1px",
              color: INK,
              lineHeight: 1.9,
            }}
          >
            WE NOTICE WHEN FAMILIES DRIFT —
            <br />
            AND GENTLY NUDGE YOU BACK
            <br />
            TOGETHER. THE APP THAT PUTS
            <br />
            YOUR PHONE DOWN, AND YOUR
            <br />
            FAMILY FIRST.
          </p>

          {/* Dot markers */}
          <div className="mt-8 flex gap-2">
            <div className="h-[3px] w-[3px]" style={{ backgroundColor: INK, opacity: 0.5 }} />
            <div className="h-[3px] w-[3px]" style={{ backgroundColor: INK, opacity: 0.3 }} />
            <div className="h-[3px] w-[3px]" style={{ backgroundColor: INK, opacity: 0.3 }} />
          </div>
        </section>

        {/* ── 03 Operating principles — ruled spec table ──────────── */}
        <section className="mt-14">
          <div className="mb-2 flex items-baseline justify-between">
            <span
              style={{
                fontFamily: MONO,
                fontSize: "9px",
                letterSpacing: "0.2em",
                color: INK,
                textTransform: "uppercase",
              }}
            >
              Operating Principles
            </span>
            <span
              style={{
                fontFamily: MONO,
                fontSize: "9px",
                color: INK,
                opacity: 0.5,
              }}
            >
              FIG. 01
            </span>
          </div>
          <div style={{ borderTop: "1.5px solid #1A1A1A" }} />

          {/* 01 — DETECT */}
          <div className="py-4" style={{ borderBottom: "0.5px solid #1A1A1A" }}>
            <div className="flex items-baseline gap-3">
              <span
                style={{
                  fontFamily: MONO,
                  fontSize: "10px",
                  color: INK,
                  opacity: 0.5,
                }}
              >
                01
              </span>
              <span
                style={{
                  fontFamily: SANS,
                  fontSize: "11px",
                  fontWeight: 700,
                  color: INK,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                }}
              >
                Detect
              </span>
            </div>
            <p
              className="mt-2 pl-6"
              style={{
                fontFamily: MONO,
                fontSize: "9px",
                color: INK,
                opacity: 0.75,
                lineHeight: 1.8,
                letterSpacing: "0.02em",
              }}
            >
              WE NOTICE THE SILENCE. 30+ DAYS WITHOUT A WORD,
              THE RELATIONSHIP IS FLAGGED.
            </p>
          </div>

          {/* 02 — NUDGE */}
          <div className="py-4" style={{ borderBottom: "0.5px solid #1A1A1A" }}>
            <div className="flex items-baseline gap-3">
              <span
                style={{
                  fontFamily: MONO,
                  fontSize: "10px",
                  color: INK,
                  opacity: 0.5,
                }}
              >
                02
              </span>
              <span
                style={{
                  fontFamily: SANS,
                  fontSize: "11px",
                  fontWeight: 700,
                  color: INK,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                }}
              >
                Nudge
              </span>
            </div>
            <p
              className="mt-2 pl-6"
              style={{
                fontFamily: MONO,
                fontSize: "9px",
                color: INK,
                opacity: 0.75,
                lineHeight: 1.8,
                letterSpacing: "0.02em",
              }}
            >
              A PRIVATE, GENTLE SIGNAL. ONE CLEAR PROMPT —
              NEVER A NOTIFICATION STORM.
            </p>
          </div>

          {/* 03 — RECONNECT */}
          <div className="py-4" style={{ borderBottom: "0.5px solid #1A1A1A" }}>
            <div className="flex items-baseline gap-3">
              <span
                style={{
                  fontFamily: MONO,
                  fontSize: "10px",
                  color: INK,
                  opacity: 0.5,
                }}
              >
                03
              </span>
              <span
                style={{
                  fontFamily: SANS,
                  fontSize: "11px",
                  fontWeight: 700,
                  color: INK,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                }}
              >
                Reconnect
              </span>
            </div>
            <p
              className="mt-2 pl-6"
              style={{
                fontFamily: MONO,
                fontSize: "9px",
                color: INK,
                opacity: 0.75,
                lineHeight: 1.8,
                letterSpacing: "0.02em",
              }}
            >
              YOU MAKE THE CALL. THE APP STEPS BACK,
              THE BOND GROWS STRONGER.
            </p>
          </div>
        </section>

        {/* ── 04 Trust band — the anti-social-media promise ───────── */}
        <section
          className="mt-14 px-2 py-6 text-center"
          style={{ borderTop: "0.5px solid #1A1A1A", borderBottom: "0.5px solid #1A1A1A" }}
        >
          <p
            style={{
              fontFamily: MONO,
              fontSize: "9px",
              letterSpacing: "0.1em",
              color: INK,
              textTransform: "uppercase",
            }}
          >
            No feeds • No likes • No ads • No noise
          </p>
          <p
            className="mt-2"
            style={{
              fontFamily: MONO,
              fontSize: "9px",
              letterSpacing: "0.06em",
              color: INK,
              opacity: 0.55,
              textTransform: "uppercase",
            }}
          >
            Metadata only — frequency, recency, initiation. Never content.
          </p>
        </section>

        {/* ── 05 Calls to action ──────────────────────────────────── */}
        <section className="mt-14 flex flex-col items-center">
          <Link
            to="/sign-up"
            className="flex items-center justify-center"
            style={{
              width: "100%",
              height: "54px",
              backgroundColor: ACCENT,
              color: CANVAS,
              fontFamily: SANS,
              fontSize: "13px",
              fontWeight: 700,
              letterSpacing: "0.3em",
              textTransform: "uppercase",
              border: "none",
              textDecoration: "none",
            }}
          >
            Get Started
          </Link>
          <p
            className="mt-2"
            style={{
              fontFamily: MONO,
              fontSize: "8px",
              letterSpacing: "0.15em",
              color: INK,
              opacity: 0.55,
              textTransform: "uppercase",
            }}
          >
            Free tier — no card required
          </p>
          <Link
            to="/join"
            className="mt-5 flex items-center justify-center"
            style={{
              width: "100%",
              height: "52px",
              backgroundColor: "transparent",
              color: INK,
              fontFamily: SANS,
              fontSize: "12px",
              fontWeight: 600,
              letterSpacing: "0.25em",
              textTransform: "uppercase",
              border: "1.5px solid #1A1A1A",
              textDecoration: "none",
            }}
          >
            I Have An Invite
          </Link>
        </section>

        {/* ── 06 Waitlist (subtle, at bottom) ─────────────────────── */}
        <section className="mt-14">
          <div className="mb-2 flex items-baseline justify-between">
            <span
              style={{
                fontFamily: MONO,
                fontSize: "9px",
                letterSpacing: "0.2em",
                color: INK,
                textTransform: "uppercase",
              }}
            >
              Join The Waitlist
            </span>
            <span
              style={{
                fontFamily: MONO,
                fontSize: "9px",
                color: INK,
                opacity: 0.5,
              }}
            >
              FORM 01
            </span>
          </div>
          <div style={{ borderTop: "1.5px solid #1A1A1A" }} />
          <div className="mt-5">
            {waitlistStatus === "success" ? (
              <div
                className="p-3 text-center"
                style={{
                  backgroundColor: SURFACE,
                  border: "0.5px solid #1A1A1A",
                }}
              >
                <p
                  style={{
                    fontFamily: SANS,
                    fontSize: "11px",
                    fontWeight: 700,
                    color: INK,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                  }}
                >
                  You&apos;re on the list
                </p>
                <p
                  className="mt-1"
                  style={{
                    fontFamily: MONO,
                    fontSize: "9px",
                    color: INK,
                    opacity: 0.6,
                  }}
                >
                  {waitlistMessage}
                </p>
              </div>
            ) : (
              <form onSubmit={handleWaitlistSubmit} className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="flex-1 px-3 py-2"
                    style={{
                      backgroundColor: SURFACE,
                      border: "1.5px solid #1A1A1A",
                      color: INK,
                      fontFamily: MONO,
                      fontSize: "11px",
                      outline: "none",
                    }}
                    required
                    disabled={waitlistStatus === "submitting"}
                  />
                  <button
                    type="submit"
                    disabled={waitlistStatus === "submitting"}
                    className="px-4 py-2"
                    style={{
                      backgroundColor: waitlistStatus === "submitting" ? SURFACE : INK,
                      color: waitlistStatus === "submitting" ? INK : CANVAS,
                      border: "1.5px solid #1A1A1A",
                      fontFamily: SANS,
                      fontSize: "10px",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      cursor: waitlistStatus === "submitting" ? "default" : "pointer",
                    }}
                  >
                    {waitlistStatus === "submitting" ? "..." : "JOIN"}
                  </button>
                </div>
                {waitlistStatus === "error" && (
                  <p
                    style={{
                      fontFamily: MONO,
                      fontSize: "9px",
                      color: ACCENT,
                    }}
                  >
                    {waitlistMessage}
                  </p>
                )}
              </form>
            )}
          </div>
        </section>

        {/* ── 07 Footer ───────────────────────────────────────────── */}
        <footer className="mt-14 pb-10">
          <div style={{ borderTop: "0.5px solid #1A1A1A" }} />
          {/* Footer links */}
          <div className="mt-5 flex items-center justify-center gap-2.5">
            <Link
              to="/privacy"
              style={{
                fontFamily: MONO,
                fontSize: "9px",
                letterSpacing: "0.12em",
                color: INK,
                opacity: 0.7,
                textTransform: "uppercase",
                textDecoration: "none",
              }}
            >
              Privacy
            </Link>
            <div className="h-[3px] w-[3px]" style={{ backgroundColor: INK, opacity: 0.3 }} />
            <Link
              to="/terms"
              style={{
                fontFamily: MONO,
                fontSize: "9px",
                letterSpacing: "0.12em",
                color: INK,
                opacity: 0.7,
                textTransform: "uppercase",
                textDecoration: "none",
              }}
            >
              Terms
            </Link>
            <div className="h-[3px] w-[3px]" style={{ backgroundColor: INK, opacity: 0.3 }} />
            <Link
              to="/sign-in"
              style={{
                fontFamily: MONO,
                fontSize: "9px",
                letterSpacing: "0.12em",
                color: INK,
                opacity: 0.7,
                textTransform: "uppercase",
                textDecoration: "none",
              }}
            >
              Sign In
            </Link>
          </div>
          {/* Dot indicators */}
          <div className="mt-5 flex justify-center gap-1.5">
            <div className="h-[6px] w-[6px]" style={{ backgroundColor: INK, opacity: 0.5 }} />
            <div className="h-[6px] w-[6px]" style={{ backgroundColor: INK, opacity: 0.3 }} />
            <div className="h-[6px] w-[6px]" style={{ backgroundColor: INK, opacity: 0.3 }} />
            <div className="h-[6px] w-[6px]" style={{ backgroundColor: INK, opacity: 0.3 }} />
          </div>
          <p
            className="mt-3 text-center"
            style={{
              fontFamily: MONO,
              fontSize: "9px",
              color: INK,
              opacity: 0.5,
              letterSpacing: "0.06em",
            }}
          >
            FAMILY CORE &copy; {new Date().getFullYear()}
          </p>
        </footer>
      </main>
    </div>
  );
}
