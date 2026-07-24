import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { getGroupByInviteCode, joinFamilyGroup } from "~/lib/api";
import { Logo } from "~/components/Logo";

const lookupGroup = createServerFn({ method: "GET" })
  .validator((d: { inviteCode: string }) => d)
  .handler(async ({ data }) => {
    try {
      const group = await getGroupByInviteCode({
        data: { inviteCode: data.inviteCode },
      });
      return { group, error: null };
    } catch (e) {
      return {
        group: null,
        error: e instanceof Error ? e.message : "Group not found",
      };
    }
  });

export const Route = createFileRoute("/join/$inviteCode")({
  loader: async ({ params }) => {
    const result = await lookupGroup({
      data: { inviteCode: params.inviteCode },
    });
    return result;
  },
  component: JoinPage,
});

function JoinPage() {
  const { inviteCode } = Route.useParams();
  const loaderData = Route.useLoaderData();
  const { group } = loaderData ?? {};

  const [displayName, setDisplayName] = useState("");
  const [relationship, setRelationship] = useState("family");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [joined, setJoined] = useState(false);
  const [notFound, setNotFound] = useState(false);

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (!displayName.trim()) return;
    setBusy(true);
    setError("");

    try {
      const result = await joinFamilyGroup({
        data: {
          inviteCode: inviteCode.trim().toUpperCase(),
          displayName: displayName.trim(),
          relationship,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
      });
      if (result?.group) {
        setJoined(true);
      } else {
        setError("Could not join. The group may no longer exist.");
      }
    } catch (e) {
      if (
        e instanceof Error &&
        (e.message.includes("not found") || e.message.includes("does not exist"))
      ) {
        setNotFound(true);
      } else {
        setError(e instanceof Error ? e.message : "Something went wrong");
      }
    } finally {
      setBusy(false);
    }
  }

  if (notFound) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-lg flex-col items-center justify-center gap-6 px-6">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-fh-dusk/20 text-3xl">
          🔍
        </div>
        <h1 className="font-[family-name:var(--font-heading)] text-2xl text-fh-heading">
          Group not found
        </h1>
        <p className="text-center text-fh-muted">
          The invite code{" "}
          <code className="rounded bg-fh-surface px-1 font-mono">
            {inviteCode}
          </code>{" "}
          doesn&apos;t match any family group. Double-check the code or ask
          your family to send a new invite.
        </p>
        <a href="/" className="text-fh-tide underline">
          Go to Family Hub &rarr;
        </a>
      </main>
    );
  }

  if (joined) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-lg flex-col items-center justify-center gap-4 px-6 py-12">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-fh-tide/20 text-3xl">
          🎉
        </div>
        <h1 className="font-[family-name:var(--font-heading)] text-2xl text-fh-heading">
          Welcome to the family!
        </h1>
        <p className="text-center text-fh-muted">
          You&apos;re all set. Head to your dashboard to start connecting.
        </p>
        <a
          href="/dashboard"
          className="rounded-lg bg-fh-ember px-4 py-3 font-semibold text-white hover:bg-fh-ember/90"
        >
          Go to Dashboard →
        </a>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col items-center justify-center gap-6 px-6 py-12">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-fh-tide/20">
          <Logo variant="icon" size="lg" />
        </div>
        <h1 className="font-[family-name:var(--font-heading)] text-2xl text-fh-heading">
          Join {group?.name ?? "Family Hub"}
        </h1>
        <p className="mt-2 text-fh-muted">
          You&apos;ve been invited to connect with family &mdash; not social media.
        </p>
      </div>
      {error && (
        <div className="w-full rounded-lg bg-rose-50 p-3 text-sm text-rose-700">
          {error}
        </div>
      )}
      <form
        onSubmit={handleJoin}
        className="w-full rounded-xl border border-fh-border bg-white p-6 shadow-sm"
      >
        <label
          htmlFor="display-name"
          className="mb-1 block text-sm font-medium text-fh-body"
        >
          Your display name
        </label>
        <input
          id="display-name"
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="e.g. Grandma Sue or Uncle Joe"
          className="w-full rounded-lg border border-fh-border px-4 py-3 text-fh-body placeholder-fh-muted focus:border-fh-tide focus:outline-none focus:ring-2 focus:ring-fh-tide/20"
          required
          autoFocus
        />
        <label
          htmlFor="relationship"
          className="mb-1 mt-4 block text-sm font-medium text-fh-body"
        >
          Your relationship
        </label>
        <select
          id="relationship"
          value={relationship}
          onChange={(e) => setRelationship(e.target.value)}
          className="w-full rounded-lg border border-fh-border px-4 py-3 text-fh-body focus:border-fh-tide focus:outline-none focus:ring-2 focus:ring-fh-tide/20"
        >
          <option value="grandparent">Grandparent</option>
          <option value="parent">Parent</option>
          <option value="child">Child</option>
          <option value="aunt_uncle">Aunt / Uncle</option>
          <option value="cousin">Cousin</option>
          <option value="family">Family</option>
          <option value="other">Other</option>
        </select>
        <button
          type="submit"
          disabled={busy}
          className="mt-6 w-full rounded-lg bg-fh-tide px-4 py-3 font-semibold text-white hover:bg-fh-tide/90 focus:outline-none focus:ring-2 focus:ring-fh-tide/30 disabled:opacity-50"
        >
          {busy ? "Joining..." : "Join the Family Hub"}
        </button>
      </form>
      <p className="text-xs text-fh-muted">
        Family Hub is private. No feeds, no ads &mdash; just connection.
      </p>
    </main>
  );
}
