import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";

import { AddressSearch, type EpcCertificateSummary } from "~/components/address-search";

export const Route = createFileRoute("/start")({
  head: () => ({
    meta: [
      { title: "Start your home’s page — HomeStory" },
      {
        name: "description",
        content:
          "Type your postcode to fill your home’s physical record from the official EPC register, then add the story only you know.",
      },
    ],
  }),
  component: StartScreen,
});

/** The six facts the EPC register holds about the building. */
const EPC_ROWS = [
  { key: "floorArea", label: "Floor area", hint: "From the certificate, e.g. 153 m²" },
  { key: "epcRating", label: "EPC rating", hint: "The current energy band, A–G" },
  { key: "wallType", label: "Walls", hint: "As the assessment recorded them" },
  { key: "roofType", label: "Roof", hint: "As the assessment recorded it" },
  { key: "windowType", label: "Windows", hint: "Glazing, as recorded" },
  { key: "buildEra", label: "Build era", hint: "Only where the certificate carries it" },
] as const;

/** The facts the register does not hold. The owner types these. */
const OWNER_ROWS = [
  { key: "lastSalePrice", label: "Last sale price", hint: "What you know — e.g. £412,000" },
  { key: "lastSaleDate", label: "Last sale date", hint: "e.g. 2019" },
  {
    key: "previousOwners",
    label: "Previous owners",
    hint: "The names you know, and the years they were here",
  },
] as const;

type EpcKey = (typeof EPC_ROWS)[number]["key"];
type OwnerKey = (typeof OWNER_ROWS)[number]["key"];
type Fields = Record<EpcKey | OwnerKey, string>;

const EMPTY_FIELDS: Fields = {
  floorArea: "",
  epcRating: "",
  buildEra: "",
  wallType: "",
  roofType: "",
  windowType: "",
  lastSalePrice: "",
  lastSaleDate: "",
  previousOwners: "",
};

type EpcRecord = {
  certificateNumber: string;
  recordedOn: string;
  recordedLabel: string;
  uprn: string;
  fields: EpcKey[];
};

function formatDate(iso: string): string {
  if (!iso) return "";
  const date = new Date(`${iso.slice(0, 10)}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

function StartScreen() {
  const navigate = useNavigate();
  const [typed, setTyped] = useState("");
  const [address, setAddress] = useState<string | null>(null);
  const [fields, setFields] = useState<Fields>(EMPTY_FIELDS);
  const [epc, setEpc] = useState<EpcRecord | null>(null);
  const [epcLine, setEpcLine] = useState<string | null>(null);
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

  /** A certificate was chosen: fill the six facts from the official record. */
  async function useCertificate(certificate: EpcCertificateSummary) {
    setEpcLine(null);
    setEpc(null);
    setFields(EMPTY_FIELDS);
    try {
      const response = await fetch(
        `/api/epc/lookup?certificateNumber=${encodeURIComponent(certificate.certificateNumber)}`,
      );
      const payload = (await response.json().catch(() => ({}))) as {
        connected?: boolean;
        found?: boolean;
        certificate?: {
          certificateNumber: string;
          floorArea: string | null;
          epcRating: string | null;
          walls: string | null;
          roof: string | null;
          windows: string | null;
          buildEra: string | null;
          registeredOn: string | null;
          uprn: string | null;
        };
        error?: string;
      };

      if (payload.connected === false || !payload.found || !payload.certificate) {
        setEpcLine(
          payload.error ??
            "The EPC register could not be read for that certificate, so the rows below are yours to fill in.",
        );
        return;
      }

      const facts = payload.certificate;
      const next: Partial<Fields> = {
        floorArea: facts.floorArea ?? "",
        epcRating: facts.epcRating ?? "",
        buildEra: facts.buildEra ?? "",
        wallType: facts.walls ?? "",
        roofType: facts.roof ?? "",
        windowType: facts.windows ?? "",
      };
      const keys = (Object.keys(next) as EpcKey[]).filter((key) => (next[key] ?? "") !== "");

      setFields((current) => ({ ...current, ...next }));
      setEpc({
        certificateNumber: facts.certificateNumber,
        recordedOn: facts.registeredOn ?? "",
        recordedLabel: formatDate(facts.registeredOn ?? ""),
        uprn: facts.uprn ?? "",
        fields: keys,
      });
    } catch {
      setEpcLine(
        "The EPC register could not be reached just now, so the rows below are yours to fill in.",
      );
    }
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
        body: JSON.stringify({
          address,
          ...fields,
          epcSourced: Boolean(epc),
          epcCertificateNumber: epc?.certificateNumber ?? "",
          epcRecordedOn: epc?.recordedOn ?? "",
          epcUprn: epc?.uprn ?? "",
          epcFields: epc?.fields ?? [],
        }),
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

  const buildEraMissing = Boolean(epc) && !epc?.fields.includes("buildEra");

  return (
    <div className="hs-wrap pb-20 pt-10 md:pt-16">
      <p className="hs-label">Step one of two</p>
      <h1 className="hs-h2 mt-4 max-w-[20ch]">Start with your address.</h1>
      <p className="hs-lede mt-4 max-w-[54ch]">
        Type your postcode and we will fill what the official EPC register holds
        for your home. The address is how a home’s page is found, and how it
        passes to the next owner when the house changes hands.
      </p>

      {/* ── Search ─────────────────────────────────────────────────── */}
      <AddressSearch
        id="hs-address-search"
        value={typed}
        epcLookup
        onChange={(next) => {
          setTyped(next);
          setLine(null);
          if (address && next.trim() !== address) {
            setAddress(null);
            setEpc(null);
            setFields(EMPTY_FIELDS);
          }
        }}
        onAccept={acceptTypedAddress}
        onEpcCertificate={useCertificate}
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
            {epc && (
              <p className="hs-caption mt-3 max-w-[52ch]">
                The building below is from the EPC register, certificate recorded{" "}
                {epc.recordedLabel || "on an unrecorded date"}. Correct anything
                that is wrong — your version is the one that is kept.
              </p>
            )}
          </div>

          <div className="px-5 py-2 md:px-8">
            {EPC_ROWS.map((row) => {
              const fromRecord = epc?.fields.includes(row.key) ?? false;
              return (
                <div
                  key={row.key}
                  className="border-b border-hs-rule-brass py-5 md:py-6"
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
                    placeholder={epc ? "Not on the EPC record" : "Not yet on record"}
                    className="hs-line-input mt-1"
                    onChange={(event) =>
                      setFields((current) => ({
                        ...current,
                        [row.key]: event.target.value,
                      }))
                    }
                  />
                  {fromRecord ? (
                    <p className="hs-caption mt-2">
                      From the EPC register
                      {epc?.recordedLabel ? ` · recorded ${epc.recordedLabel}` : ""}
                    </p>
                  ) : (
                    <p className="hs-caption mt-2 opacity-80">
                      {epc ? "Not on the EPC record — yours to fill in." : row.hint}
                    </p>
                  )}
                </div>
              );
            })}

            {OWNER_ROWS.map((row) => (
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
            {epcLine && (
              <p className="hs-caption mb-4 max-w-[52ch] text-hs-ink" role="status">
                {epcLine}
              </p>
            )}

            {buildEraMissing && (
              <p className="hs-caption mb-4 max-w-[52ch]">
                This certificate carries no build era, so that row stays blank
                rather than being guessed from the walls or the roof. Fill it in
                if you know it.
              </p>
            )}

            <p className="hs-caption max-w-[52ch]">
              {epc
                ? "Energy performance data from the EPC register (Open Government Licence v3.0). The sale price and previous owners are still not available from any record source — those are yours to fill in, and nothing is invented to fill the gaps."
                : filledCount > 0
                  ? "Some of the record is filled in — you can fill in the rest."
                  : "No certificate was found for this address, so every row is yours to fill in. Nothing is guessed to fill the gaps."}
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
          The building’s record — floor area, energy rating, walls, roof, windows
          and, where the certificate carries it, build era — comes from the
          official EPC register. The people are not on any register we can reach:
          sale prices and previous owners come from you, and nothing is invented
          to fill the gaps. Anything you enter here can be corrected later, and
          nothing about your home is public until you publish it.
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
