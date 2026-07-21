import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { signUp } from "~/lib/auth-api";

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
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-8 px-6 py-12">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-100 text-3xl">
          🏠
        </div>
        <h1 className="text-3xl font-bold text-teal-900">Create your account</h1>
        <p className="mt-2 text-stone-500">
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
        className="w-full rounded-xl border border-teal-200 bg-white p-6 shadow-sm"
      >
        <label
          htmlFor="display-name"
          className="mb-1 block text-sm font-medium text-stone-600"
        >
          Display name
        </label>
        <input
          id="display-name"
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Your name"
          className="w-full rounded-lg border border-stone-300 px-4 py-3 text-stone-900 placeholder-stone-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-200"
          required
          autoFocus
        />

        <label
          htmlFor="email"
          className="mb-1 mt-4 block text-sm font-medium text-stone-600"
        >
          Email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="w-full rounded-lg border border-stone-300 px-4 py-3 text-stone-900 placeholder-stone-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-200"
          required
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
          placeholder="At least 8 characters"
          minLength={8}
          className="w-full rounded-lg border border-stone-300 px-4 py-3 text-stone-900 placeholder-stone-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-200"
          required
        />

        <button
          type="submit"
          disabled={busy}
          className="mt-6 w-full rounded-lg bg-teal-600 px-4 py-3 font-semibold text-white hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-300 disabled:opacity-50"
        >
          {busy ? "Creating account…" : "Create Account"}
        </button>
      </form>

      <p className="text-center text-sm text-stone-400">
        Already have an account?{" "}
        <a href="/sign-in" className="text-teal-600 underline">
          Sign in
        </a>
      </p>
    </main>
  );
}
