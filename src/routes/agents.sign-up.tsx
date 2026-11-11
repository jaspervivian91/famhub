import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/agents/sign-up")({
  head: () => ({
    meta: [
      { title: "Create an agent account — HomeStory" },
      {
        name: "description",
        content:
          "Create a HomeStory estate agent account and keep the history of every property you look after.",
      },
    ],
  }),
  component: AgentSignUp,
});

function AgentSignUp() {
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
      const response = await fetch("/api/agents/sign-up", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setLine(payload.error ?? "That account could not be created just now.");
        setBusy(false);
        return;
      }
      await navigate({ to: "/agents" });
    } catch {
      setLine("That account could not be created just now. Please try again.");
      setBusy(false);
    }
  }

  return (
    <div className="hs-wrap pb-20 pt-10 md:pt-16">
      <p className="hs-label">Estate agent</p>
      <h1 className="hs-h2 mt-4 max-w-[24ch]">Create your account.</h1>
      <p className="hs-lede mt-4 max-w-[52ch]">
        One account for every property you look after. Agent accounts are free
        while HomeStory is being set up, and no subscription is being charged.
      </p>

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
            autoComplete="new-password"
            required
            minLength={10}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="hs-line-input hs-line-input-brass mt-3"
          />
          <p className="hs-caption mt-2">At least 10 characters.</p>
        </div>

        <button
          type="submit"
          className="hs-btn hs-btn-brass mt-10 w-full sm:w-auto"
          disabled={busy}
        >
          {busy ? "Creating your account…" : "Create account"}
        </button>

        {line && (
          <p className="hs-caption mt-4 text-hs-ink" role="alert">
            {line}
          </p>
        )}
      </form>

      <div className="mt-10 max-w-[46ch] border-t border-hs-rule pt-6">
        <p className="hs-caption">
          There is no password-reset email yet — HomeStory cannot send one — so
          please keep this password somewhere safe. If it is lost, the account
          cannot be recovered by email.
        </p>
        <p className="hs-caption mt-6">
          Already have an account?{" "}
          <Link to="/agents/sign-in" className="hs-link">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
