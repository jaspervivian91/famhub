import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Logo } from "~/components/Logo";
import { Icon } from "~/components/Icon";
import { PageTurn } from "~/components/Warm";

export const Route = createFileRoute("/join/")({
  component: JoinPage,
});

function JoinPage() {
  const navigate = useNavigate();
  const [code, setCode] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    navigate({ to: "/join/$inviteCode", params: { inviteCode: code.trim() } });
  }

  return (
    <PageTurn className="min-h-dvh">
      <main className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col px-5 py-10 md:max-w-[520px] md:px-10">
        <div className="flex justify-center">
          <Logo variant="icon" size="lg" />
        </div>

        <h1 className="fh-h2 mt-6 text-center">You&apos;ve been invited</h1>
        <p
          className="fh-body-sm mt-2 text-center"
          style={{ color: "var(--color-fh-muted)" }}
        >
          Enter the invite code from your family to come inside.
        </p>

        <form onSubmit={handleSubmit} className="mt-7">
          <div className="fh-card">
            <label htmlFor="code" className="fh-label mb-1.5 block">
              Invite code
            </label>
            <input
              id="code"
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g. ABC123DE"
              className="fh-input"
              required
              autoFocus
            />
            <button type="submit" className="fh-btn fh-btn-primary mt-5 w-full">
              <Icon name="members" size={20} />
              Join my family
            </button>
          </div>
        </form>

        <p className="fh-body-sm mt-6 text-center">
          <Link to="/" className="fh-link">
            Back to the beginning
          </Link>
        </p>
      </main>
    </PageTurn>
  );
}
