import { createFileRoute, Link } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { getGroupByInviteCode, joinFamilyGroup } from "~/lib/api";
import { Logo } from "~/components/Logo";
import { Icon } from "~/components/Icon";
import { PageTurn } from "~/components/Warm";

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
      <PageTurn className="min-h-dvh">
        <main className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col items-center justify-center px-5 py-12 text-center">
          <Icon name="idea" size={52} />
          <h1 className="fh-h2 mt-5">We couldn&apos;t find that invite</h1>
          <p
            className="fh-body-sm mt-2 max-w-[34ch]"
            style={{ color: "var(--color-fh-muted)" }}
          >
            The invite code{" "}
            <span className="fh-chip font-[family-name:var(--font-body)]">
              {inviteCode}
            </span>{" "}
            doesn&apos;t match any family home. Double-check the code, or ask
            your family to send a fresh invite.
          </p>
          <Link to="/join" className="fh-btn fh-btn-secondary mt-7">
            Try another code
          </Link>
        </main>
      </PageTurn>
    );
  }

  if (joined) {
    return (
      <PageTurn className="min-h-dvh">
        <main className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col items-center justify-center px-5 py-12 text-center">
          <Icon name="celebration" size={52} />
          <h1 className="fh-h2 mt-5">Welcome to the family</h1>
          <p
            className="fh-body-sm mt-2 max-w-[32ch]"
            style={{ color: "var(--color-fh-muted)" }}
          >
            You&apos;re all set. Your family home is ready — go and see who&apos;s
            there.
          </p>
          <Link to="/dashboard" className="fh-btn fh-btn-primary mt-7">
            Go to your family home
          </Link>
        </main>
      </PageTurn>
    );
  }

  return (
    <PageTurn className="min-h-dvh">
      <main className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col px-5 py-10 md:max-w-[520px] md:px-10">
        <div className="flex justify-center">
          <Logo variant="icon" size="lg" />
        </div>

        <h1 className="fh-h2 mt-6 text-center">
          Join {group?.name ?? "your family"}
        </h1>
        <p
          className="fh-body-sm mt-2 text-center"
          style={{ color: "var(--color-fh-muted)" }}
        >
          You&apos;ve been invited to connect with family — not social media.
        </p>

        <form onSubmit={handleJoin} className="mt-7">
          <div className="fh-card flex flex-col gap-5">
            {error && (
              <p className="fh-alert-error" role="alert">
                {error}
              </p>
            )}

            <div>
              <label htmlFor="display-name" className="fh-label mb-1.5 block">
                What should your family call you?
              </label>
              <input
                id="display-name"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. Grandma Sue or Uncle Joe"
                className="fh-input"
                required
                autoFocus
              />
            </div>

            <div>
              <label htmlFor="relationship" className="fh-label mb-1.5 block">
                Your relationship
              </label>
              <select
                id="relationship"
                value={relationship}
                onChange={(e) => setRelationship(e.target.value)}
                className="fh-input"
              >
                <option value="grandparent">Grandparent</option>
                <option value="parent">Parent</option>
                <option value="child">Child</option>
                <option value="aunt_uncle">Aunt / Uncle</option>
                <option value="cousin">Cousin</option>
                <option value="family">Family</option>
                <option value="other">Other</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={busy}
              className="fh-btn fh-btn-primary w-full"
            >
              <Icon name="members" size={20} />
              {busy ? "Joining…" : "Join the family"}
            </button>
          </div>
        </form>

        <p
          className="fh-caption mt-6 flex items-center justify-center gap-2 text-center"
        >
          <Icon name="heart" size={18} />
          Family Core is private — no feeds, no ads, just connection.
        </p>
      </main>
    </PageTurn>
  );
}
