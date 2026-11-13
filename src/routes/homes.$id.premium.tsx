import { Link, createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/homes/$id/premium")({
  head: () => ({
    meta: [
      { title: "HomeStory Premium — HomeStory" },
      {
        name: "description",
        content:
          "HomeStory Premium: a one-off £24.99 for this house, which adds Story Polish and Ask Your House and stays with the house for ever.",
      },
    ],
  }),
  component: PremiumScreen,
});

type Seller = {
  name: string | null;
  address: string | null;
  email: string | null;
  vatStatus: string | null;
  refundPolicyUrl: string | null;
};

type PremiumState = {
  homeId: string;
  publicId: string | null;
  address: string;
  premium: boolean;
  premiumAt: string | null;
  onSale: boolean;
  /** The hosted Stripe payment link, with this home named on it. */
  payUrl: string | null;
  paymentsConnected: boolean;
  missing: string[];
  price: { label: string; amount: number; currency: string };
  terms: string;
  seller: Seller;
  purchase: { amountTotal: number; currency: string; paidAt: string } | null;
};

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

function PremiumScreen() {
  const { id } = Route.useParams();

  const [data, setData] = useState<PremiumState | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [line, setLine] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const response = await fetch(`/api/homes/${id}/premium`);
        const payload = (await response.json().catch(() => ({}))) as PremiumState & {
          error?: string;
        };
        if (cancelled) return;
        if (!response.ok) {
          setLoadError(payload.error ?? "That home could not be found.");
          return;
        }
        setData(payload);

        // Back from Stripe. The query string only says which session to ask
        // about — the server asks Stripe and decides. Nothing here marks a home.
        const query = new URLSearchParams(window.location.search);
        const sessionId = query.get("session_id");
        const wasCancelled = query.get("cancelled");

        if (sessionId && !payload.premium) {
          setChecking(true);
          try {
            const verify = await fetch(`/api/homes/${id}/premium/verify`, {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ sessionId }),
            });
            const result = (await verify.json().catch(() => ({}))) as {
              premium?: boolean;
              error?: string;
            };
            if (cancelled) return;
            if (verify.ok && result.premium) {
              setData({ ...payload, premium: true, premiumAt: new Date().toISOString() });
              setLine("Premium is on for this house. Story Polish and Ask Your House are both open now.");
            } else {
              setLine(
                result.error ??
                  "That payment could not be confirmed, so nothing has been changed.",
              );
            }
          } catch {
            if (!cancelled) {
              setLine("That payment could not be checked just now. Nothing has been changed.");
            }
          } finally {
            if (!cancelled) setChecking(false);
          }
        } else if (wasCancelled) {
          setLine("You left the payment page before paying, so nothing has been charged.");
        }

        if ((sessionId || wasCancelled) && !cancelled) {
          window.history.replaceState({}, "", window.location.pathname);
        }
      } catch {
        if (!cancelled) setLoadError("That home could not be loaded just now.");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loadError) {
    return (
      <main className="mx-auto max-w-[46rem] px-6 py-24">
        <h1 className="hs-h2">That home could not be opened</h1>
        <p className="hs-caption mt-4">{loadError}</p>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="mx-auto max-w-[46rem] px-6 py-24">
        <p className="hs-caption">Opening…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-[46rem] px-6 pb-24 pt-16 md:pt-24">
      <p className="hs-label">HomeStory Premium</p>
      <h1 className="hs-h2 mt-4">The whole story of {data.address}</h1>
      <p className="hs-caption mt-4 max-w-[52ch]">{data.terms}</p>

      <section className="mt-12 border-t border-hs-rule-brass pt-8">
        <h2 className="hs-h3">What it adds</h2>
        <ul className="mt-6 space-y-5">
          <li>
            <p className="font-body text-base text-hs-ink">Story Polish</p>
            <p className="hs-caption mt-1 max-w-[52ch]">
              Claude refines your own writing into a clearer version of itself — a
              suggestion you keep or discard. Your words are never replaced without
              your say-so, and nothing is added that you did not write.
            </p>
          </li>
          <li>
            <p className="font-body text-base text-hs-ink">Ask Your House</p>
            <p className="hs-caption mt-1 max-w-[52ch]">
              A visitor at the door can ask about the house, and Claude answers from
              what the page records — saying plainly when the page does not record
              something rather than guessing.
            </p>
          </li>
        </ul>
        <p className="hs-caption mt-8 max-w-[52ch]">
          The page, the building record from the EPC register, your photographs and
          the plaque stay exactly as they are. Nothing a free page already has is
          taken away.
        </p>
      </section>

      <section className="mt-12 border-t border-hs-rule-brass pt-8">
        <h2 className="hs-h3">Price</h2>
        <p className="mt-4 font-display text-3xl text-hs-ink">
          {data.price.label}{" "}
          <span className="font-body text-base text-hs-muted">once, for this house</span>
        </p>

        {data.premium ? (
          <p className="hs-caption mt-6 max-w-[52ch] text-hs-ink">
            Premium is on for this house
            {data.premiumAt ? ` — paid ${formatDate(data.premiumAt)}` : ""}. It stays
            with the house when the page passes to its next owner.
          </p>
        ) : data.onSale && data.payUrl ? (
          <>
            <a
              href={data.payUrl}
              className="hs-btn hs-btn-brass mt-6"
              rel="noreferrer noopener"
            >
              {`Add Premium — ${data.price.label}`}
            </a>
            <p className="hs-caption mt-4 max-w-[52ch]">
              Payment is taken on Stripe’s own secure page. We never see your card
              details, and nothing is charged until you have paid there.
            </p>
            <p className="hs-caption mt-3 max-w-[52ch]">
              Your payment arrives with this page’s reference on it, and it is
              matched to this home by hand — usually within a few hours. Story
              Polish and Ask Your House open once it has been matched; nothing else
              on the page waits for it.
            </p>
          </>
        ) : (
          <div className="mt-6 max-w-[52ch]">
            <p className="hs-caption text-hs-ink">
              HomeStory Premium is not on sale yet — there is no payment page to
              send you to. Nothing has been charged.
            </p>
            {data.missing.length > 0 && (
              <p className="hs-caption mt-3 opacity-75">
                Still to be set: {data.missing.join(", ")}.
              </p>
            )}
          </div>
        )}

        {checking && (
          <p className="hs-caption mt-6 max-w-[52ch]">Checking that payment…</p>
        )}

        {line && (
          <p className="hs-caption mt-6 max-w-[52ch] text-hs-ink" role="status">
            {line}
          </p>
        )}
      </section>

      <section className="mt-12 border-t border-hs-rule pt-6">
        <h2 className="hs-label">Who you are buying from</h2>
        <dl className="mt-4 space-y-2">
          <SellerLine term="Seller" value={data.seller.name} />
          <SellerLine term="Address" value={data.seller.address} />
          <SellerLine term="Contact" value={data.seller.email} />
          <SellerLine term="VAT" value={data.seller.vatStatus} />
        </dl>
        <p className="hs-caption mt-4 max-w-[52ch]">
          {data.seller.refundPolicyUrl ? (
            <a
              href={data.seller.refundPolicyUrl}
              className="hs-link"
              rel="noreferrer noopener"
              target="_blank"
            >
              Refund and cancellation policy
            </a>
          ) : (
            <span className="opacity-75">Refund and cancellation policy — not yet set.</span>
          )}
        </p>
      </section>

      <p className="hs-caption mt-12 border-t border-hs-rule pt-6">
        {data.publicId ? (
          <Link to="/h/$publicId" params={{ publicId: data.publicId }} className="hs-link">
            Back to this home’s page
          </Link>
        ) : (
          <Link to="/homes/$id/edit" params={{ id: data.homeId }} className="hs-link">
            Back to the editor
          </Link>
        )}
      </p>
    </main>
  );
}

/** One line of the seller details. Unset is shown as unset — never invented. */
function SellerLine({ term, value }: { term: string; value: string | null }) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:gap-4">
      <dt className="hs-caption w-24 shrink-0 opacity-75">{term}</dt>
      <dd className="font-body text-base text-hs-ink">
        {value ? value : <span className="text-hs-muted opacity-75">Not yet set</span>}
      </dd>
    </div>
  );
}
