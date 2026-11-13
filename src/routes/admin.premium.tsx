import { Link, createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";

export const Route = createFileRoute("/admin/premium")({
  head: () => ({
    meta: [
      { title: "Premium — HomeStory" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPremium,
});

const TOKEN_KEY = "hs-premium-admin-token";

type AdminHome = {
  id: string;
  address: string;
  publicId: string | null;
  premium: boolean;
  premiumAt: string | null;
  status: string;
  createdAt: string;
};

function formatDate(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function AdminPremium() {
  const [token, setToken] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [homes, setHomes] = useState<AdminHome[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [line, setLine] = useState<string | null>(null);

  // A token can arrive in the address or be pasted in. It is kept for this tab
  // only, and taken out of the address once it has been read.
  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get("token");
    const stored = fromUrl ?? window.sessionStorage.getItem(TOKEN_KEY);
    if (fromUrl) {
      window.sessionStorage.setItem(TOKEN_KEY, fromUrl);
      window.history.replaceState({}, "", window.location.pathname);
    }
    if (stored) setToken(stored);
  }, []);

  const load = useCallback(async (value: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/premium", {
        headers: { "x-admin-token": value },
      });
      const payload = (await response.json().catch(() => ({}))) as {
        homes?: AdminHome[];
        error?: string;
      };
      if (response.status === 404) {
        setError("This screen is not open on this site.");
        setHomes(null);
        return;
      }
      if (response.status === 401) {
        window.sessionStorage.removeItem(TOKEN_KEY);
        setToken(null);
        setHomes(null);
        setError("That token is not right.");
        return;
      }
      if (!response.ok) {
        setError(payload.error ?? "The list of homes could not be loaded just now.");
        return;
      }
      setHomes(payload.homes ?? []);
    } catch {
      setError("The list of homes could not be loaded just now.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (token) void load(token);
  }, [token, load]);

  async function unlock(homeId: string) {
    if (!token) return;
    setBusyId(homeId);
    setLine(null);
    try {
      const response = await fetch("/api/admin/premium/unlock", {
        method: "POST",
        headers: { "content-type": "application/json", "x-admin-token": token },
        body: JSON.stringify({ homeId }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        premiumAt?: string;
        error?: string;
      };
      if (!response.ok) {
        setLine(payload.error ?? "That home could not be unlocked just now.");
        return;
      }
      setHomes(
        (current) =>
          current?.map((home) =>
            home.id === homeId
              ? { ...home, premium: true, premiumAt: payload.premiumAt ?? home.premiumAt }
              : home,
          ) ?? null,
      );
      setLine("Premium is on for that home. Story Polish and Ask Your House are open now.");
    } catch {
      setLine("That home could not be unlocked just now.");
    } finally {
      setBusyId(null);
    }
  }

  if (!token) {
    return (
      <main className="mx-auto max-w-[46rem] px-6 pb-24 pt-16 md:pt-24">
        <p className="hs-label">HomeStory</p>
        <h1 className="hs-h2 mt-4">Premium</h1>
        <p className="hs-caption mt-4 max-w-[52ch]">
          This screen is for the owner of HomeStory. Enter the admin token to see
          the homes and unlock Premium on one.
        </p>
        <form
          className="mt-8 flex max-w-[30rem] flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            const value = draft.trim();
            if (!value) return;
            window.sessionStorage.setItem(TOKEN_KEY, value);
            setError(null);
            setToken(value);
            setDraft("");
          }}
        >
          <label className="hs-label" htmlFor="admin-token">
            Admin token
          </label>
          <input
            id="admin-token"
            type="password"
            className="hs-line-input"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            autoComplete="off"
          />
          <button type="submit" className="hs-btn hs-btn-ink self-start">
            Open
          </button>
        </form>
        {error && (
          <p className="hs-caption mt-6 text-hs-ink" role="status">
            {error}
          </p>
        )}
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-[52rem] px-6 pb-24 pt-16 md:pt-24">
      <p className="hs-label">HomeStory</p>
      <h1 className="hs-h2 mt-4">Premium</h1>
      <p className="hs-caption mt-4 max-w-[56ch]">
        Payments arrive on Stripe with a reference naming the home they were made
        for. Find that home here and unlock it. Unlocking is by hand, so the
        reference is worth checking before you press it.
      </p>

      {line && (
        <p className="hs-caption mt-6 text-hs-ink" role="status">
          {line}
        </p>
      )}

      {error && (
        <p className="hs-caption mt-6 text-hs-ink" role="status">
          {error}
        </p>
      )}

      {loading && <p className="hs-caption mt-10">Opening…</p>}

      {!loading && homes && homes.length === 0 && (
        <p className="hs-caption mt-10">There are no homes yet.</p>
      )}

      {!loading && homes && homes.length > 0 && (
        <ul className="mt-10 border-t border-hs-rule-brass">
          {homes.map((home) => (
            <li key={home.id} className="border-b border-hs-rule py-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="font-body text-base text-hs-ink">{home.address}</p>
                  <p className="hs-caption mt-1 opacity-75">
                    {home.publicId ? `Published at /h/${home.publicId}` : "Not published"}
                    {" · "}
                    Added {formatDate(home.createdAt)}
                  </p>
                  <p className="hs-caption mt-1">
                    {home.premium
                      ? `Premium${home.premiumAt ? ` — since ${formatDate(home.premiumAt)}` : ""}`
                      : "Free"}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-5">
                  {home.publicId && (
                    <Link
                      to="/h/$publicId"
                      params={{ publicId: home.publicId }}
                      className="hs-link hs-caption"
                    >
                      Open page
                    </Link>
                  )}
                  {home.premium ? (
                    <span className="hs-label opacity-60">Unlocked</span>
                  ) : (
                    <button
                      type="button"
                      className="hs-btn hs-btn-ink"
                      onClick={() => unlock(home.id)}
                      disabled={busyId === home.id}
                    >
                      {busyId === home.id ? "Unlocking…" : "Unlock Premium"}
                    </button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
