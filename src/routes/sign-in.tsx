import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { signIn, getMe } from "~/lib/auth-api";

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
      navigate({ to: "/" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-8 px-6 py-12">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100 text-3xl">
          🏠
        </div>
        <h1 className="text-3xl font-bold text-amber-900">Welcome back</h1>
        <p className="mt-2 text-stone-500">
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
        className="w-full rounded-xl border border-amber-200 bg-white p-6 shadow-sm"
      >
        <label
          htmlFor="email"
          className="mb-1 block text-sm font-medium text-stone-600"
        >
          Email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="w-full rounded-lg border border-stone-300 px-4 py-3 text-stone-900 placeholder-stone-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200"
          required
          autoFocus
        />

        <label
          htmlFor="password"
          className="mb-1 mt-4 block text-sm font-medium text-stone-600"
        >
          Password
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          className="w-full rounded-lg border border-stone-300 px-4 py-3 text-stone-900 placeholder-stone-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200"
          required
        />

        <button
          type="submit"
          disabled={busy}
          className="mt-6 w-full rounded-lg bg-amber-600 px-4 py-3 font-semibold text-white hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-300 disabled:opacity-50"
        >
          {busy ? "Signing in…" : "Sign In"}
        </button>
      </form>

      <p className="text-center text-sm text-stone-400">
        Don&apos;t have an account?{" "}
        <a href="/sign-up" className="text-teal-600 underline">
          Create one
        </a>
      </p>
    </main>
  );
}
