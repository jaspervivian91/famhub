import { Link, createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/homes/$id/plaque")({
  head: () => ({
    meta: [
      { title: "The plaque — HomeStory" },
      {
        name: "description",
        content:
          "A brass plaque engraved with your home’s QR code. See the code that will be cut into the metal, and reserve a plaque.",
      },
    ],
  }),
  component: PlaqueScreen,
});

const PRICE = "£34.99";

/** The shape of a UK postcode, checked kindly — case and spacing are forgiven. */
const UK_POSTCODE = /^[A-Za-z]{1,2}\d[A-Za-z\d]?\s*\d[A-Za-z]{2}$/;

const SPECIFICATION = [
  { term: "Material", detail: "Solid brass, unlacquered, so it ages with the wall." },
  { term: "Engraved", detail: "The QR code above, cut into the metal — not printed on." },
  { term: "Inscribed", detail: "Your home’s address." },
  { term: "Fixing", detail: "Two brass screws and a paper template for the holes." },
  { term: "Made", detail: "To order, one at a time." },
];

type Order = {
  id: string;
  name: string;
  addressLine1: string;
  addressLine2: string | null;
  town: string;
  postcode: string;
  note: string | null;
  status: string;
  createdAt: string;
};

type Loaded = {
  home: { address: string; published: boolean };
  publicUrl: string | null;
  order: Order | null;
};

type Form = {
  name: string;
  addressLine1: string;
  addressLine2: string;
  town: string;
  postcode: string;
  note: string;
};

const EMPTY_FORM: Form = {
  name: "",
  addressLine1: "",
  addressLine2: "",
  town: "",
  postcode: "",
  note: "",
};

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

function PlaqueScreen() {
  const { id } = Route.useParams();

  const [data, setData] = useState<Loaded | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [form, setForm] = useState<Form>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch(`/api/homes/${id}/plaque`);
        const payload = (await response.json().catch(() => ({}))) as Loaded & { error?: string };
        if (cancelled) return;
        if (!response.ok || !payload.home) {
          setLoadError(payload.error ?? "That home could not be found.");
          return;
        }
        setData(payload);
      } catch {
        if (!cancelled) setLoadError("That home could not be loaded just now.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  function update(patch: Partial<Form>) {
    setForm((current) => ({ ...current, ...patch }));
  }

  async function reserve(event: React.FormEvent) {
    event.preventDefault();
    if (submitting) return;
    setFormError(null);

    if (!form.name.trim()) return setFormError("A name is needed on the order.");
    if (!form.addressLine1.trim()) {
      return setFormError("The first line of the delivery address is needed.");
    }
    if (!form.town.trim()) return setFormError("A town or city is needed on the delivery address.");
    if (!form.postcode.trim()) return setFormError("A postcode is needed on the delivery address.");
    if (!UK_POSTCODE.test(form.postcode.trim())) {
      return setFormError("That postcode doesn’t look quite right — a UK one looks like SW1A 2AA.");
    }

    setSubmitting(true);
    try {
      const response = await fetch(`/api/homes/${id}/plaque`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        order?: Order;
        error?: string;
      };
      if (!response.ok || !payload.order) {
        setFormError(payload.error ?? "That order could not be saved just now. Please try again.");
        return;
      }
      setData((current) => (current ? { ...current, order: payload.order! } : current));
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setFormError("That order could not be saved just now. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loadError) {
    return (
      <div className="hs-wrap py-24">
        <p className="hs-label">Not found</p>
        <h1 className="hs-h2 mt-4">This home could not be opened.</h1>
        <p className="hs-caption mt-4">{loadError}</p>
        <p className="mt-8">
          <Link to="/start" className="hs-link">
            Start again
          </Link>
        </p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="hs-wrap py-24">
        <p className="hs-caption">Opening the plaque…</p>
      </div>
    );
  }

  const { home, publicUrl, order } = data;
  const qrSrc = `/api/homes/${id}/plaque/qr.svg`;

  return (
    <div className="hs-wrap pb-24 pt-10 md:pt-16">
      <p className="hs-label">The plaque</p>
      <h1 className="hs-h2 mt-4 max-w-[28ch]">
        A brass plaque for the wall beside your door.
      </h1>
      <p className="hs-lede mt-4 max-w-[52ch]">
        Your home’s story, cut into metal. The code below is the one that is
        engraved — the same code a visitor scans on your doorstep.
      </p>

      {home.published ? (
        <>
          {/* ── The plate, on the door ───────────────────────────────── */}
          <section className="mt-10">
            <div className="relative aspect-[4/5] w-full overflow-hidden bg-hs-surface sm:aspect-[16/11]">
              <img
                src="/images/plaque-door.jpg"
                alt="A brass plaque engraved with a QR code, mounted on the wall beside a dark green front door."
                className="absolute inset-0 h-full w-full object-cover"
                loading="lazy"
                decoding="async"
              />
              <div className="absolute inset-0 flex items-center justify-center p-6 sm:p-10">
                <div className="w-[56%] max-w-[16rem] border border-hs-rule-brass bg-hs-bg p-4 text-center sm:p-6">
                  <img
                    src={qrSrc}
                    alt={`QR code for the HomeStory page of ${home.address}.`}
                    className="mx-auto block w-full"
                    width={640}
                    height={640}
                  />
                  <p className="hs-caption mt-3 border-t border-hs-rule-brass pt-2">
                    {home.address}
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between">
              <p className="hs-caption break-all">
                {publicUrl ? `Encodes ${publicUrl}` : ""}
              </p>
              <a
                href={qrSrc}
                target="_blank"
                rel="noreferrer"
                className="hs-link shrink-0 self-start sm:self-auto"
              >
                Open the code on its own to print
              </a>
            </div>
          </section>

          {/* ── Specification ────────────────────────────────────────── */}
          <section className="mt-14 border-t border-hs-rule-brass pt-8">
            <p className="hs-label">The object</p>
            <dl className="mt-6">
              {SPECIFICATION.map((row) => (
                <div
                  key={row.term}
                  className="flex flex-col gap-1 border-b border-hs-rule py-4 sm:flex-row sm:gap-8"
                >
                  <dt className="hs-caption sm:w-32 sm:shrink-0">{row.term}</dt>
                  <dd className="font-body text-base leading-[1.8] text-hs-ink">{row.detail}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-8 flex items-baseline gap-4">
              <p className="font-display text-2xl">{PRICE}</p>
              <p className="hs-caption">The intended price. Nothing is charged today.</p>
            </div>
          </section>

          {/* ── What we cannot do yet ────────────────────────────────── */}
          <section className="mt-12 border-t border-hs-rule-brass pt-8">
            <p className="hs-label">Before you reserve</p>
            <p className="hs-lede mt-4 max-w-[56ch]">
              No workshop is connected yet. We cannot make or post a plaque today,
              and we cannot give you a delivery date. What we can do is keep your
              order and your delivery address, so it is first in the queue when a
              workshop is connected.
            </p>
            <p className="hs-caption mt-3 max-w-[56ch]">
              No payment is taken now, and none will be taken until you are asked
              and you agree.
            </p>
          </section>

          {/* ── The order ────────────────────────────────────────────── */}
          {order ? (
            <section className="mt-12 border-t border-hs-rule-brass pt-8">
              <p className="hs-label">Saved</p>
              <h2 className="hs-h3 mt-3">Your order is reserved.</h2>
              <p className="hs-lede mt-3 max-w-[56ch]">
                Saved on {formatDate(order.createdAt)}. No payment has been taken.
                Plaques cannot be made or shipped yet, because no workshop is
                connected — your order waits in the queue until one is.
              </p>

              <dl className="mt-6">
                <div className="flex flex-col gap-1 border-b border-hs-rule py-3 sm:flex-row sm:gap-8">
                  <dt className="hs-caption sm:w-32 sm:shrink-0">Status</dt>
                  <dd className="font-body text-base text-hs-ink">Reserved — not paid</dd>
                </div>
                <div className="flex flex-col gap-1 border-b border-hs-rule py-3 sm:flex-row sm:gap-8">
                  <dt className="hs-caption sm:w-32 sm:shrink-0">Deliver to</dt>
                  <dd className="font-body text-base leading-[1.8] text-hs-ink">
                    {order.name}
                    <br />
                    {order.addressLine1}
                    {order.addressLine2 && (
                      <>
                        <br />
                        {order.addressLine2}
                      </>
                    )}
                    <br />
                    {order.town}
                    <br />
                    {order.postcode}
                  </dd>
                </div>
                {order.note && (
                  <div className="flex flex-col gap-1 border-b border-hs-rule py-3 sm:flex-row sm:gap-8">
                    <dt className="hs-caption sm:w-32 sm:shrink-0">Your note</dt>
                    <dd className="font-body text-base leading-[1.8] text-hs-ink">
                      {order.note}
                    </dd>
                  </div>
                )}
              </dl>

              <div className="mt-8 flex flex-wrap gap-x-8 gap-y-3">
                <Link to="/homes/$id/edit" params={{ id }} className="hs-link">
                  Back to your home’s chapter
                </Link>
                {publicUrl && (
                  <Link
                    to="/h/$publicId"
                    params={{ publicId: publicUrl.split("/").pop() ?? "" }}
                    className="hs-link"
                  >
                    View your home’s page
                  </Link>
                )}
              </div>
            </section>
          ) : (
            <section className="mt-12 border-t border-hs-rule-brass pt-8">
              <p className="hs-label">Reserve a plaque</p>
              <h2 className="hs-h3 mt-3">Where should it be sent?</h2>
              <p className="hs-caption mt-2 max-w-[52ch]">
                Kept only so a plaque can be made for you once a workshop is
                connected. Nothing is charged.
              </p>

              <form onSubmit={reserve} className="mt-8 grid gap-x-10 gap-y-6 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label htmlFor="plaque-name" className="hs-caption block">
                    Your name
                  </label>
                  <input
                    id="plaque-name"
                    type="text"
                    value={form.name}
                    className="hs-line-input"
                    autoComplete="name"
                    onChange={(event) => update({ name: event.target.value })}
                  />
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="plaque-line1" className="hs-caption block">
                    Delivery address
                  </label>
                  <input
                    id="plaque-line1"
                    type="text"
                    value={form.addressLine1}
                    placeholder="First line"
                    className="hs-line-input"
                    autoComplete="address-line1"
                    onChange={(event) => update({ addressLine1: event.target.value })}
                  />
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="plaque-line2" className="hs-caption block">
                    Second line <span className="opacity-70">— if needed</span>
                  </label>
                  <input
                    id="plaque-line2"
                    type="text"
                    value={form.addressLine2}
                    className="hs-line-input"
                    autoComplete="address-line2"
                    onChange={(event) => update({ addressLine2: event.target.value })}
                  />
                </div>

                <div>
                  <label htmlFor="plaque-town" className="hs-caption block">
                    Town or city
                  </label>
                  <input
                    id="plaque-town"
                    type="text"
                    value={form.town}
                    className="hs-line-input"
                    autoComplete="address-level2"
                    onChange={(event) => update({ town: event.target.value })}
                  />
                </div>

                <div>
                  <label htmlFor="plaque-postcode" className="hs-caption block">
                    Postcode
                  </label>
                  <input
                    id="plaque-postcode"
                    type="text"
                    value={form.postcode}
                    placeholder="SW1A 2AA"
                    className="hs-line-input"
                    autoComplete="postal-code"
                    autoCapitalize="characters"
                    onChange={(event) => update({ postcode: event.target.value })}
                  />
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="plaque-note" className="hs-caption block">
                    A note <span className="opacity-70">— if you would like</span>
                  </label>
                  <textarea
                    id="plaque-note"
                    value={form.note}
                    rows={3}
                    placeholder="Anything we should know about the door, the wall, or where it should go."
                    className="hs-line-input resize-none"
                    onChange={(event) => update({ note: event.target.value })}
                  />
                </div>

                <div className="sm:col-span-2">
                  <button
                    type="submit"
                    className="hs-btn hs-btn-brass w-full sm:w-auto"
                    disabled={submitting}
                  >
                    {submitting ? "Saving…" : "Reserve a plaque"}
                  </button>
                  <p className="hs-caption mt-4 max-w-[52ch]">
                    This saves your order. No payment is taken, and no plaque can
                    be made or posted until a workshop is connected.
                  </p>
                  {formError && (
                    <p className="hs-caption mt-4 max-w-[52ch] text-hs-ink" role="alert">
                      {formError}
                    </p>
                  )}
                </div>
              </form>
            </section>
          )}
        </>
      ) : (
        /* ── Nothing to engrave yet ─────────────────────────────────── */
        <section className="mt-12 border-t border-hs-rule-brass pt-8">
          <p className="hs-label">Not yet published</p>
          <h2 className="hs-h3 mt-3">There is nothing to engrave yet.</h2>
          <p className="hs-lede mt-3 max-w-[56ch]">
            The plaque carries the QR code for your home’s public page. That page
            does not exist until you publish it, so the code cannot be made and a
            plaque cannot be ordered.
          </p>
          <p className="mt-8">
            <Link to="/homes/$id/edit" params={{ id }} className="hs-link">
              Go back and publish your home’s chapter
            </Link>
          </p>
        </section>
      )}
    </div>
  );
}
