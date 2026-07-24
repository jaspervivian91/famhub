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
    <div className="min-h-dvh bg-fh-bg">
      {/* ── Nav ──────────────────────────────────────────────── */}
      <nav className="border-b border-fh-border bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <Logo variant="icon" size="md" />
            <span className="text-xl font-bold text-fh-heading font-[family-name:var(--font-heading)]">Family Hub</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/sign-in"
              className="rounded-lg px-4 py-2 text-sm font-medium text-fh-body hover:bg-fh-surface hover:text-fh-heading"
            >
              Sign In
            </Link>
            <Link
              to="/sign-up"
              className="rounded-lg bg-fh-ember px-4 py-2 text-sm font-semibold text-white hover:bg-fh-ember/90"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ──────────────────────────────────────────────── */}
      <section className="mx-auto max-w-5xl px-6 pb-16 pt-20 text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-fh-hearth/50">
          <Logo variant="icon" size="xl" />
        </div>
        <h1 className="mx-auto max-w-3xl font-[family-name:var(--font-heading)] text-4xl tracking-tight text-fh-heading sm:text-5xl lg:text-6xl">
          Stay close to the people who matter —{" "}
          <span className="text-fh-tide">without social media</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-fh-muted">
          A private, AI-powered connection platform that strengthens family
          relationships. No feeds, no likes — just gentle nudges to reconnect.
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            to="/sign-up"
            className="rounded-xl bg-fh-ember px-8 py-4 text-lg font-semibold text-white shadow-sm hover:bg-fh-ember/90 transition-colors"
          >
            Get Started — It&apos;s Free
          </Link>
          <Link
            to="/sign-in"
            className="rounded-xl border-2 border-fh-border px-8 py-4 text-lg font-semibold text-fh-body hover:border-fh-muted hover:bg-fh-surface transition-colors"
          >
            Sign In
          </Link>
        </div>
      </section>

      {/* ── How It Works ──────────────────────────────────────── */}
      <section className="border-t border-fh-border bg-white py-20">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center font-[family-name:var(--font-heading)] text-3xl text-fh-heading">
            How It Works
          </h2>
          <p className="mt-3 text-center text-fh-muted">
            Three simple steps to bring your family closer together.
          </p>

          <div className="mt-14 grid gap-8 md:grid-cols-3">
            {/* Step 1 */}
            <div className="rounded-2xl border border-fh-border bg-fh-surface p-8 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-fh-hearth/40 text-3xl">
                👨‍👩‍👧‍👦
              </div>
              <h3 className="mt-5 font-[family-name:var(--font-heading)] text-xl text-fh-heading">
                1. Create your family hub
              </h3>
              <p className="mt-3 text-fh-muted leading-relaxed">
                Name your group and get a private invite code. Your family hub is
                your space — only people you invite can join.
              </p>
            </div>

            {/* Step 2 */}
            <div className="rounded-2xl border border-fh-border bg-fh-surface p-8 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-fh-tide/20 text-3xl">
                📨
              </div>
              <h3 className="mt-5 font-[family-name:var(--font-heading)] text-xl text-fh-heading">
                2. Invite your family
              </h3>
              <p className="mt-3 text-fh-muted leading-relaxed">
                Share the invite code with grandparents, cousins, everyone. One
                tap and they&apos;re in — no complicated setup.
              </p>
            </div>

            {/* Step 3 */}
            <div className="rounded-2xl border border-fh-border bg-fh-surface p-8 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-fh-dusk/20 text-3xl">
                💌
              </div>
              <h3 className="mt-5 font-[family-name:var(--font-heading)] text-xl text-fh-heading">
                3. Stay connected
              </h3>
              <p className="mt-3 text-fh-muted leading-relaxed">
                Get gentle AI nudges when relationships go quiet. The app
                succeeds when you put your phone down and make real contact.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Why Family Hub ────────────────────────────────────── */}
      <section className="border-t border-fh-border bg-fh-surface py-20">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center font-[family-name:var(--font-heading)] text-3xl text-fh-heading">
            Why Family Hub?
          </h2>
          <p className="mt-3 text-center text-fh-muted">
            Designed for families, not for engagement metrics.
          </p>

          <div className="mt-14 grid gap-6 sm:grid-cols-2">
            {/* Feature 1 */}
            <div className="rounded-2xl border border-fh-border bg-white p-6 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-fh-hearth/40 text-2xl">
                  🔒
                </div>
                <div>
                  <h3 className="font-[family-name:var(--font-heading)] text-lg text-fh-heading">
                    Privacy-first
                  </h3>
                  <p className="mt-2 text-fh-muted leading-relaxed">
                    We only analyze interaction patterns — frequency, recency,
                    initiation. We never read your messages or sell your data.
                    GDPR and COPPA compliant from day one.
                  </p>
                </div>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="rounded-2xl border border-fh-border bg-white p-6 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-fh-tide/20 text-2xl">
                  💌
                </div>
                <div>
                  <h3 className="font-[family-name:var(--font-heading)] text-lg text-fh-heading">
                    Smart nudges
                  </h3>
                  <p className="mt-2 text-fh-muted leading-relaxed">
                    AI detects when a relationship is cooling — before you even
                    notice. Get a gentle suggestion to send a quick hello or
                    share a photo.
                  </p>
                </div>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="rounded-2xl border border-fh-border bg-white p-6 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-fh-dusk/20 text-2xl">
                  👴
                </div>
                <div>
                  <h3 className="font-[family-name:var(--font-heading)] text-lg text-fh-heading">
                    Grandparent mode
                  </h3>
                  <p className="mt-2 text-fh-muted leading-relaxed">
                    A simplified, high-contrast, one-tap interface designed for
                    care-home grandparents. No complex menus — just the people
                    they love.
                  </p>
                </div>
              </div>
            </div>

            {/* Feature 4 */}
            <div className="rounded-2xl border border-fh-border bg-white p-6 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-fh-twilight/20 text-2xl">
                  🌍
                </div>
                <div>
                  <h3 className="font-[family-name:var(--font-heading)] text-lg text-fh-heading">
                    Multi-generational
                  </h3>
                  <p className="mt-2 text-fh-muted leading-relaxed">
                    Works across time zones and borders. Your family spans the
                    globe — Family Hub helps you feel like they&apos;re next
                    door.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Waitlist ──────────────────────────────────────────── */}
      <section className="border-t border-fh-border bg-white py-20">
        <div className="mx-auto max-w-xl px-6 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-fh-tide/20 text-3xl">
            📬
          </div>
          <h2 className="font-[family-name:var(--font-heading)] text-3xl text-fh-heading">
            Join the waitlist
          </h2>
          <p className="mt-3 text-fh-muted">
            Be the first to know when Family Hub launches. Early members get
            premium features free for the first year.
          </p>

          {waitlistStatus === "success" ? (
            <div className="mt-8 rounded-2xl border border-fh-tide/30 bg-fh-tide/10 p-6">
              <p className="text-lg font-semibold text-fh-tide">
                🎉 You&apos;re on the list!
              </p>
              <p className="mt-1 text-fh-tide/80">{waitlistMessage}</p>
            </div>
          ) : (
            <form
              onSubmit={handleWaitlistSubmit}
              className="mt-8 flex flex-col gap-3 sm:flex-row"
            >
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="flex-1 rounded-xl border border-fh-border px-5 py-4 text-fh-body placeholder-fh-muted focus:border-fh-tide focus:outline-none focus:ring-2 focus:ring-fh-tide/20"
                required
                disabled={waitlistStatus === "submitting"}
              />
              <button
                type="submit"
                disabled={waitlistStatus === "submitting"}
                className="rounded-xl bg-fh-tide px-8 py-4 font-semibold text-white hover:bg-fh-tide/90 focus:outline-none focus:ring-2 focus:ring-fh-tide/30 disabled:opacity-50 transition-colors"
              >
                {waitlistStatus === "submitting"
                  ? "Joining…"
                  : "Join Waitlist"}
              </button>
            </form>
          )}

          {waitlistStatus === "error" && (
            <p className="mt-3 text-sm text-gp-alert">{waitlistMessage}</p>
          )}
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────── */}
      <footer className="border-t border-fh-border bg-fh-surface py-10">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 px-6 sm:flex-row">
          <div className="flex items-center gap-2">
            <Logo variant="icon" size="sm" />
            <span className="text-sm font-medium text-fh-muted">
              Family Hub &copy; {new Date().getFullYear()}
            </span>
          </div>
          <div className="flex items-center gap-6">
            <Link
              to="/privacy"
              className="text-sm text-fh-muted hover:text-fh-body transition-colors"
            >
              Privacy
            </Link>
            <Link
              to="/terms"
              className="text-sm text-fh-muted hover:text-fh-body transition-colors"
            >
              Terms
            </Link>
            <a
              href="mailto:hello@familyhub.app"
              className="text-sm text-fh-muted hover:text-fh-body transition-colors"
            >
              Contact
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
