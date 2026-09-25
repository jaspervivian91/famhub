import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { signIn } from "~/lib/auth-api";
import { Logo } from "~/components/Logo";
import { HandDivider, PageTurn } from "~/components/Warm";

export const Route = createFileRoute("/sign-in")({
  component: SignInPage,
});

function SignInPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");

    try {
      await signIn({ data: { email: email.trim(), password } });
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
        <div className="flex justify-center">
          <Logo variant="icon" size="lg" />
        </div>

        <h1 className="fh-h2 mt-6 text-center">Welcome back</h1>
        <p
          className="fh-body-sm mt-2 text-center"
          style={{ color: "var(--color-fh-muted)" }}
        >
          Good to see you again.
        </p>

        <form onSubmit={handleSubmit} className="mt-7">
          <div className="fh-card flex flex-col gap-5">
            {error && (
              <p className="fh-alert-error" role="alert">
                {error}
              </p>
            )}

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
                autoFocus
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
                className="fh-input"
                required
              />
            </div>

            <button
              type="submit"
              disabled={busy}
              className="fh-btn fh-btn-primary mt-1 w-full"
            >
              {busy ? "Signing in…" : "Sign in"}
            </button>
          </div>
        </form>

        <div className="mt-8 flex items-center gap-4">
          <HandDivider className="flex-1" />
          <span className="fh-caption">or</span>
          <HandDivider className="flex-1" />
        </div>

        <p className="fh-body-sm mt-5 text-center">
          New here?{" "}
          <Link to="/sign-up" className="fh-link">
            Create your family home
          </Link>
        </p>
      </main>
    </PageTurn>
  );
}
