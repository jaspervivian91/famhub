import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { joinWaitlist } from "~/lib/waitlist-api";
import { Logo } from "~/components/Logo";

export const Route = createFileRoute("/")({
  component: LandingPage,
});

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
    <div className="relative min-h-dvh" style={{ backgroundColor: "#F5F0EB" }}>
      {/* ── Structural grid lines ────────────────────────────── */}
      {/* Left margin guide */}
      <div
        className="pointer-events-none fixed inset-y-0 z-0"
        style={{
          left: "24px",
          width: "0",
          borderLeft: "0.5px dashed #EDEDEA",
        }}
      />
      {/* Right margin guide */}
      <div
        className="pointer-events-none fixed inset-y-0 z-0"
        style={{
          right: "24px",
          width: "0",
          borderRight: "0.5px dashed #EDEDEA",
        }}
      />
      {/* Center guide */}
      <div
        className="pointer-events-none fixed inset-y-0 z-0"
        style={{
          left: "50%",
          width: "0",
          borderLeft: "0.3px dashed #EDEDEA",
        }}
      />

      {/* ── Top ruled line with crosshair markers ────────────── */}
      <div
        className="pointer-events-none fixed left-6 right-6 top-[60px] z-10 border-t"
        style={{ borderColor: "#1A1A1A", borderWidth: "0.5px" }}
      />
      {/* Crosshair top-left */}
      <div
        className="pointer-events-none fixed z-10"
        style={{ left: "24px", top: "50px" }}
      >
        <div
          style={{
            width: "1.5px",
            height: "20px",
            backgroundColor: "#1A1A1A",
            margin: "0 auto",
          }}
        />
        <div
          style={{
            width: "20px",
            height: "1.5px",
            backgroundColor: "#1A1A1A",
            position: "absolute",
            top: "10px",
            left: "-9px",
          }}
        />
      </div>
      {/* Crosshair top-right */}
      <div
        className="pointer-events-none fixed z-10"
        style={{ right: "24px", top: "50px" }}
      >
        <div
          style={{
            width: "1.5px",
            height: "20px",
            backgroundColor: "#1A1A1A",
            margin: "0 auto",
          }}
        />
        <div
          style={{
            width: "20px",
            height: "1.5px",
            backgroundColor: "#1A1A1A",
            position: "absolute",
            top: "10px",
            left: "-9px",
          }}
        />
      </div>

      {/* ── Main content ─────────────────────────────────────── */}
      <main className="relative z-10 mx-auto flex min-h-dvh max-w-[327px] flex-col items-center px-0 pt-[120px] pb-16">
        {/* Logo — stacked variant */}
        <div className="mb-12">
          <Logo variant="stacked" size="xl" />
        </div>

        {/* Heading */}
        <h1
          className="text-center leading-none"
          style={{
            fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
            fontSize: "32px",
            fontWeight: 800,
            color: "#1A1A1A",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          FAMILY
          <br />
          HUB
        </h1>

        {/* Ruled line under heading */}
        <div
          className="my-4 w-[175px]"
          style={{ borderTop: "0.5px solid #1A1A1A" }}
        />

        {/* Subline */}
        <p
          style={{
            fontFamily: "'JetBrains Mono', 'SF Mono', 'Courier New', monospace",
            fontSize: "11px",
            fontWeight: 400,
            color: "#1A1A1A",
            letterSpacing: "2px",
            textTransform: "uppercase",
          }}
        >
          PRIVATE • AI-POWERED • FAMILY
        </p>

        {/* Body text */}
        <p
          className="mt-10 text-center leading-relaxed"
          style={{
            fontFamily: "'JetBrains Mono', 'SF Mono', 'Courier New', monospace",
            fontSize: "11px",
            fontWeight: 400,
            color: "#1A1A1A",
            letterSpacing: "1px",
          }}
        >
          THE APP THAT STRENGTHENS
          <br />
          YOUR FAMILY CONNECTIONS
          <br />
          BY HELPING YOU PUT YOUR
          <br />
          PHONE DOWN.
        </p>

        {/* Dot markers */}
        <div className="mt-6 flex gap-2">
          <div className="h-[3px] w-[3px]" style={{ backgroundColor: "#1A1A1A", opacity: 0.3 }} />
          <div className="h-[3px] w-[3px]" style={{ backgroundColor: "#1A1A1A", opacity: 0.3 }} />
        </div>

        {/* ── Primary CTA ─────────────────────────────────── */}
        <Link
          to="/sign-up"
          className="mt-10 flex items-center justify-center"
          style={{
            width: "275px",
            height: "50px",
            backgroundColor: "#C8603A",
            color: "#F5F0EB",
            fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
            fontSize: "13px",
            fontWeight: 700,
            letterSpacing: "0.3em",
            textTransform: "uppercase",
            border: "none",
            textDecoration: "none",
          }}
        >
          GET STARTED
        </Link>

        {/* ── Secondary CTA ──────────────────────────────── */}
        <Link
          to="/join"
          className="mt-5 flex items-center justify-center"
          style={{
            width: "275px",
            height: "50px",
            backgroundColor: "transparent",
            color: "#1A1A1A",
            fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
            fontSize: "12px",
            fontWeight: 600,
            letterSpacing: "0.25em",
            textTransform: "uppercase",
            border: "1.5px solid #1A1A1A",
            textDecoration: "none",
          }}
        >
          I HAVE AN INVITE
        </Link>

        {/* ── Waitlist (subtle, at bottom) ────────────────── */}
        <div className="mt-16 w-full">
          <div
            className="mb-4 w-full"
            style={{ borderTop: "0.5px solid #1A1A1A" }}
          />

          {waitlistStatus === "success" ? (
            <div
              className="p-3 text-center"
              style={{
                backgroundColor: "#EDEDEA",
                border: "0.5px solid #1A1A1A",
              }}
            >
              <p
                style={{
                  fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
                  fontSize: "11px",
                  fontWeight: 700,
                  color: "#1A1A1A",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                }}
              >
                You&apos;re on the list
              </p>
              <p
                className="mt-1"
                style={{
                  fontFamily: "'JetBrains Mono', 'SF Mono', 'Courier New', monospace",
                  fontSize: "9px",
                  color: "#1A1A1A",
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
                    backgroundColor: "#EDEDEA",
                    border: "1.5px solid #1A1A1A",
                    color: "#1A1A1A",
                    fontFamily: "'JetBrains Mono', 'SF Mono', 'Courier New', monospace",
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
                    backgroundColor: waitlistStatus === "submitting" ? "#EDEDEA" : "#1A1A1A",
                    color: waitlistStatus === "submitting" ? "#1A1A1A" : "#F5F0EB",
                    border: "1.5px solid #1A1A1A",
                    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
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
                    fontFamily: "'JetBrains Mono', 'SF Mono', 'Courier New', monospace",
                    fontSize: "9px",
                    color: "#C8603A",
                  }}
                >
                  {waitlistMessage}
                </p>
              )}
            </form>
          )}
        </div>
      </main>

      {/* ── Footer ──────────────────────────────────────────── */}
      <footer
        className="relative z-10 mx-auto max-w-[327px] pb-8"
      >
        <div
          className="mb-3 w-full"
          style={{ borderTop: "0.5px solid #1A1A1A" }}
        />
        {/* Dot indicators */}
        <div className="flex justify-center gap-1.5 mb-4">
          <div className="h-[6px] w-[6px]" style={{ backgroundColor: "#1A1A1A", opacity: 0.5 }} />
          <div className="h-[6px] w-[6px]" style={{ backgroundColor: "#1A1A1A", opacity: 0.3 }} />
          <div className="h-[6px] w-[6px]" style={{ backgroundColor: "#1A1A1A", opacity: 0.3 }} />
          <div className="h-[6px] w-[6px]" style={{ backgroundColor: "#1A1A1A", opacity: 0.3 }} />
        </div>
        <p
          className="text-center"
          style={{
            fontFamily: "'JetBrains Mono', 'SF Mono', 'Courier New', monospace",
            fontSize: "9px",
            color: "#1A1A1A",
            opacity: 0.5,
            letterSpacing: "0.06em",
          }}
        >
          FAMILY HUB &copy; {new Date().getFullYear()}
        </p>
      </footer>
    </div>
  );
}
