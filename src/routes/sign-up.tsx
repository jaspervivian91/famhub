import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { signUp } from "~/lib/auth-api";
import { Logo } from "~/components/Logo";
import { Icon } from "~/components/Icon";
import { HandDivider, PageTurn, Sprig } from "~/components/Warm";

export const Route = createFileRoute("/sign-up")({
  component: SignUpPage,
});

function SignUpPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");

    try {
      await signUp({
        data: {
          email: email.trim(),
          password,
          displayName: displayName.trim(),
        },
      });
      navigate({ to: "/dashboard" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <PageTurn className="min-h-dvh">
      <main className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col px-5 py-10 md:max-w-[520px] md:px-10">
        <div className="relative flex justify-center">
          <Sprig className="absolute -top-1 left-1" />
          <Logo variant="icon" size="lg" />
        </div>

        <h1 className="fh-h2 mt-6 text-center">Create your family home</h1>
        <p
          className="fh-body-sm mt-2 text-center"
          style={{ color: "var(--color-fh-muted)" }}
        >
          A quiet, private place for the people you love.
        </p>

        <form onSubmit={handleSubmit} className="mt-7">
          <div className="fh-card flex flex-col gap-5">
            {error && (
              <p className="fh-alert-error" role="alert">
                {error}
              </p>
            )}

            <div>
              <label htmlFor="display-name" className="fh-label mb-1.5 block">
                Your name
              </label>
              <input
                id="display-name"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. Sarah Johnson"
                className="fh-input"
                required
                autoFocus
              />
            </div>

            <div>
              <label htmlFor="email" className="fh-label mb-1.5 block">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="fh-input"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="fh-label mb-1.5 block">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                minLength={8}
                className="fh-input"
                required
              />
              <p className="fh-caption mt-2">
                At least 8 characters — take your time.
              </p>
            </div>

            <button
              type="submit"
              disabled={busy}
              className="fh-btn fh-btn-primary mt-1 w-full"
            >
              {busy ? "Creating your home…" : "Create account"}
            </button>
          </div>
        </form>

        <div className="mt-8 flex items-center gap-4">
          <HandDivider className="flex-1" />
          <span className="fh-caption">or</span>
          <HandDivider className="flex-1" />
        </div>

        <p className="fh-body-sm mt-5 text-center">
          Already have an account?{" "}
          <Link to="/sign-in" className="fh-link">
            Sign in
          </Link>
        </p>
        <p className="fh-caption mt-2 text-center">
          Free tier · your whole family · no card needed
        </p>

        <p
          className="fh-body-sm mt-8 flex items-center justify-center gap-2 text-center"
          style={{ color: "var(--color-fh-muted)" }}
        >
          <Icon name="heart" size={20} />
          We only ever see how often you connect — never what you say.
        </p>
      </main>
    </PageTurn>
  );
}
