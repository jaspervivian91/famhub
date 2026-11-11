import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";

import { AddressSearch } from "~/components/address-search";

export const Route = createFileRoute("/agents/")({
  head: () => ({
    meta: [
      { title: "Your properties — HomeStory" },
      {
        name: "description",
        content:
          "The properties you look after, each with its own permanent HomeStory page and brass plaque.",
      },
    ],
  }),
  component: AgentsDashboard,
});

type Agent = { email: string };

type HomeRow = {
  id: string;
  publicId: string | null;
  address: string;
  status: string;
  createdAt: string;
  updatedAt: string;
};

function formatTouched(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "recently";
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function AgentsDashboard() {
  const navigate = useNavigate();

  const [agent, setAgent] = useState<Agent | null>(null);
  const [homes, setHomes] = useState<HomeRow[] | null>(null);
  const [loadLine, setLoadLine] = useState<string | null>(null);

  const [adding, setAdding] = useState(false);
  const [address, setAddress] = useState("");
  const [addMessage, setAddMessage] = useState<string | null>(null);
  const [addingBusy, setAddingBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  const load = useCallback(async () => {
    try {
      const meRes = await fetch("/api/agents/me");
      const me = (await meRes.json()) as { agent: Agent | null };
      if (!me.agent) {
        await navigate({ to: "/agents/sign-in" });
        return;
      }
      setAgent(me.agent);

      const homesRes = await fetch("/api/agents/homes");
      const payload = (await homesRes.json().catch(() => ({}))) as {
        homes?: HomeRow[];
        error?: string;
      };
      if (!homesRes.ok) {
        setLoadLine(payload.error ?? "Your properties could not be loaded just now.");
        setHomes([]);
        return;
      }
      setHomes(Array.isArray(payload.homes) ? payload.homes : []);
    } catch {
      setLoadLine("Your properties could not be loaded just now. Please refresh.");
      setHomes([]);
    }
  }, [navigate]);

  useEffect(() => {
    void load();
  }, [load]);

  async function addProperty() {
    const value = address.trim();
    if (!value) {
      setAddMessage("An address is needed before a property can be added.");
      return;
    }
    setAddingBusy(true);
    setAddMessage(null);
    try {
      const response = await fetch("/api/agents/homes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ address: value }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        home?: HomeRow;
        error?: string;
      };
      if (!response.ok || !payload.home) {
        setAddMessage(payload.error ?? "That property could not be added just now.");
        setAddingBusy(false);
        return;
      }
      const home = payload.home;
      setHomes((current) => [home, ...(current ?? [])]);
      setAddress("");
      setAdding(false);
      setAddingBusy(false);
      setNote(
        `${home.address} added. Nothing about it is public until you publish its page.`,
      );
    } catch {
      setAddMessage("That property could not be added just now. Please try again.");
      setAddingBusy(false);
    }
  }

  async function signOut() {
    setSigningOut(true);
    try {
      await fetch("/api/agents/sign-out", { method: "POST" });
    } finally {
      await navigate({ to: "/agents/sign-in" });
    }
  }

  if (!agent && !loadLine) {
    return (
      <div className="hs-wrap pb-20 pt-10 md:pt-16">
        <p className="hs-label">Estate agent</p>
        <p className="hs-lede mt-6">Opening your ledger…</p>
      </div>
    );
  }

  return (
    <div className="hs-wrap pb-20 pt-10 md:pt-16">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <p className="hs-label">Estate agent</p>
        {agent && (
          <button
            type="button"
            onClick={signOut}
            disabled={signingOut}
            className="hs-caption border-b border-hs-rule-brass pb-0.5 hover:border-hs-brass hover:text-hs-ink"
          >
            {signingOut ? "Signing out…" : "Sign out"}
          </button>
        )}
      </div>

      <h1 className="hs-h2 mt-4">Your properties.</h1>
      <p className="hs-lede mt-4 max-w-[56ch]">
        Each property added here gets its own permanent page and a brass plaque
        for the door. When the house sells, the page passes to the new owner.
      </p>
      {agent && <p className="hs-caption mt-3">Signed in as {agent.email}</p>}

      {loadLine && (
        <p className="hs-caption mt-8 text-hs-ink" role="status">
          {loadLine}
        </p>
      )}

      {/* ── Add a property ─────────────────────────────────────────── */}
      <div className="mt-10 border-y border-hs-rule-brass py-6 md:mt-12">
        {!adding ? (
          <div>
            <button
              type="button"
              className="hs-btn hs-btn-brass w-full sm:w-auto"
              onClick={() => {
                setAdding(true);
                setNote(null);
                setAddMessage(null);
              }}
            >
              Add a property
            </button>
            {note && (
              <p className="hs-caption mt-4 max-w-[52ch] text-hs-ink" role="status">
                {note}
              </p>
            )}
          </div>
        ) : (
          <div className="max-w-[42rem]">
            <AddressSearch
              id="agent-address-search"
              label="The property’s address"
              value={address}
              onChange={(next) => {
                setAddress(next);
                setAddMessage(null);
              }}
              onAccept={(value) => setAddress(value)}
              message={addMessage}
            />
            <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
              <button
                type="button"
                className="hs-btn hs-btn-brass w-full sm:w-auto"
                onClick={addProperty}
                disabled={addingBusy}
              >
                {addingBusy ? "Adding…" : "Add to my properties"}
              </button>
              <button
                type="button"
                className="hs-caption text-left underline decoration-hs-rule underline-offset-4 hover:text-hs-ink"
                onClick={() => {
                  setAdding(false);
                  setAddress("");
                  setAddMessage(null);
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── The ledger ─────────────────────────────────────────────── */}
      {homes && homes.length === 0 && (
        <div className="mt-10 border border-hs-rule bg-hs-surface px-5 py-8 md:px-8">
          <h2 className="hs-h3">No properties yet.</h2>
          <p className="hs-body mt-3 max-w-[52ch]">
            Properties added here each get their own permanent page and plaque.
            Nothing is public until you publish it.
          </p>
        </div>
      )}

      {homes && homes.length > 0 && (
        <section className="mt-10 md:mt-12">
          <div className="flex items-baseline justify-between border-b border-hs-rule-brass pb-3">
            <p className="hs-label">Property</p>
            <p className="hs-label">
              {homes.length} {homes.length === 1 ? "property" : "properties"}
            </p>
          </div>
          <ul>
            {homes.map((home) => (
              <li
                key={home.id}
                className="border-b border-hs-rule py-6 md:grid md:grid-cols-[1fr_auto] md:items-baseline md:gap-10"
              >
                <div className="min-w-0">
                  <p className="font-display text-lg leading-snug break-words md:text-xl">
                    {home.address}
                  </p>
                  <p className="hs-caption mt-2">
                    {home.status === "published" ? "Published" : "Draft"}
                    <span aria-hidden="true"> · </span>
                    last touched {formatTouched(home.updatedAt)}
                  </p>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 md:mt-0 md:justify-end">
                  {home.publicId && (
                    <Link
                      to="/h/$publicId"
                      params={{ publicId: home.publicId }}
                      className="hs-link"
                    >
                      Open page
                    </Link>
                  )}
                  <Link
                    to="/homes/$id/edit"
                    params={{ id: home.id }}
                    className="hs-link"
                  >
                    Open editor
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ── Billing — what is true ─────────────────────────────────── */}
      <section className="mt-16 border-t border-hs-rule-brass pt-8">
        <p className="hs-label">Your plan</p>
        <h2 className="hs-h3 mt-3">Agent accounts are free while HomeStory is being set up.</h2>
        <p className="hs-body mt-3 max-w-[56ch]">
          No subscription is being charged. The £9.99 a month per agent plan is
          not yet available — it cannot be sold until our payment account can
          take monthly payments. There is nothing to do about this now.
        </p>
      </section>
    </div>
  );
}
