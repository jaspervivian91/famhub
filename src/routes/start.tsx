import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";

import { AddressSearch } from "~/components/address-search";

export const Route = createFileRoute("/start")({
  head: () => ({
    meta: [
      { title: "Start your home’s page — HomeStory" },
      {
        name: "description",
        content:
          "Type your address to begin your home’s history page. Where no records are connected, HomeStory says so and you fill in what you know.",
      },
    ],
  }),
  component: StartScreen,
});

const RECORD_ROWS = [
  {
    key: "lastSalePrice",
    label: "Last sale price",
    hint: "What you know — e.g. £412,000",
  },
  { key: "lastSaleDate", label: "Last sale date", hint: "e.g. 2019" },
  { key: "epcRating", label: "EPC rating", hint: "e.g. D" },
  { key: "buildEra", label: "Build era", hint: "e.g. 1890s, or “between the wars”" },
  {
    key: "previousOwners",
    label: "Previous owners",
    hint: "The names you know, and the years they were here",
  },
] as const;

type FieldKey = (typeof RECORD_ROWS)[number]["key"];
type Fields = Record<FieldKey, string>;

const EMPTY_FIELDS: Fields = {
  lastSalePrice: "",
  lastSaleDate: "",
  epcRating: "",
  buildEra: "",
  previousOwners: "",
};

function StartScreen() {
  const navigate = useNavigate();
  const [typed, setTyped] = useState("");
  const [address, setAddress] = useState<string | null>(null);
  const [fields, setFields] = useState<Fields>(EMPTY_FIELDS);
  const [line, setLine] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const cardRef = useRef<HTMLDivElement>(null);

  const filledCount = Object.values(fields).filter((value) => value.trim() !== "").length;

  useEffect(() => {
    if (address && cardRef.current) {
      cardRef.current.focus({ preventScroll: true });
      cardRef.current.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [address]);

  function acceptTypedAddress(value: string) {
    if (!value) {
      setLine("An address is needed before a page can be started.");
      return;
    }
    setLine(null);
    setAddress(value);
  }

  async function continueToEditor() {
    if (!address) {
      setLine("An address is needed before a page can be started.");
      return;
    }
    setBusy(true);
    setLine(null);
    try {
      const response = await fetch("/api/homes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ address, ...fields }),
      });
      const payload = (await response.json()) as { id?: string; error?: string };
      if (!response.ok || !payload.id) {
        setLine(payload.error ?? "That page could not be started just now.");
        setBusy(false);
        return;
      }
      await navigate({ to: "/homes/$id/edit", params: { id: payload.id } });
    } catch {
      setLine("That page could not be started just now. Please try again.");
      setBusy(false);
    }
  }

  return (
    <div className="hs-wrap pb-20 pt-10 md:pt-16">
      <p className="hs-label">Step one of two</p>
      <h1 className="hs-h2 mt-4 max-w-[20ch]">Start with your address.</h1>
      <p className="hs-lede mt-4 max-w-[54ch]">
        The address is how a home’s page is found, and how it passes to the next
        owner when the house changes hands.
      </p>

      {/* ── Search ─────────────────────────────────────────────────── */}
      <AddressSearch
        id="hs-address-search"
        value={typed}
        onChange={(next) => {
          setTyped(next);
          setLine(null);
          if (address && next.trim() !== address) setAddress(null);
        }}
        onAccept={acceptTypedAddress}
        message={line}
        className="mt-12 max-w-[42rem] md:mt-16"
      />

      {/* ── Preview card ───────────────────────────────────────────── */}
      {address && (
        <div
          ref={cardRef}
          tabIndex={-1}
          className="mt-12 border border-hs-rule bg-hs-surface focus:outline-none md:mt-16"
        >
          <div className="border-b border-hs-rule-brass px-5 py-5 md:px-8 md:py-6">
            <p className="hs-label">What we have for this address</p>
            <h2 className="mt-3 font-display text-2xl leading-tight md:text-3xl">
              {address}
            </h2>
          </div>

          <div className="px-5 py-2 md:px-8">
            {RECORD_ROWS.map((row) => (
              <div
                key={row.key}
                className="border-b border-hs-rule-brass py-5 last:border-b-0 md:py-6"
              >
                <label
                  htmlFor={`record-${row.key}`}
                  className="hs-caption block tracking-[0.16em] uppercase"
                >
                  {row.label}
                </label>
                <input
                  id={`record-${row.key}`}
                  type="text"
                  value={fields[row.key]}
                  placeholder="Not yet on record"
                  className="hs-line-input mt-1"
                  onChange={(event) =>
                    setFields((current) => ({
                      ...current,
                      [row.key]: event.target.value,
                    }))
                  }
                />
                <p className="hs-caption mt-2 opacity-80">{row.hint}</p>
              </div>
            ))}
          </div>

          <div className="border-t border-hs-rule px-5 py-5 md:px-8 md:py-6">
            <p className="hs-caption max-w-[52ch]">
              {filledCount > 0
                ? "Some of the record is filled in — you can fill in the rest."
                : "Nothing has been looked up yet: no record source is connected, so every row stays blank until you fill it in."}
            </p>

            <button
              type="button"
              className="hs-btn hs-btn-brass mt-6 w-full sm:w-auto"
              onClick={continueToEditor}
              disabled={busy}
            >
              {busy ? "Starting your page…" : "Looks right — continue"}
            </button>
          </div>
        </div>
      )}

      <div className="mt-8 max-w-[54ch]">
        <p className="hs-caption">
          The sale price, EPC rating, build era and previous owners above come
          from the owner — no record source is connected to HomeStory yet, and
          nothing is invented to fill the gaps. Anything you enter here can be
          corrected later, and nothing about your home is public until you
          publish it.
        </p>
        <p className="hs-caption mt-4">
          <Link to="/" className="hs-link">
            Back to HomeStory
          </Link>
        </p>
      </div>
    </div>
  );
}
