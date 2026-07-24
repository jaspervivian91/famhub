import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { signIn } from "~/lib/auth-api";
import { Logo } from "~/components/Logo";

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
      // Redirect to dashboard
      navigate({ to: "/dashboard" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-8 px-6 py-12 bg-fh-bg">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-fh-hearth/40">
          <Logo variant="icon" size="lg" />
        </div>
        <h1 className="font-[family-name:var(--font-heading)] text-3xl text-fh-heading">Welcome back</h1>
        <p className="mt-2 text-fh-muted">
          Sign in to your Family Hub account.
        </p>
      </div>

      {error && (
        <div className="w-full rounded-lg bg-rose-50 p-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="w-full rounded-xl border border-fh-border bg-white p-6 shadow-sm"
      >
        <label
          htmlFor="email"
          className="mb-1 block text-sm font-medium text-fh-body"
        >
          Email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="w-full rounded-lg border border-fh-border px-4 py-3 text-fh-body placeholder-fh-muted focus:border-fh-ember focus:outline-none focus:ring-2 focus:ring-fh-hearth/50"
          required
          autoFocus
        />

        <label
          htmlFor="password"
          className="mb-1 mt-4 block text-sm font-medium text-fh-body"
        >
          Password
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          className="w-full rounded-lg border border-fh-border px-4 py-3 text-fh-body placeholder-fh-muted focus:border-fh-ember focus:outline-none focus:ring-2 focus:ring-fh-hearth/50"
          required
        />

        <button
          type="submit"
          disabled={busy}
          className="mt-6 w-full rounded-lg bg-fh-ember px-4 py-3 font-semibold text-white hover:bg-fh-ember/90 focus:outline-none focus:ring-2 focus:ring-fh-hearth disabled:opacity-50"
        >
          {busy ? "Signing in…" : "Sign In"}
        </button>
      </form>

      <p className="text-center text-sm text-fh-muted">
        Don&apos;t have an account?{" "}
        <a href="/sign-up" className="text-fh-tide underline">
          Create one
        </a>
      </p>
    </main>
  );
}
