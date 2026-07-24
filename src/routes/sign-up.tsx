import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { signUp } from "~/lib/auth-api";
import { Logo } from "~/components/Logo";

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
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-fh-tide/20">
          <Logo variant="icon" size="lg" />
        </div>
        <h1 className="font-[family-name:var(--font-heading)] text-3xl text-fh-heading">Create your account</h1>
        <p className="mt-2 text-fh-muted">
          Start connecting with your family — privately.
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
          htmlFor="display-name"
          className="mb-1 block text-sm font-medium text-fh-body"
        >
          Display name
        </label>
        <input
          id="display-name"
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Your name"
          className="w-full rounded-lg border border-fh-border px-4 py-3 text-fh-body placeholder-fh-muted focus:border-fh-tide focus:outline-none focus:ring-2 focus:ring-fh-tide/20"
          required
          autoFocus
        />

        <label
          htmlFor="email"
          className="mb-1 mt-4 block text-sm font-medium text-fh-body"
        >
          Email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="w-full rounded-lg border border-fh-border px-4 py-3 text-fh-body placeholder-fh-muted focus:border-fh-tide focus:outline-none focus:ring-2 focus:ring-fh-tide/20"
          required
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
          placeholder="At least 8 characters"
          minLength={8}
          className="w-full rounded-lg border border-fh-border px-4 py-3 text-fh-body placeholder-fh-muted focus:border-fh-tide focus:outline-none focus:ring-2 focus:ring-fh-tide/20"
          required
        />

        <button
          type="submit"
          disabled={busy}
          className="mt-6 w-full rounded-lg bg-fh-tide px-4 py-3 font-semibold text-white hover:bg-fh-tide/90 focus:outline-none focus:ring-2 focus:ring-fh-tide/30 disabled:opacity-50"
        >
          {busy ? "Creating account…" : "Create Account"}
        </button>
      </form>

      <p className="text-center text-sm text-fh-muted">
        Already have an account?{" "}
        <a href="/sign-in" className="text-fh-tide underline">
          Sign in
        </a>
      </p>
    </main>
  );
}
