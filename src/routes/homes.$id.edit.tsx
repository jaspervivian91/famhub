import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";

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
  previousOwners: string;
  keyDates: KeyDate[];
  hiddenGems: string[];
};

const EMPTY_DOC: Doc = {
  address: "",
  story: "",
  lastSalePrice: "",
  lastSaleDate: "",
  epcRating: "",
  buildEra: "",
  previousOwners: "",
  keyDates: [],
  hiddenGems: [],
};

const RECORD_ROWS = [
  { key: "lastSalePrice", label: "Last sale price", hint: "e.g. £412,000" },
  { key: "lastSaleDate", label: "Last sale date", hint: "e.g. 2019" },
  { key: "epcRating", label: "EPC rating", hint: "e.g. D" },
  { key: "buildEra", label: "Build era", hint: "e.g. 1890s" },
  { key: "previousOwners", label: "Previous owners", hint: "Names and years" },
] as const;

type RecordKey = (typeof RECORD_ROWS)[number]["key"];

function EditorScreen() {
  const { id } = Route.useParams();

  const [doc, setDoc] = useState<Doc | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [status, setStatus] = useState("draft");
  const [loadError, setLoadError] = useState<string | null>(null);

  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [uploading, setUploading] = useState(false);
  const [photoLine, setPhotoLine] = useState<string | null>(null);
  const [publishLine, setPublishLine] = useState<string | null>(null);

  const [aiConnected, setAiConnected] = useState<boolean | null>(null);
  const [polishing, setPolishing] = useState(false);
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [polishLine, setPolishLine] = useState<string | null>(null);

  const [chronological, setChronological] = useState(true);

  const storyRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const saveTimer = useRef<number | null>(null);
  const firstRender = useRef(true);

  // ── Load ───────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [homeRes, aiRes] = await Promise.all([
          fetch(`/api/homes/${id}`),
          fetch("/api/ai-status"),
        ]);
        if (!cancelled && aiRes.ok) {
          const ai = (await aiRes.json()) as { connected?: boolean };
          setAiConnected(Boolean(ai.connected));
        }
        if (!homeRes.ok) {
          const payload = (await homeRes.json().catch(() => ({}))) as { error?: string };
          if (!cancelled) setLoadError(payload.error ?? "That home could not be found.");
          return;
        }
        const home = (await homeRes.json()) as Doc & {
          photos?: Photo[];
          status?: string;
        };
        if (cancelled) return;
        setDoc({
          address: home.address ?? "",
          story: home.story ?? "",
          lastSalePrice: home.lastSalePrice ?? "",
          lastSaleDate: home.lastSaleDate ?? "",
          epcRating: home.epcRating ?? "",
          buildEra: home.buildEra ?? "",
          previousOwners: home.previousOwners ?? "",
          keyDates: Array.isArray(home.keyDates) ? home.keyDates : [],
          hiddenGems: Array.isArray(home.hiddenGems) ? home.hiddenGems : [],
        });
        setPhotos(Array.isArray(home.photos) ? home.photos : []);
        setStatus(home.status ?? "draft");
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
    setPolishing(true);
    try {
      const response = await fetch(`/api/homes/${id}/polish`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: doc.story }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        connected?: boolean;
        text?: string;
        error?: string;
      };
      if (payload.connected === false) {
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
    setPublishLine(null);
    try {
      const response = await fetch(`/api/homes/${id}/publish`, { method: "POST" });
      if (!response.ok) {
        setPublishLine("That could not be published just now. Please try again.");
        return;
      }
      setStatus("published");
      setPublishLine(
        "Saved as published. The public page for your home is the next screen we are building — until it exists, the story is stored but there is no web address for a visitor to reach yet.",
      );
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
          What you know of the building. No record source is connected, so these
          are your words — correct them whenever you like.
        </p>
        <div className="mt-6 grid gap-x-10 gap-y-5 sm:grid-cols-2">
          {RECORD_ROWS.map((row) => (
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
          {aiConnected === false ? (
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
          the story stays with the house when it changes hands.
        </p>

        <button
          type="button"
          className="hs-btn hs-btn-brass mt-6 w-full sm:w-auto"
          onClick={publish}
          disabled={status === "published"}
        >
          {status === "published" ? "Published" : "Publish your HomeStory"}
        </button>

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
