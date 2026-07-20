import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { getGroupByInviteCode, joinFamilyGroup } from "~/lib/api";
import { setCurrentIdentity } from "~/lib/client-store";

const loadInviteGroup = createServerFn({ method: "GET" })
  .validator((d: { inviteCode: string }) => d)
  .handler(async ({ data }) => {
    return getGroupByInviteCode({ data: { inviteCode: data.inviteCode } });
  });

export const Route = createFileRoute("/join/$inviteCode")({
  loader: async () => null,
  component: JoinPage,
});

function JoinPage() {
  const { inviteCode } = Route.useParams();
  const navigate = useNavigate();
  const [group, setGroup] = useState<
    Awaited<ReturnType<typeof loadInviteGroup>> | null
  >(null);
  const [displayName, setDisplayName] = useState("");
  const [relationship, setRelationship] = useState("family");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    loadInviteGroup({ data: { inviteCode } }).then((g) => {
      if (g) {
        setGroup(g);
      } else {
        setNotFound(true);
      }
    });
  }, [inviteCode]);

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (!displayName.trim()) return;
    setBusy(true);
    setError("");

    try {
      const result = await joinFamilyGroup({
        data: {
          inviteCode,
          displayName: displayName.trim(),
          relationship,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
      });
      setCurrentIdentity(
        result.member.id,
        result.group.id,
        result.member.display_name,
      );
      navigate({ to: `/group/${result.group.id}` });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to join");
    } finally {
      setBusy(false);
    }
  }

  if (notFound) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-lg flex-col items-center justify-center gap-6 px-6">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-100 text-3xl">
          🔍
        </div>
        <h1 className="text-2xl font-bold text-stone-800">
          Group not found
        </h1>
        <p className="text-center text-stone-500">
          The invite code{" "}
          <code className="rounded bg-stone-100 px-1 font-mono">
            {inviteCode}
          </code>{" "}
          doesn&apos;t match any family group. Double-check the code or ask
          your family to send a new invite.
        </p>
        <a href="/" className="text-teal-600 underline">
          Go to Family Hub &rarr;
        </a>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col items-center justify-center gap-6 px-6 py-12">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-100 text-3xl">
          🏠
        </div>
        <h1 className="text-2xl font-bold text-teal-900">
          Join {group?.name ?? "Family Hub"}
        </h1>
        <p className="mt-2 text-stone-500">
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
        className="w-full rounded-xl border border-teal-200 bg-white p-6 shadow-sm"
      >
        <label
          htmlFor="display-name"
          className="mb-1 block text-sm font-medium text-stone-600"
        >
          Your display name
        </label>
        <input
          id="display-name"
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="e.g. Grandma Sue or Uncle Joe"
          className="w-full rounded-lg border border-stone-300 px-4 py-3 text-stone-900 placeholder-stone-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-200"
          required
          autoFocus
        />

        <label
          htmlFor="relationship"
          className="mb-1 mt-4 block text-sm font-medium text-stone-600"
        >
          Your relationship
        </label>
        <select
          id="relationship"
          value={relationship}
          onChange={(e) => setRelationship(e.target.value)}
          className="w-full rounded-lg border border-stone-300 px-4 py-3 text-stone-900 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-200"
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
          className="mt-6 w-full rounded-lg bg-teal-600 px-4 py-3 font-semibold text-white hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-300 disabled:opacity-50"
        >
          {busy ? "Joining..." : "Join the Family Hub"}
        </button>
      </form>

      <p className="text-xs text-stone-400">
        Family Hub is private. No feeds, no ads &mdash; just connection.
      </p>
    </main>
  );
}
