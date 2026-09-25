import { createFileRoute, Link } from "@tanstack/react-router";
import { Logo } from "~/components/Logo";

export const Route = createFileRoute("/privacy")({
  component: PrivacyPage,
});

function PrivacyPage() {
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
          Privacy Policy
        </h1>
        <p className="mt-2 text-fh-muted">
          Last updated: July 2026
        </p>

        <div className="fh-body mt-10 flex flex-col gap-10">
          {/* Introduction */}
          <section>
            <p>
              Family Core is built around a simple belief: technology should bring
              families closer together, not exploit their attention. This policy
              explains what data we collect, how we use it, and — just as
              importantly — what we <em>don&apos;t</em> collect. We&apos;ve
              written it in plain English because privacy shouldn&apos;t require a
              law degree.
            </p>
          </section>

          {/* What we collect */}
          <section>
            <h2 className="fh-h3 mb-4">
              What data we collect
            </h2>
            <p className="mb-3">To make Family Core work, we collect:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Account information</strong> — your email address (for
                signing up and the waitlist), a display name you choose, and a
                one-way password hash (we never see your actual password).
              </li>
              <li>
                <strong>Interaction metadata</strong> — timestamps, frequency of
                contact, who initiated conversations, and the relationship type
                you set (e.g. &ldquo;grandparent,&rdquo; &ldquo;cousin&rdquo;).
                This is how we know when a relationship might need a nudge.
              </li>
              <li>
                <strong>Timezone</strong> — so we can send nudges and digests at
                times that make sense for you.
              </li>
              <li>
                <strong>Session cookies</strong> — one httpOnly cookie to keep you
                signed in. No tracking cookies, no advertising IDs.
              </li>
            </ul>
          </section>

          {/* What we DON'T collect */}
          <section>
            <h2 className="fh-h3 mb-4">
              What we <span style={{ color: "var(--color-fh-accent)" }}>don&apos;t</span> collect
            </h2>
            <p className="mb-3">
              This is the important part. Family Core is the opposite of social
              media. We do not collect:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Message content</strong> — we never read, store, or
                analyze the words you share with your family. Our AI only looks
                at <em>that</em> you connected, not <em>what</em> you said.
              </li>
              <li>
                <strong>Contacts lists</strong> — we don&apos;t access your phone
                or email contacts. You invite family members directly.
              </li>
              <li>
                <strong>Location beyond timezone</strong> — we don&apos;t track
                your precise location. Timezone is the most we ask for.
              </li>
              <li>
                <strong>Browsing history</strong> — we don&apos;t track what you
                do outside Family Core.
              </li>
            </ul>
          </section>

          {/* How we use data */}
          <section>
            <h2 className="fh-h3 mb-4">
              How we use your data
            </h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>To provide the service</strong> — generating connection
                nudges, calculating pair scores, sending weekly digests, and
                keeping your family core running.
              </li>
              <li>
                <strong>To improve the product</strong> — anonymous, aggregated
                patterns help us understand things like &ldquo;do dormant-relationship
                nudges actually lead to reconnection?&rdquo; without looking at
                anyone&apos;s individual data.
              </li>
              <li>
                <strong>To send waitlist updates</strong> — if you signed up for
                the waitlist, we&apos;ll email you when we launch.
              </li>
            </ul>
          </section>

          {/* Data storage */}
          <section>
            <h2 className="fh-h3 mb-4">
              Data storage
            </h2>
            <p>
              Your data is stored in a Neon serverless Postgres database. We use
              industry-standard encryption in transit (TLS) and at rest. Your
              data is yours — we don&apos;t hoard it, mine it, or sell it.
            </p>
          </section>

          {/* Data sharing */}
          <section>
            <h2 className="fh-h3 mb-4">
              Data sharing
            </h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>We do not sell your data.</strong> Not to advertisers, not
                to data brokers, not to anyone.
              </li>
              <li>
                <strong>No third-party analytics.</strong> We don&apos;t use
                Google Analytics, Facebook Pixel, or any tracking SDKs.
              </li>
              <li>
                <strong>No advertisers.</strong> Family Core has no ads and no
                plans to introduce them.
              </li>
              <li>
                We may share data only if required by law (e.g., a valid court
                order) — and we&apos;d notify you first unless prohibited from
                doing so.
              </li>
            </ul>
          </section>

          {/* Cookies */}
          <section>
            <h2 className="fh-h3 mb-4">Cookies</h2>
            <p>
              We use exactly one cookie: an httpOnly session cookie that keeps you
              signed in. It contains no personal information and expires when you
              sign out or after a reasonable period of inactivity. No analytics
              cookies, no tracking cookies, no cookie consent banner — because
              there&apos;s nothing to consent to.
            </p>
          </section>

          {/* User rights */}
          <section>
            <h2 className="fh-h3 mb-4">
              Your rights
            </h2>
            <p className="mb-3">
              You have the right to access, correct, or delete your data at any
              time. Just email us and we&apos;ll handle it promptly — no
              bureaucratic forms, no runaround.
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Access</strong> — request a copy of everything we have
                about you.
              </li>
              <li>
                <strong>Correction</strong> — if something is wrong, tell us and
                we&apos;ll fix it.
              </li>
              <li>
                <strong>Deletion</strong> — ask us to delete your account and
                data, and we will. (We may retain de-identified, aggregated data
                that can&apos;t be linked back to you.)
              </li>
            </ul>
          </section>

          {/* Children — COPPA */}
          <section>
            <h2 className="fh-h3 mb-4">
              Children&apos;s privacy (COPPA)
            </h2>
            <p>
              If a user is under 13, a parent or guardian must provide consent
              before they can use Family Core. We don&apos;t knowingly collect
              personal data from children under 13 without verified parental
              consent. If you believe a child under 13 has created an account
              without consent, contact us and we&apos;ll remove it immediately.
            </p>
          </section>

          {/* International — GDPR / CCPA */}
          <section>
            <h2 className="fh-h3 mb-4">
              International users (GDPR &amp; CCPA)
            </h2>
            <p>
              If you&apos;re in the EU, UK, or California, you have additional
              rights under the GDPR and CCPA — including the right to data
              portability (we&apos;ll export your data in a machine-readable
              format), the right to object to processing, and the right to lodge
              a complaint with your local data protection authority. We extend
              these same rights to all users regardless of where you live.
            </p>
          </section>

          {/* Contact */}
          <section>
            <h2 className="fh-h3 mb-4">Contact</h2>
            <p>
              Questions about this policy? Want to exercise your rights? Email us
              at{" "}
              <a
                href="mailto:privacy@familyhub.app"
                className="fh-link"
              >
                privacy@familyhub.app
              </a>
              .
            </p>
          </section>

          {/* Changes */}
          <section>
            <h2 className="fh-h3 mb-4">
              Changes to this policy
            </h2>
            <p>
              We may update this policy as the service evolves. When we do,
              we&apos;ll notify you — by email and/or a notice on the app — so
              you can review the changes before they take effect.
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
