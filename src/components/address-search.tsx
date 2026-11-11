import { useEffect, useRef, useState } from "react";

/**
 * The address search — one search, used both by an individual owner starting a
 * page and by an estate agent adding a property to their ledger.
 *
 * There is still no full list of UK addresses to suggest from, but the EPC
 * register *is* connected: typing a postcode asks it what certificates it holds
 * there, and picking one hands the caller the certificate so the record card can
 * be filled from the official record. A postcode with nothing on the register
 * says so plainly, and what the person typed is always accepted.
 */
export type EpcCertificateSummary = {
  certificateNumber: string;
  addressLine1: string;
  postTown: string;
  postcode: string;
  uprn: string | null;
  band: string | null;
  registeredOn: string | null;
  schemaType: string | null;
};

type LookupState =
  | { kind: "idle" }
  | { kind: "waiting" }
  | { kind: "searching" }
  | { kind: "found"; certificates: EpcCertificateSummary[] }
  | { kind: "empty"; postcode: string }
  | { kind: "offline"; message: string };

type Props = {
  id: string;
  value: string;
  onChange: (value: string) => void;
  onAccept: (address: string) => void;
  label?: string;
  message?: string | null;
  placeholder?: string;
  className?: string;
  /** Ask the EPC register for certificates at the postcode in the search box. */
  epcLookup?: boolean;
  onEpcCertificate?: (certificate: EpcCertificateSummary) => void;
};

const UK_POSTCODE = /[A-Za-z]{1,2}\d[A-Za-z\d]?\s*\d[A-Za-z]{2}/;

function postcodeIn(value: string): string | null {
  const match = UK_POSTCODE.exec(value);
  if (!match) return null;
  return match[0].replace(/\s+/g, "").toUpperCase();
}

function formatDate(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(`${iso.slice(0, 10)}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

export function AddressSearch({
  id,
  value,
  onChange,
  onAccept,
  label = "Your address",
  message = null,
  placeholder = "Start with your postcode or address",
  className = "",
  epcLookup = false,
  onEpcCertificate,
}: Props) {
  const [open, setOpen] = useState(false);
  const [accepted, setAccepted] = useState<string | null>(null);
  const [lookup, setLookup] = useState<LookupState>({ kind: "idle" });
  const inputRef = useRef<HTMLInputElement>(null);
  const optionRef = useRef<HTMLButtonElement>(null);

  const typed = value.trim();
  const postcode = postcodeIn(value);

  // Ask the register as the postcode is typed, once the typing has settled.
  useEffect(() => {
    if (!epcLookup || !postcode) {
      setLookup({ kind: "idle" });
      return;
    }
    let cancelled = false;
    setLookup({ kind: "waiting" });
    const timer = window.setTimeout(async () => {
      if (cancelled) return;
      setLookup({ kind: "searching" });
      try {
        const response = await fetch(`/api/epc/lookup?postcode=${encodeURIComponent(postcode)}`);
        const payload = (await response.json().catch(() => ({}))) as {
          connected?: boolean;
          found?: boolean;
          certificates?: EpcCertificateSummary[];
          message?: string;
          error?: string;
        };
        if (cancelled) return;
        if (payload.connected === false) {
          setLookup({
            kind: "offline",
            message:
              payload.message ??
              "The EPC register is not connected just now, so nothing could be looked up.",
          });
          return;
        }
        if (payload.found && payload.certificates && payload.certificates.length > 0) {
          setLookup({ kind: "found", certificates: payload.certificates });
          return;
        }
        if (payload.error) {
          setLookup({ kind: "offline", message: payload.error });
          return;
        }
        setLookup({ kind: "empty", postcode });
      } catch {
        if (!cancelled) {
          setLookup({
            kind: "offline",
            message: "The EPC register could not be reached just now.",
          });
        }
      }
    }, 450);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [epcLookup, postcode]);

  // If the person typed a house number or street as well as the postcode, only
  // offer the certificates that match what they typed.
  const typedWords = typed.replace(UK_POSTCODE, " ").replace(/[,\s]+/g, " ").trim().toLowerCase();
  const certificates =
    lookup.kind === "found"
      ? lookup.certificates.filter((certificate) =>
          typedWords ? certificate.addressLine1.toLowerCase().includes(typedWords) : true,
        )
      : [];

  function choose(certificate: EpcCertificateSummary) {
    const address = certificate.postcode
      ? `${certificate.addressLine1}, ${certificate.postcode}`
      : certificate.addressLine1;
    setOpen(false);
    setAccepted(address);
    onChange(address);
    onAccept(address);
    onEpcCertificate?.(certificate);
  }

  function acceptTyped() {
    setOpen(false);
    setAccepted(typed);
    onAccept(typed);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      requestAnimationFrame(() => optionRef.current?.focus());
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (open && certificates.length > 0) choose(certificates[0]);
      else if (open) acceptTyped();
      else if (accepted && accepted === typed) setOpen(true);
      else acceptTyped();
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div className={`relative ${className}`}>
      <label htmlFor={id} className="hs-label block">
        {label}
      </label>
      <input
        id={id}
        ref={inputRef}
        type="text"
        value={value}
        autoComplete="off"
        spellCheck={false}
        placeholder={placeholder}
        className="hs-line-input hs-line-input-brass mt-3 !text-lg md:!text-xl"
        aria-expanded={open}
        aria-controls={`${id}-options`}
        aria-autocomplete="list"
        role="combobox"
        onChange={(event) => {
          const next = event.target.value;
          onChange(next);
          setOpen(next.trim().length > 0);
          if (accepted && next.trim() !== accepted) setAccepted(null);
        }}
        onFocus={() => {
          if (typed && !accepted) setOpen(true);
        }}
        onKeyDown={onKeyDown}
      />

      {open && (
        <div
          id={`${id}-options`}
          role="listbox"
          aria-label="Address options"
          className="absolute left-0 right-0 z-20 mt-3 max-h-[26rem] overflow-y-auto border border-hs-rule bg-hs-bg"
        >
          {epcLookup ? (
            <div className="border-b border-hs-rule px-4 py-4 md:px-5">
              {lookup.kind === "searching" || lookup.kind === "waiting" ? (
                <p className="hs-label">Looking in the EPC register…</p>
              ) : lookup.kind === "found" ? (
                <p className="hs-label">
                  {certificates.length > 1
                    ? "From the EPC register — pick your home"
                    : "From the EPC register"}
                </p>
              ) : lookup.kind === "empty" ? (
                <>
                  <p className="hs-label">Nothing on the EPC register for {lookup.postcode}</p>
                  <p className="hs-caption mt-2 max-w-[46ch]">
                    Not every home has a certificate on the register. You can still start your
                    page with the address you typed — the record rows stay blank, and nothing is
                    guessed to fill them.
                  </p>
                </>
              ) : lookup.kind === "offline" ? (
                <>
                  <p className="hs-label">The EPC register could not be reached</p>
                  <p className="hs-caption mt-2 max-w-[46ch]">
                    {lookup.message} What you type is what is used, and you can correct it at any
                    time.
                  </p>
                </>
              ) : (
                <>
                  <p className="hs-label">Type your postcode to look it up</p>
                  <p className="hs-caption mt-2 max-w-[46ch]">
                    HomeStory looks the building up in the official EPC register — floor area,
                    energy rating, walls, roof and windows. There is no full list of UK addresses
                    to suggest from yet, so type your postcode, or your whole address if you would
                    rather.
                  </p>
                </>
              )}
            </div>
          ) : (
            <div className="border-b border-hs-rule px-4 py-4 md:px-5">
              <p className="hs-label">No list of addresses to suggest from</p>
              <p className="hs-caption mt-2 max-w-[46ch]">
                HomeStory has no full UK address list yet, so there is nothing to suggest. What
                you type is what is used — and you can correct it at any time.
              </p>
            </div>
          )}

          {certificates.map((certificate, index) => (
            <button
              key={certificate.certificateNumber}
              ref={index === 0 ? optionRef : undefined}
              type="button"
              role="option"
              aria-selected="false"
              className="block w-full border-b border-hs-rule px-4 py-4 text-left transition-colors hover:bg-hs-surface focus:bg-hs-surface focus:outline-none md:px-5"
              onClick={() => choose(certificate)}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  setOpen(false);
                  inputRef.current?.focus();
                }
              }}
            >
              <span className="font-body text-base text-hs-ink">
                {certificate.addressLine1}
                {certificate.postTown ? `, ${certificate.postTown}` : ""}
              </span>
              <span className="hs-caption mt-1 block">
                {certificate.band ? `EPC ${certificate.band}` : "EPC rating not on the certificate"}
                {certificate.registeredOn
                  ? ` · certificate ${formatDate(certificate.registeredOn)}`
                  : ""}
              </span>
            </button>
          ))}

          {lookup.kind === "found" && certificates.length === 0 && (
            <p className="hs-caption border-b border-hs-rule px-4 py-4 md:px-5">
              No certificate at this postcode matches what you typed. Pick one above or use the
              address as you typed it.
            </p>
          )}

          <button
            type="button"
            role="option"
            aria-selected="false"
            className="block w-full px-4 py-4 text-left transition-colors hover:bg-hs-surface focus:bg-hs-surface focus:outline-none md:px-5"
            onClick={acceptTyped}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                setOpen(false);
                inputRef.current?.focus();
              }
            }}
          >
            <span className="hs-label block">Use the address I typed</span>
            <span className="mt-1 flex items-baseline justify-between gap-4">
              <span className="font-body text-base text-hs-ink">
                {typed || "Nothing typed yet"}
              </span>
              <span className="hs-caption shrink-0" aria-hidden="true">
                →
              </span>
            </span>
          </button>
        </div>
      )}

      {message && (
        <p className="hs-caption mt-4 text-hs-ink" role="status">
          {message}
        </p>
      )}
    </div>
  );
}
