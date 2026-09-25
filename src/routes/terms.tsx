import { createFileRoute, Link } from "@tanstack/react-router";
import { Logo } from "~/components/Logo";

export const Route = createFileRoute("/terms")({
  component: TermsPage,
});

function TermsPage() {
  return (
    <div className="min-h-dvh bg-fh-bg">
      {/* ── Nav ──────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50" style={{ backgroundColor: "var(--color-fh-bg)", borderBottom: "1px solid var(--color-fh-line)" }}>
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2">
            <Logo variant="icon" size="md" />
            <span className="text-xl font-bold text-fh-heading font-[family-name:var(--font-heading)]">Family Core</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              to="/sign-in"
              className="fh-btn fh-btn-quiet"
            >
              Sign In
            </Link>
            <Link
              to="/sign-up"
              className="fh-btn fh-btn-primary" style={{ minHeight: 44, padding: "10px 18px" }}
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Content ──────────────────────────────────────────── */}
      <main className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="fh-h2">
          Terms of Service
        </h1>
        <p className="mt-2 text-fh-muted">
          Last updated: July 2026
        </p>

        <div className="fh-body mt-10 flex flex-col gap-10">
          {/* Acceptance */}
          <section>
            <h2 className="fh-h3 mb-4">
              Acceptance of terms
            </h2>
            <p>
              By creating an account or using Family Core, you agree to these
              terms. If you don&apos;t agree, that&apos;s okay — but please
              don&apos;t use the service. These terms apply to everyone: free
              users, premium subscribers, and anyone who visits our website.
            </p>
          </section>

          {/* Accounts */}
          <section>
            <h2 className="fh-h3 mb-4">Accounts</h2>
            <p className="mb-3">
              You&apos;re responsible for keeping your account secure. Use a
              strong password, don&apos;t share your credentials, and let us know
              immediately if you suspect unauthorized access.
            </p>
            <p>
              You must provide accurate information when creating an account.
              Don&apos;t impersonate someone else — your family should know
              it&apos;s really you.
            </p>
          </section>

          {/* Acceptable use */}
          <section>
            <h2 className="fh-h3 mb-4">
              Acceptable use
            </h2>
            <p className="mb-3">
              Family Core exists to bring families closer together. To keep it
              that way, you agree not to:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Harass or abuse others.</strong> No exceptions. This is a
                family platform.
              </li>
              <li>
                <strong>Spam or send unsolicited messages.</strong> Invite codes
                are for people you actually know and care about.
              </li>
              <li>
                <strong>Use Family Core for anything illegal.</strong> Pretty
                straightforward.
              </li>
              <li>
                <strong>Attempt to reverse-engineer or scrape</strong> the
                platform, its nudging algorithms, or other users&apos; data.
              </li>
            </ul>
            <p className="mt-3">
              In short: be kind, be genuine, and treat your family members the
              way you&apos;d want to be treated.
            </p>
          </section>

          {/* Privacy-first values */}
          <section>
            <h2 className="fh-h3 mb-4">
              Our privacy-first commitment
            </h2>
            <p>
              Family Core is not social media. We don&apos;t optimize for
              engagement, we don&apos;t show ads, and we don&apos;t sell your
              data. Our measure of success is this: the app succeeds when you put
              your phone down and reconnect with your family in real life. Read
              our{" "}
              <Link
                to="/privacy"
                className="fh-link"
              >
                Privacy Policy
              </Link>{" "}
              for the full picture.
            </p>
          </section>

          {/* AI nudges */}
          <section>
            <h2 className="fh-h3 mb-4">
              AI nudges — suggestions, not commands
            </h2>
            <p>
              Family Core uses AI to detect when family connections might be
              cooling and suggests nudges to help you reconnect. These are{" "}
              <strong>suggestions</strong>, not obligations. You know your family
              dynamics better than any algorithm — use your judgment about when
              and how to reach out. Our AI analyzes interaction patterns
              (frequency, recency, initiation), never the content of your
              messages.
            </p>
          </section>

          {/* Service availability */}
          <section>
            <h2 className="fh-h3 mb-4">
              Service availability
            </h2>
            <p>
              We aim to keep Family Core running reliably, but we don&apos;t
              guarantee 100% uptime. Things break, maintenance happens, and
              sometimes the internet has a bad day. We&apos;ll do our best to
              keep you connected to your family.
            </p>
          </section>

          {/* Limitation of liability */}
          <section>
            <h2 className="fh-h3 mb-4">
              Limitation of liability
            </h2>
            <p className="mb-3">
              Family Core is a tool to help families connect. We&apos;re not
              responsible for:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                Family dynamics or disputes — we can nudge, but we can&apos;t fix
                relationships.
              </li>
              <li>
                The content of messages exchanged between family members — we
                can&apos;t see them and don&apos;t moderate them.
              </li>
              <li>
                Any decisions you make based on AI-generated nudges or connection
                scores.
              </li>
            </ul>
            <p className="mt-3">
              To the fullest extent permitted by law, Family Core and its creators
              are not liable for any damages arising from your use of the
              service. If you&apos;re in a jurisdiction that doesn&apos;t allow
              these limitations, some of them may not apply.
            </p>
          </section>

          {/* Termination */}
          <section>
            <h2 className="fh-h3 mb-4">
              Account termination
            </h2>
            <p className="mb-3">
              We can suspend or terminate accounts that violate these terms —
              especially for harassment, spam, or illegal activity. We&apos;ll
              notify you if this happens, unless we&apos;re legally prevented from
              doing so.
            </p>
            <p>
              You can delete your account at any time by contacting us. We&apos;ll
              remove your personal data per our Privacy Policy.
            </p>
          </section>

          {/* Changes */}
          <section>
            <h2 className="fh-h3 mb-4">
              Changes to these terms
            </h2>
            <p>
              We may update these terms as Family Core grows. If we make material
              changes, we&apos;ll notify you — by email and/or a notice in the
              app — before they take effect. Continuing to use Family Core after
              the changes means you accept the updated terms.
            </p>
          </section>

          {/* Contact */}
          <section>
            <h2 className="fh-h3 mb-4">Contact</h2>
            <p>
              Questions about these terms? Reach out at{" "}
              <a
                href="mailto:hello@familyhub.app"
                className="fh-link"
              >
                hello@familyhub.app
              </a>
              .
            </p>
          </section>
        </div>

        {/* Back link */}
        <div className="mt-12" style={{ borderTop: "1px solid var(--color-fh-line)", paddingTop: 32 }}>
          <Link
            to="/"
            className="fh-link"
          >
            ← Back to Family Core
          </Link>
        </div>
      </main>

      {/* ── Footer ────────────────────────────────────────────── */}
      <footer className="py-10" style={{ backgroundColor: "var(--color-fh-surface)", borderTop: "1px solid var(--color-fh-border)" }}>
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 px-6 sm:flex-row">
          <div className="flex items-center gap-2">
            <Logo variant="icon" size="sm" />
            <span className="text-sm font-medium text-fh-muted">
              Family Core &copy; {new Date().getFullYear()}
            </span>
          </div>
          <div className="flex items-center gap-6">
            <Link
              to="/privacy"
              className="fh-body-sm fh-link" style={{ color: "var(--color-fh-muted)", textDecoration: "none" }}
            >
              Privacy
            </Link>
            <Link
              to="/terms"
              className="fh-body-sm fh-link" style={{ color: "var(--color-fh-muted)", textDecoration: "none" }}
            >
              Terms
            </Link>
            <a
              href="mailto:hello@familyhub.app"
              className="fh-body-sm fh-link" style={{ color: "var(--color-fh-muted)", textDecoration: "none" }}
            >
              Contact
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
