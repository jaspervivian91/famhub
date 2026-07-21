import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/terms")({
  component: TermsPage,
});

function TermsPage() {
  return (
    <div className="min-h-dvh bg-stone-50">
      {/* ── Nav ──────────────────────────────────────────────── */}
      <nav className="border-b border-stone-200 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2">
            <span className="text-2xl">🏠</span>
            <span className="text-xl font-bold text-amber-900">Family Hub</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              to="/sign-in"
              className="rounded-lg px-4 py-2 text-sm font-medium text-stone-600 hover:bg-stone-100 hover:text-stone-900"
            >
              Sign In
            </Link>
            <Link
              to="/sign-up"
              className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Content ──────────────────────────────────────────── */}
      <main className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-3xl font-extrabold tracking-tight text-amber-900 sm:text-4xl">
          Terms of Service
        </h1>
        <p className="mt-2 text-stone-500">
          Last updated: July 2026
        </p>

        <div className="mt-10 space-y-10 text-stone-700 leading-relaxed">
          {/* Acceptance */}
          <section>
            <h2 className="mb-4 text-xl font-bold text-stone-800">
              Acceptance of terms
            </h2>
            <p>
              By creating an account or using Family Hub, you agree to these
              terms. If you don&apos;t agree, that&apos;s okay — but please
              don&apos;t use the service. These terms apply to everyone: free
              users, premium subscribers, and anyone who visits our website.
            </p>
          </section>

          {/* Accounts */}
          <section>
            <h2 className="mb-4 text-xl font-bold text-stone-800">Accounts</h2>
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
            <h2 className="mb-4 text-xl font-bold text-stone-800">
              Acceptable use
            </h2>
            <p className="mb-3">
              Family Hub exists to bring families closer together. To keep it
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
                <strong>Use Family Hub for anything illegal.</strong> Pretty
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
            <h2 className="mb-4 text-xl font-bold text-stone-800">
              Our privacy-first commitment
            </h2>
            <p>
              Family Hub is not social media. We don&apos;t optimize for
              engagement, we don&apos;t show ads, and we don&apos;t sell your
              data. Our measure of success is this: the app succeeds when you put
              your phone down and reconnect with your family in real life. Read
              our{" "}
              <Link
                to="/privacy"
                className="text-teal-600 underline hover:text-teal-800"
              >
                Privacy Policy
              </Link>{" "}
              for the full picture.
            </p>
          </section>

          {/* AI nudges */}
          <section>
            <h2 className="mb-4 text-xl font-bold text-stone-800">
              AI nudges — suggestions, not commands
            </h2>
            <p>
              Family Hub uses AI to detect when family connections might be
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
            <h2 className="mb-4 text-xl font-bold text-stone-800">
              Service availability
            </h2>
            <p>
              We aim to keep Family Hub running reliably, but we don&apos;t
              guarantee 100% uptime. Things break, maintenance happens, and
              sometimes the internet has a bad day. We&apos;ll do our best to
              keep you connected to your family.
            </p>
          </section>

          {/* Limitation of liability */}
          <section>
            <h2 className="mb-4 text-xl font-bold text-stone-800">
              Limitation of liability
            </h2>
            <p className="mb-3">
              Family Hub is a tool to help families connect. We&apos;re not
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
              To the fullest extent permitted by law, Family Hub and its creators
              are not liable for any damages arising from your use of the
              service. If you&apos;re in a jurisdiction that doesn&apos;t allow
              these limitations, some of them may not apply.
            </p>
          </section>

          {/* Termination */}
          <section>
            <h2 className="mb-4 text-xl font-bold text-stone-800">
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
            <h2 className="mb-4 text-xl font-bold text-stone-800">
              Changes to these terms
            </h2>
            <p>
              We may update these terms as Family Hub grows. If we make material
              changes, we&apos;ll notify you — by email and/or a notice in the
              app — before they take effect. Continuing to use Family Hub after
              the changes means you accept the updated terms.
            </p>
          </section>

          {/* Contact */}
          <section>
            <h2 className="mb-4 text-xl font-bold text-stone-800">Contact</h2>
            <p>
              Questions about these terms? Reach out at{" "}
              <a
                href="mailto:hello@familyhub.app"
                className="text-teal-600 underline hover:text-teal-800"
              >
                hello@familyhub.app
              </a>
              .
            </p>
          </section>
        </div>

        {/* Back link */}
        <div className="mt-12 border-t border-stone-200 pt-8">
          <Link
            to="/"
            className="text-teal-600 underline hover:text-teal-800 font-medium"
          >
            ← Back to Family Hub
          </Link>
        </div>
      </main>

      {/* ── Footer ────────────────────────────────────────────── */}
      <footer className="border-t border-stone-200 bg-stone-100 py-10">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 px-6 sm:flex-row">
          <div className="flex items-center gap-2">
            <span className="text-xl">🏠</span>
            <span className="text-sm font-medium text-stone-500">
              Family Hub &copy; {new Date().getFullYear()}
            </span>
          </div>
          <div className="flex items-center gap-6">
            <Link
              to="/privacy"
              className="text-sm text-stone-400 hover:text-stone-600 transition-colors"
            >
              Privacy
            </Link>
            <Link
              to="/terms"
              className="text-sm text-stone-400 hover:text-stone-600 transition-colors"
            >
              Terms
            </Link>
            <a
              href="mailto:hello@familyhub.app"
              className="text-sm text-stone-400 hover:text-stone-600 transition-colors"
            >
              Contact
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
