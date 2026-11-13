import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  PRICE_PAID_LICENCE,
  formatSaleDate,
  formatSalePrice,
  type PricePaidSale,
} from "~/lib/price-paid";

export const Route = createFileRoute("/homes/$id/edit")({
  head: () => ({
    meta: [
      { title: "Your home’s chapter — HomeStory" },
      {
        name: "description",
        content:
          "Write your home’s chapter: your story, photographs, key dates and the things only you know.",
      },
    ],
  }),
  component: EditorScreen,
});

const MAX_PHOTOS = 12;

type KeyDate = { date: string; label: string };
type Photo = { id: string; url: string };

type Doc = {
  address: string;
  story: string;
  lastSalePrice: string;
  lastSaleDate: string;
  epcRating: string;
  buildEra: string;
  floorArea: string;
  wallType: string;
  roofType: string;
  windowType: string;
  previousOwners: string;
  keyDates: KeyDate[];
  hiddenGems: string[];
};

/** The building — the part the EPC register can hold. */
const EPC_ROWS = [
  { key: "floorArea", label: "Floor area", hint: "e.g. 153 m²" },
  { key: "epcRating", label: "EPC rating", hint: "e.g. D" },
  { key: "wallType", label: "Walls", hint: "e.g. solid brick, no insulation" },
  { key: "roofType", label: "Roof", hint: "e.g. pitched, insulated" },
  { key: "windowType", label: "Windows", hint: "e.g. partial double glazing" },
  { key: "buildEra", label: "Build era", hint: "e.g. 1890s" },
] as const;

/** The people — no register we can reach holds them. The owner's own sale
 * figures stay their own: the register's sales are shown separately, read-only. */
const OWNER_ROWS = [
  { key: "lastSalePrice", label: "Last sale price", hint: "e.g. £412,000" },
  { key: "lastSaleDate", label: "Last sale date", hint: "e.g. 2019" },
  { key: "previousOwners", label: "Previous owners", hint: "Names and years" },
] as const;

type RecordKey = (typeof EPC_ROWS)[number]["key"] | (typeof OWNER_ROWS)[number]["key"];

/** "23 February 2026" — the certificate date, as the page shows it. */
function formatEpcDate(iso: string): string {
  if (!iso) return "";
  const date = new Date(`${iso.slice(0, 10)}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

function EditorScreen() {
  const { id } = Route.useParams();
  const navigate = useNavigate();

  const [doc, setDoc] = useState<Doc | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [status, setStatus] = useState("draft");
  const [publicId, setPublicId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  // Which record fields are still exactly as the EPC register recorded them.
  const [epc, setEpc] = useState<{ fields: string[]; recordedOn: string } | null>(null);
  // What HM Land Registry records for this address — read-only, never edited.
  const [pricePaid, setPricePaid] = useState<{
    sales: PricePaidSale[];
    checkedAt: string;
  } | null>(null);

  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [uploading, setUploading] = useState(false);
  const [photoLine, setPhotoLine] = useState<string | null>(null);
  const [publishLine, setPublishLine] = useState<string | null>(null);

  const [aiConnected, setAiConnected] = useState<boolean | null>(null);
  const [premium, setPremium] = useState<boolean | null>(null);
  const [polishing, setPolishing] = useState(false);
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [polishLine, setPolishLine] = useState<string | null>(null);

  const [chronological, setChronological] = useState(true);
  const [plaqueSavedAt, setPlaqueSavedAt] = useState<string | null>(null);

  const storyRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const saveTimer = useRef<number | null>(null);
  const firstRender = useRef(true);

  // ── Load ───────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [homeRes, aiRes, premiumRes] = await Promise.all([
          fetch(`/api/homes/${id}`),
          fetch("/api/ai-status"),
          fetch(`/api/homes/${id}/premium`),
        ]);
        if (!cancelled && aiRes.ok) {
          const ai = (await aiRes.json()) as { connected?: boolean };
          setAiConnected(Boolean(ai.connected));
        }
        if (!cancelled && premiumRes.ok) {
          const state = (await premiumRes.json()) as { premium?: boolean };
          setPremium(Boolean(state.premium));
        }
        if (!homeRes.ok) {
          const payload = (await homeRes.json().catch(() => ({}))) as { error?: string };
          if (!cancelled) setLoadError(payload.error ?? "That home could not be found.");
          return;
        }
        const home = (await homeRes.json()) as Doc & {
          photos?: Photo[];
          status?: string;
          publicId?: string | null;
          epcFields?: string[];
          epcRecordedOn?: string;
          epcSourced?: boolean;
          pricePaidSales?: PricePaidSale[];
          pricePaidCheckedAt?: string | null;
        };
        if (cancelled) return;
        setPublicId(home.publicId ?? null);
        setDoc({
          address: home.address ?? "",
          story: home.story ?? "",
          lastSalePrice: home.lastSalePrice ?? "",
          lastSaleDate: home.lastSaleDate ?? "",
          epcRating: home.epcRating ?? "",
          buildEra: home.buildEra ?? "",
          floorArea: home.floorArea ?? "",
          wallType: home.wallType ?? "",
          roofType: home.roofType ?? "",
          windowType: home.windowType ?? "",
          previousOwners: home.previousOwners ?? "",
          keyDates: Array.isArray(home.keyDates) ? home.keyDates : [],
          hiddenGems: Array.isArray(home.hiddenGems) ? home.hiddenGems : [],
        });
        if (home.epcSourced && Array.isArray(home.epcFields) && home.epcFields.length > 0) {
          setEpc({ fields: home.epcFields, recordedOn: home.epcRecordedOn ?? "" });
        }
        if (home.pricePaidCheckedAt) {
          setPricePaid({
            sales: Array.isArray(home.pricePaidSales) ? home.pricePaidSales : [],
            checkedAt: home.pricePaidCheckedAt,
          });
        }
        setPhotos(Array.isArray(home.photos) ? home.photos : []);
        setStatus(home.status ?? "draft");

        // Does a plaque order already exist for this home? Shown, not sold.
        if (home.status === "published") {
          try {
            const plaqueRes = await fetch(`/api/homes/${id}/plaque`);
            if (plaqueRes.ok) {
              const plaque = (await plaqueRes.json()) as { order?: { createdAt?: string } | null };
              if (!cancelled && plaque.order?.createdAt) {
                setPlaqueSavedAt(
                  new Date(plaque.order.createdAt).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  }),
                );
              }
            }
          } catch {
            // The plaque line is a nicety; the editor works without it.
          }
        }
      } catch {
        if (!cancelled) setLoadError("That home could not be loaded just now.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  // ── Autosave ───────────────────────────────────────────────────────────
  const save = useCallback(
    async (next: Doc) => {
      setSaveState("saving");
      try {
        const response = await fetch(`/api/homes/${id}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(next),
        });
        setSaveState(response.ok ? "saved" : "error");
        if (response.ok) {
          // The server works out which fields are still the register's, so a
          // correction the owner has just made loses its EPC marker here too.
          const saved = (await response.json().catch(() => null)) as {
            epcFields?: string[];
            epcRecordedOn?: string;
            epcSourced?: boolean;
          } | null;
          if (saved?.epcSourced && Array.isArray(saved.epcFields) && saved.epcFields.length > 0) {
            setEpc({ fields: saved.epcFields, recordedOn: saved.epcRecordedOn ?? "" });
          } else if (saved) {
            setEpc(null);
          }
        }
      } catch {
        setSaveState("error");
      }
    },
    [id],
  );

  useEffect(() => {
    if (!doc) return;
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => save(doc), 700);
    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
    };
  }, [doc, save]);

  // ── Textarea grows with the writing ────────────────────────────────────
  useEffect(() => {
    const el = storyRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.max(el.scrollHeight, 220)}px`;
  }, [doc?.story]);

  function update(patch: Partial<Doc>) {
    setDoc((current) => (current ? { ...current, ...patch } : current));
  }

  // ── Story Polish ───────────────────────────────────────────────────────
  async function polish() {
    if (!doc) return;
    setPolishLine(null);
    setSuggestion(null);
    // Before Premium is paid, the button explains once and stops. Nothing is
    // sent, and the owner's words are untouched.
    if (premium === false) {
      setPolishLine(
        "Story Polish is part of HomeStory Premium — £24.99 once for this house, not a subscription. Nothing is charged until you pay for it.",
      );
      return;
    }
    setPolishing(true);
    try {
      const response = await fetch(`/api/homes/${id}/polish`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: doc.story }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        connected?: boolean;
        premiumRequired?: boolean;
        text?: string;
        error?: string;
      };
      if (payload.premiumRequired) {
        setPremium(false);
        setPolishLine(payload.error ?? "Story Polish is part of HomeStory Premium.");
      } else if (payload.connected === false) {
        setAiConnected(false);
      } else if (payload.error) {
        setPolishLine(payload.error);
      } else if (payload.text) {
        setSuggestion(payload.text);
      } else {
        setPolishLine("Claude did not return anything. Your words are unchanged.");
      }
    } catch {
      setPolishLine("Claude could not be reached just now. Your words are unchanged.");
    } finally {
      setPolishing(false);
    }
  }

  // ── Photographs ────────────────────────────────────────────────────────
  async function addPhotos(files: FileList | null) {
    if (!files || files.length === 0) return;
    setPhotoLine(null);
    setUploading(true);
    const room = MAX_PHOTOS - photos.length;
    const queue = Array.from(files).slice(0, Math.max(room, 0));
    if (room <= 0) {
      setPhotoLine(`A home’s page holds ${MAX_PHOTOS} photographs.`);
      setUploading(false);
      return;
    }
    for (const file of queue) {
      const body = new FormData();
      body.append("photo", file);
      try {
        const response = await fetch(`/api/homes/${id}/photos`, { method: "POST", body });
        const payload = (await response.json().catch(() => ({}))) as Photo & { error?: string };
        if (!response.ok || !payload.id) {
          setPhotoLine(payload.error ?? "That photograph could not be added.");
          break;
        }
        setPhotos((current) => [...current, { id: payload.id, url: payload.url }]);
      } catch {
        setPhotoLine("That photograph could not be added.");
        break;
      }
    }
    if (fileRef.current) fileRef.current.value = "";
    setUploading(false);
  }

  async function removePhoto(photoId: string) {
    setPhotos((current) => current.filter((photo) => photo.id !== photoId));
    try {
      await fetch(`/api/homes/${id}/photos/${photoId}`, { method: "DELETE" });
    } catch {
      setPhotoLine("That photograph could not be removed. Please try again.");
    }
  }

  // ── Key dates ──────────────────────────────────────────────────────────
  function setKeyDates(next: KeyDate[]) {
    update({ keyDates: next });
  }

  function sortDates(dates: KeyDate[], ascending: boolean) {
    const year = (value: string) => {
      const match = value.match(/\d{4}/);
      return match ? Number(match[0]) : Number.MAX_SAFE_INTEGER;
    };
    return [...dates].sort((a, b) => (ascending ? year(a.date) - year(b.date) : year(b.date) - year(a.date)));
  }

  // ── Publish ────────────────────────────────────────────────────────────
  async function publish() {
    if (!doc) return;
    setPublishLine(null);
    try {
      // Flush anything typed in the last moment, so the page a visitor sees is
      // the page the owner is looking at.
      await save(doc);
      const response = await fetch(`/api/homes/${id}/publish`, { method: "POST" });
      const payload = (await response.json().catch(() => ({}))) as { publicId?: string | null };
      if (!response.ok) {
        setPublishLine("That could not be published just now. Please try again.");
        return;
      }
      setStatus("published");
      if (payload.publicId) {
        setPublicId(payload.publicId);
        navigate({ to: "/h/$publicId", params: { publicId: payload.publicId } });
        return;
      }
      setPublishLine("That could not be published just now. Please try again.");
    } catch {
      setPublishLine("That could not be published just now. Please try again.");
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

  if (!doc) {
    return (
      <div className="hs-wrap py-24">
        <p className="hs-caption">Opening your home’s page…</p>
      </div>
    );
  }

  const saveLabel =
    saveState === "saving"
      ? "Saving…"
      : saveState === "saved"
        ? "Saved"
        : saveState === "error"
          ? "Not saved — check your connection"
          : "";

  return (
    <div className="hs-wrap pb-24 pt-10 md:pt-16">
      <p className="hs-label">Step two of two</p>
      <h1 className="hs-h2 mt-4 max-w-[26ch]">{doc.address || "Your home"}</h1>
      <p className="hs-lede mt-3 max-w-[52ch]">
        Your chapter. Write as little or as much as you like — it is saved as
        you go.
      </p>
      <p className="hs-caption mt-3 h-5" aria-live="polite">
        {saveLabel}
      </p>

      {/* ── The record ───────────────────────────────────────────────── */}
      <section className="mt-10 border-t border-hs-rule-brass pt-8">
        <p className="hs-label">The record</p>
        <p className="hs-caption mt-2 max-w-[54ch]">
          {epc
            ? "The building is from the official EPC register. Correct anything that is wrong — your version wins, and a field you change stops being shown as the register’s."
            : "Previous owners come from you: no register we can reach holds their names. The sale prices below are the Land Registry’s. Correct anything at any time."}
        </p>

        <div className="mt-6 grid gap-x-10 gap-y-5 sm:grid-cols-2">
          {EPC_ROWS.map((row) => (
            <div key={row.key}>
              <label htmlFor={`edit-${row.key}`} className="hs-caption block">
                {row.label}
              </label>
              <input
                id={`edit-${row.key}`}
                type="text"
                value={doc[row.key as RecordKey]}
                placeholder={epc ? "Not on the EPC record" : "Not yet on record"}
                className="hs-line-input"
                onChange={(event) => update({ [row.key]: event.target.value } as Partial<Doc>)}
              />
              <p className="hs-caption mt-1 opacity-75">
                {epc?.fields.includes(row.key)
                  ? `From the EPC register${epc.recordedOn ? ` · recorded ${formatEpcDate(epc.recordedOn)}` : ""}`
                  : row.hint}
              </p>
            </div>
          ))}

          {OWNER_ROWS.map((row) => (
            <div key={row.key}>
              <label htmlFor={`edit-${row.key}`} className="hs-caption block">
                {row.label}
              </label>
              <input
                id={`edit-${row.key}`}
                type="text"
                value={doc[row.key as RecordKey]}
                placeholder="Not yet on record"
                className="hs-line-input"
                onChange={(event) => update({ [row.key]: event.target.value } as Partial<Doc>)}
              />
              <p className="hs-caption mt-1 opacity-75">{row.hint}</p>
            </div>
          ))}
        </div>

        {epc && (
          <p className="hs-caption mt-6 max-w-[54ch]">
            Energy performance data from the EPC register (Open Government Licence
            v3.0). Previous owners are still not on any register we can reach, so
            that section is entirely your own.
          </p>
        )}

        {/* ── What it has sold for — the register's, read-only ────────── */}
        {pricePaid && (
          <div className="mt-8 border-t border-hs-rule pt-6">
            <p className="hs-label">What it has sold for</p>
            <p className="hs-caption mt-2 max-w-[54ch]">
              From HM Land Registry Price Paid Data. This is read-only — it is the
              register’s record of this address, not yours, and the sale price you
              type above stays your own.
            </p>

            {pricePaid.sales.length > 0 ? (
              <dl className="mt-5 max-w-[34rem]">
                {pricePaid.sales.map((sale, index) => (
                  <div
                    key={`${sale.date}-${index}`}
                    className="flex items-baseline justify-between gap-6 border-b border-hs-rule py-3"
                  >
                    <dt className="font-body text-base text-hs-ink">
                      {formatSaleDate(sale.date)}
                    </dt>
                    <dd className="text-right">
                      <span className="font-body text-base text-hs-ink">
                        {formatSalePrice(sale.price)}
                      </span>
                      {(sale.tenure || sale.newBuild === true) && (
                        <span className="hs-caption mt-1 block">
                          {[sale.tenure, sale.newBuild === true ? "New build" : null]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="hs-caption mt-4 max-w-[54ch]">
                No sale recorded in the Land Registry’s Price Paid Data for this
                address. Plenty of homes have none — a house that has not changed
                hands since 1995, a new build, or an address in Scotland or
                Northern Ireland.
              </p>
            )}

            <p className="hs-caption mt-4 max-w-[54ch]">{PRICE_PAID_LICENCE}.</p>
          </div>
        )}
      </section>

      {/* ── One: Your story ──────────────────────────────────────────── */}
      <section className="mt-14 border-t border-hs-rule-brass pt-8">
        <p className="hs-numeral">One</p>
        <h2 className="hs-h3 mt-2">Your story</h2>
        <p className="hs-caption mt-2 max-w-[54ch]">
          How you came to the house, what you found, what has happened here
          since. Rough notes are enough.
        </p>

        <label htmlFor="story" className="sr-only">
          Your story
        </label>
        <textarea
          id="story"
          ref={storyRef}
          value={doc.story}
          rows={8}
          placeholder="We moved in on a wet Friday in November…"
          className="mt-6 w-full resize-none border-0 border-b border-hs-rule bg-transparent p-0 font-body text-lg leading-[1.85] text-hs-ink placeholder:italic placeholder:text-hs-muted focus:border-hs-brass focus:outline-none"
          onChange={(event) => update({ story: event.target.value })}
        />

        <div className="mt-6">
          {premium === null ? (
            <p className="hs-caption">Checking whether Story Polish is available…</p>
          ) : premium === false ? (
            // Part of Premium, said once and plainly — never hidden, never nagged.
            <div className="max-w-[54ch]">
              <p className="hs-caption">
                <span className="text-hs-ink">Story Polish</span> is part of HomeStory
                Premium — £24.99 once for this house, not a subscription. Your page,
                your building record and your photographs stay free either way.
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3">
                <button
                  type="button"
                  className="hs-link bg-transparent"
                  onClick={polish}
                  disabled={polishing}
                >
                  Polish with Claude AI
                </button>
                <Link to="/homes/$id/premium" params={{ id }} className="hs-btn hs-btn-brass">
                  Add Premium — £24.99
                </Link>
              </div>
            </div>
          ) : aiConnected === false ? (
            <p className="hs-caption max-w-[54ch]">
              <span className="text-hs-ink">Story Polish</span> — Claude is not
              connected yet, so nothing will be rewritten. When it is connected,
              it will offer a refined version of your writing for you to keep or
              discard; your own words are never replaced without your say-so.
            </p>
          ) : aiConnected === null ? (
            <p className="hs-caption">Checking whether Story Polish is available…</p>
          ) : (
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
              <button
                type="button"
                className="hs-link bg-transparent"
                onClick={polish}
                disabled={polishing}
              >
                {polishing ? "Claude is reading…" : "Polish with Claude AI"}
              </button>
              <span className="hs-caption">
                A suggestion only — your original stays until you choose.
              </span>
            </div>
          )}

          {polishLine && (
            <p className="hs-caption mt-4 max-w-[54ch] text-hs-ink" role="status">
              {polishLine}
            </p>
          )}

          {suggestion && (
            <div className="mt-6 border border-hs-rule bg-hs-surface p-5 md:p-6">
              <p className="hs-label">A suggestion from Claude AI</p>
              <p className="mt-4 whitespace-pre-wrap font-body text-base leading-[1.85] text-hs-ink">
                {suggestion}
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  className="hs-btn hs-btn-brass"
                  onClick={() => {
                    update({ story: suggestion });
                    setSuggestion(null);
                  }}
                >
                  Use this version
                </button>
                <button
                  type="button"
                  className="hs-btn hs-btn-ink"
                  onClick={() => setSuggestion(null)}
                >
                  Keep my original
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── Two: Photographs ─────────────────────────────────────────── */}
      <section className="mt-14 border-t border-hs-rule-brass pt-8">
        <div className="flex items-baseline justify-between gap-4">
          <div>
            <p className="hs-numeral">Two</p>
            <h2 className="hs-h3 mt-2">Photographs</h2>
          </div>
          <p className="hs-caption whitespace-nowrap">
            {photos.length} of {MAX_PHOTOS}
          </p>
        </div>
        <p className="hs-caption mt-2 max-w-[54ch]">
          The house as it is now, or as it was. Up to twelve.
        </p>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 md:gap-4">
          {photos.map((photo) => (
            <div key={photo.id}>
              <div className="aspect-[3/4] overflow-hidden bg-hs-surface">
                <img
                  src={photo.url}
                  alt="A photograph of the home, added by its owner."
                  className="h-full w-full object-cover"
                  loading="lazy"
                  decoding="async"
                />
              </div>
              <button
                type="button"
                className="hs-caption mt-2 underline decoration-hs-rule underline-offset-4 hover:decoration-hs-brass"
                onClick={() => removePhoto(photo.id)}
              >
                Remove
              </button>
            </div>
          ))}

          {photos.length < MAX_PHOTOS && (
            <label
              htmlFor="photo-input"
              className="flex aspect-[3/4] cursor-pointer flex-col items-center justify-center gap-2 border border-hs-rule text-center transition-colors hover:border-hs-rule-brass"
            >
              <span className="font-display text-2xl text-hs-brass" aria-hidden="true">
                +
              </span>
              <span className="hs-caption px-2">
                {uploading ? "Adding…" : "Add photographs"}
              </span>
            </label>
          )}
        </div>

        <input
          id="photo-input"
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
          multiple
          className="sr-only"
          onChange={(event) => addPhotos(event.target.files)}
        />

        {photoLine && (
          <p className="hs-caption mt-4 text-hs-ink" role="status">
            {photoLine}
          </p>
        )}
      </section>

      {/* ── Three: Key dates ─────────────────────────────────────────── */}
      <section className="mt-14 border-t border-hs-rule-brass pt-8">
        <p className="hs-numeral">Three</p>
        <h2 className="hs-h3 mt-2">Key dates</h2>
        <p className="hs-caption mt-2 max-w-[54ch]">
          When you moved in, the extension, the year the tree came down.
        </p>

        {doc.keyDates.length > 1 && (
          <div className="mt-5 flex items-center gap-3">
            <span className="hs-caption">Order</span>
            <button
              type="button"
              className="hs-caption underline decoration-hs-rule underline-offset-4 hover:decoration-hs-brass"
              onClick={() => {
                const next = sortDates(doc.keyDates, !chronological);
                setChronological(!chronological);
                setKeyDates(next);
              }}
            >
              {chronological ? "Earliest first" : "Latest first"}
            </button>
          </div>
        )}

        <div className="mt-6">
          {doc.keyDates.map((entry, index) => (
            <div
              key={index}
              className="flex flex-col gap-2 border-b border-hs-rule py-4 sm:flex-row sm:items-end sm:gap-6"
            >
              <div className="sm:w-40">
                <label htmlFor={`date-${index}`} className="hs-caption block">
                  Date
                </label>
                <input
                  id={`date-${index}`}
                  type="text"
                  value={entry.date}
                  placeholder="1998"
                  className="hs-line-input"
                  onChange={(event) => {
                    const next = [...doc.keyDates];
                    next[index] = { ...next[index], date: event.target.value };
                    setKeyDates(next);
                  }}
                />
              </div>
              <div className="flex-1">
                <label htmlFor={`date-label-${index}`} className="hs-caption block">
                  What happened
                </label>
                <input
                  id={`date-label-${index}`}
                  type="text"
                  value={entry.label}
                  placeholder="We moved in"
                  className="hs-line-input"
                  onChange={(event) => {
                    const next = [...doc.keyDates];
                    next[index] = { ...next[index], label: event.target.value };
                    setKeyDates(next);
                  }}
                />
              </div>
              <button
                type="button"
                className="hs-caption self-start pb-2 underline decoration-hs-rule underline-offset-4 hover:decoration-hs-brass sm:self-auto"
                onClick={() => setKeyDates(doc.keyDates.filter((_, i) => i !== index))}
              >
                Remove
              </button>
            </div>
          ))}
        </div>

        <button
          type="button"
          className="hs-link mt-5 bg-transparent"
          onClick={() => setKeyDates([...doc.keyDates, { date: "", label: "" }])}
        >
          Add a date
        </button>
      </section>

      {/* ── Four: Hidden gems ────────────────────────────────────────── */}
      <section className="mt-14 border-t border-hs-rule-brass pt-8">
        <p className="hs-numeral">Four</p>
        <h2 className="hs-h3 mt-2">Hidden gems</h2>
        <p className="hs-caption mt-2 max-w-[54ch]">
          The things only you know. The rose bush planted in 1987, the Victorian
          tiles under the carpet.
        </p>

        <div className="mt-6">
          {doc.hiddenGems.map((gem, index) => (
            <div key={index} className="flex items-center gap-4 border-b border-hs-rule">
              <input
                type="text"
                value={gem}
                aria-label={`Hidden gem ${index + 1}`}
                placeholder="Something only you know"
                className="hs-line-input border-b-0"
                onChange={(event) => {
                  const next = [...doc.hiddenGems];
                  next[index] = event.target.value;
                  update({ hiddenGems: next });
                }}
              />
              <button
                type="button"
                className="hs-caption shrink-0 underline decoration-hs-rule underline-offset-4 hover:decoration-hs-brass"
                onClick={() =>
                  update({ hiddenGems: doc.hiddenGems.filter((_, i) => i !== index) })
                }
              >
                Remove
              </button>
            </div>
          ))}
        </div>

        <button
          type="button"
          className="hs-link mt-5 bg-transparent"
          onClick={() => update({ hiddenGems: [...doc.hiddenGems, ""] })}
        >
          Add a hidden gem
        </button>
      </section>

      {/* ── Five: Publish ────────────────────────────────────────────── */}
      <section className="mt-14 border-t border-hs-rule-brass pt-8">
        <p className="hs-numeral">Five</p>
        <h2 className="hs-h3 mt-2">
          {status === "published" ? "This home is published" : "Publish your HomeStory"}
        </h2>
        <p className="hs-caption mt-2 max-w-[54ch]">
          Nothing about your home is public until you publish it. Once it is,
          the story stays with the house when it changes hands. Publishing takes
          you to your home’s page — the address the plaque will point at.
        </p>

        <button
          type="button"
          className="hs-btn hs-btn-brass mt-6 w-full sm:w-auto"
          onClick={publish}
          disabled={status === "published"}
        >
          {status === "published" ? "Published" : "Publish your HomeStory"}
        </button>

        {status === "published" && publicId && (
          <div className="mt-5 flex flex-wrap items-baseline gap-x-8 gap-y-3">
            <Link to="/h/$publicId" params={{ publicId }} className="hs-link">
              View your home’s page
            </Link>
            <Link to="/homes/$id/plaque" params={{ id }} className="hs-link">
              Order the brass plaque
            </Link>
          </div>
        )}

        {status === "published" && (
          <p className="hs-caption mt-4 max-w-[54ch]">
            {plaqueSavedAt
              ? `A brass plaque is reserved for this home — saved ${plaqueSavedAt}, not paid. No workshop is connected yet, so it cannot be made or posted.`
              : "The plaque carries this page’s QR code. It can be reserved now, but no workshop is connected yet, so it cannot be made or posted."}
          </p>
        )}

        {publishLine && (
          <p className="hs-caption mt-4 max-w-[54ch] text-hs-ink" role="status">
            {publishLine}
          </p>
        )}

        <p className="hs-caption mt-8">
          History narratives powered by Claude AI.
        </p>
      </section>
    </div>
  );
}
