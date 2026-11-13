import { Link, createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/premium/thanks")({
  head: () => ({
    meta: [
      { title: "Thank you — HomeStory Premium" },
      {
        name: "description",
        content:
          "Your HomeStory Premium payment has been taken. Payments are matched to their home by hand, usually within a few hours.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PremiumThanks,
});

/** The home id Stripe was told about, when the return carries it back. */
function referenceFromUrl(): string | null {
  const ref = new URLSearchParams(window.location.search).get("client_reference_id");
  if (!ref) return null;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(ref.trim())
    ? ref.trim()
    : null;
}

function PremiumThanks() {
  const [homeId, setHomeId] = useState<string | null>(null);

  useEffect(() => {
    setHomeId(referenceFromUrl());
  }, []);

  return (
    <main className="mx-auto max-w-[46rem] px-6 pb-24 pt-16 md:pt-24">
      <p className="hs-label">HomeStory Premium</p>
      <h1 className="hs-h2 mt-4">Thank you — your payment is in.</h1>

      <p className="hs-caption mt-6 max-w-[52ch] text-hs-ink">
        Stripe has taken the £24.99 payment for this house. Each payment carries the
        page it was made for, and it is matched to that page by hand — usually within
        a few hours. There is nothing you need to do.
      </p>

      <p className="hs-caption mt-4 max-w-[52ch]">
        Once it has been matched, Story Polish and Ask Your House open on the home’s
        page. Everything else — the page itself, the building record, your words and
        photographs, and the plaque — is already there and has not waited for this.
      </p>

      <p className="hs-caption mt-4 max-w-[52ch]">
        Premium is a one-off for the house, not a subscription: nothing is charged
        again, and it stays with the house when the page passes to its next owner.
      </p>

      <p className="hs-caption mt-12 border-t border-hs-rule-brass pt-6 max-w-[52ch]">
        Keep the receipt Stripe emails you — it is your record of the payment. We
        never see or hold your card details.
      </p>

      <p className="hs-caption mt-6">
        {homeId ? (
          <Link to="/homes/$id/premium" params={{ id: homeId }} className="hs-link">
            Back to this home
          </Link>
        ) : (
          <Link to="/" className="hs-link">
            Back to HomeStory
          </Link>
        )}
      </p>
    </main>
  );
}
