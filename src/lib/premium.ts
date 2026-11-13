/**
 * HomeStory Premium — what it costs, who is selling it, and what counts as paid.
 *
 * Premium is one £24.99 payment for one house. The product and price already
 * exist in Stripe; this file only names them. Nothing here charges anything.
 *
 * Seller details are the owner's to supply (legal name, address, contact email,
 * VAT status, refund and cancellation policy). Until they are set, the checkout
 * page says plainly that Premium is not yet on sale and the buy button is not
 * offered — money is not taken without them, which is what distance-selling
 * rules for a digital purchase require.
 *
 * Server-only: never import this from client code (it reads the Stripe key).
 */

/** The one price that exists for Premium, in Stripe. Do not create another. */
export const PREMIUM_PRODUCT_ID = "prod_Vc8k3Rr1ywenoM";
export const PREMIUM_PRICE_ID = "price_1UauSYDuqax7ipnx1t92qSii";
export const PREMIUM_AMOUNT_PENCE = 2499;
export const PREMIUM_CURRENCY = "gbp";
export const PREMIUM_PRICE_LABEL = "£24.99";

/** Shown wherever Premium is mentioned, so the same words appear everywhere. */
export const PREMIUM_TERMS_LINE =
  "A one-off £24.99 for this house — not a subscription, and nothing is charged again. It stays with the house when the page passes to its next owner.";

export function stripeKey(): string | null {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  return key ? key : null;
}

/**
 * The live buy path: the hosted Stripe Payment Link for the one Premium price.
 *
 * This account is an express account and no secret key is available, so a
 * server-created Checkout Session cannot run here. A payment link needs no key
 * — Stripe hosts the page and takes the money. The home is named on the link
 * with `client_reference_id`, which Stripe records against the payment; the
 * owner reads it off the Stripe dashboard and unlocks the home by hand on
 * /admin/premium.
 */
export const PREMIUM_PAYMENT_LINK = "https://buy.stripe.com/6oUcN5eZidjBfGg3UU5Ne01";

/** The same link with this home named, so the payment says which house it is for. */
export function premiumPaymentLink(homeId: string): string {
  const url = new URL(PREMIUM_PAYMENT_LINK);
  url.searchParams.set("client_reference_id", homeId);
  return url.toString();
}

export type SellerDetails = {
  name: string | null;
  address: string | null;
  email: string | null;
  vatStatus: string | null;
  refundPolicyUrl: string | null;
};

function env(name: string): string | null {
  const value = process.env[name]?.trim();
  return value ? value : null;
}

/** The seller details shown before payment. Null means "the owner has not set it yet". */
export function sellerDetails(): SellerDetails {
  return {
    name: env("PREMIUM_SELLER_NAME"),
    address: env("PREMIUM_SELLER_ADDRESS"),
    email: env("PREMIUM_SELLER_EMAIL"),
    vatStatus: env("PREMIUM_VAT_STATUS"),
    refundPolicyUrl: env("PREMIUM_REFUND_POLICY_URL"),
  };
}

/** What is still missing before Premium can be sold, in words the page can show. */
export function missingSellerDetails(): string[] {
  const seller = sellerDetails();
  const missing: string[] = [];
  if (!seller.name) missing.push("the seller’s legal name");
  if (!seller.address) missing.push("the seller’s address");
  if (!seller.email) missing.push("a contact email");
  if (!seller.vatStatus) missing.push("the VAT status");
  if (!seller.refundPolicyUrl) missing.push("the refund and cancellation policy");
  return missing;
}

/**
 * Premium is on sale when there is a page to pay on. That is the hosted payment
 * link, which needs no secret key. The seller details are still shown on the
 * Premium page, and any that are unset read "Not yet set" — but they no longer
 * hold the button back, because the live path is a link rather than a session.
 */
export function premiumOnSale(): boolean {
  return Boolean(PREMIUM_PAYMENT_LINK);
}

// ── Deciding whether a payment really is a payment for this home ─────────

/** The parts of a Stripe Checkout Session this decision depends on. */
export type CheckoutSession = {
  id?: string | null;
  status?: string | null;
  payment_status?: string | null;
  amount_total?: number | null;
  currency?: string | null;
  client_reference_id?: string | null;
  metadata?: Record<string, string> | null;
};

export type VerifyVerdict = { ok: true } | { ok: false; reason: string };

/**
 * The whole of the "is this paid?" decision, in one place and with no I/O, so
 * it can be read and checked on its own. Everything it inspects comes from
 * Stripe's own answer, never from the query string.
 *
 * A session counts only if it is paid, in full, in pounds, and names this home.
 */
export function sessionConfirmsHome(
  session: CheckoutSession | null,
  homeId: string,
): VerifyVerdict {
  if (!session) return { ok: false, reason: "That payment could not be found." };

  if (session.payment_status !== "paid") {
    return { ok: false, reason: "That payment has not completed, so nothing has been changed." };
  }

  if (session.amount_total !== PREMIUM_AMOUNT_PENCE) {
    return { ok: false, reason: "That payment was not for the £24.99 Premium price." };
  }

  if ((session.currency ?? "").toLowerCase() !== PREMIUM_CURRENCY) {
    return { ok: false, reason: "That payment was not made in pounds sterling." };
  }

  const named = session.metadata?.homeId ?? session.client_reference_id ?? "";
  if (!named || named !== homeId) {
    return { ok: false, reason: "That payment belongs to a different home." };
  }

  return { ok: true };
}
