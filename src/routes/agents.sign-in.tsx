import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/agents/sign-in")({
  head: () => ({
    meta: [
      { title: "Sign in — HomeStory for estate agents" },
      {
        name: "description",
        content: "Sign in to the properties you look after on HomeStory.",
      },
    ],
  }),
  component: AgentSignIn,
});

function AgentSignIn() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [line, setLine] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setLine(null);
    try {
      const response = await fetch("/api/agents/sign-in", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setLine(payload.error ?? "That email and password don’t match an account.");
        setBusy(false);
        return;
      }
      await navigate({ to: "/agents" });
    } catch {
      setLine("That did not work just now. Please try again.");
      setBusy(false);
    }
  }

  return (
    <div className="hs-wrap pb-20 pt-10 md:pt-16">
      <p className="hs-label">Estate agent</p>
      <h1 className="hs-h2 mt-4 max-w-[24ch]">Sign in to your properties.</h1>

      <form onSubmit={submit} className="mt-12 max-w-[26rem] md:mt-16">
        <div>
          <label htmlFor="agent-email" className="hs-label block">
            Email
          </label>
          <input
            id="agent-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="hs-line-input hs-line-input-brass mt-3"
          />
        </div>

        <div className="mt-8">
          <label htmlFor="agent-password" className="hs-label block">
            Password
          </label>
          <input
            id="agent-password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="hs-line-input hs-line-input-brass mt-3"
          />
        </div>

        <button
          type="submit"
          className="hs-btn hs-btn-brass mt-10 w-full sm:w-auto"
          disabled={busy}
        >
          {busy ? "Signing in…" : "Sign in"}
        </button>

        {line && (
          <p className="hs-caption mt-4 text-hs-ink" role="alert">
            {line}
          </p>
        )}
      </form>

      <p className="hs-caption mt-12 max-w-[46ch]">
        No account yet?{" "}
        <Link to="/agents/sign-up" className="hs-link">
          Create one
        </Link>
      </p>
    </div>
  );
}
