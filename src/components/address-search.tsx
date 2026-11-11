import { useRef, useState } from "react";

/**
 * The address search — one search, used both by an individual owner starting a
 * page and by an estate agent adding a property to their ledger.
 *
 * No address data source is connected (Land Registry, EPC register and the 1921
 * census are all unavailable to us), so the search does not suggest addresses.
 * It says so plainly and takes what the person types.
 */
type Props = {
  id: string;
  value: string;
  onChange: (value: string) => void;
  onAccept: (address: string) => void;
  label?: string;
  message?: string | null;
  placeholder?: string;
  className?: string;
};

export function AddressSearch({
  id,
  value,
  onChange,
  onAccept,
  label = "Your address",
  message = null,
  placeholder = "Start with your postcode or address",
  className = "",
}: Props) {
  const [open, setOpen] = useState(false);
  const [accepted, setAccepted] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const optionRef = useRef<HTMLButtonElement>(null);

  const typed = value.trim();

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
      if (open) acceptTyped();
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
          className="absolute left-0 right-0 z-20 mt-3 border border-hs-rule bg-hs-bg"
        >
          <div className="border-b border-hs-rule px-4 py-4 md:px-5">
            <p className="hs-label">Address lookup is not connected</p>
            <p className="hs-caption mt-2 max-w-[46ch]">
              HomeStory has no live feed of Land Registry, EPC or census records
              yet, so there is no list of addresses to suggest. What you type is
              what is used — and you can correct it at any time.
            </p>
          </div>
          <button
            ref={optionRef}
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
