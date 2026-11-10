import { createStartHandler, defaultStreamHandler } from "@tanstack/react-start/server";
import { hasDatabaseURL, checkDatabaseConnection, sql } from "./db";

const handler = createStartHandler(defaultStreamHandler);

const MODEL = "claude-sonnet-5-5";
const MAX_PHOTOS = 12;
const MAX_UPLOAD_BYTES = 12 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
]);

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

function fail(message: string, status = 400): Response {
  return json({ error: message }, status);
}

/** Trimmed string, or null — an empty field is "not on record", never a value. */
function cleanText(value: unknown, max = 4000): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, max);
}

function cleanDate(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, 60);
}

type KeyDate = { date: string; label: string };

function cleanKeyDates(value: unknown): KeyDate[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const date = cleanDate((entry as KeyDate).date) ?? "";
      const label = cleanText((entry as KeyDate).label, 160) ?? "";
      if (!date && !label) return null;
      return { date, label };
    })
    .filter((entry): entry is KeyDate => entry !== null)
    .slice(0, 60);
}

function cleanGems(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => cleanText(entry, 300))
    .filter((entry): entry is string => entry !== null)
    .slice(0, 40);
}

type HomeRow = {
  id: string;
  address: string;
  status: string;
  story: string | null;
  last_sale_price: string | null;
  last_sale_date: string | null;
  epc_rating: string | null;
  build_era: string | null;
  previous_owners: string | null;
  records_source: string;
  key_dates: unknown;
  hidden_gems: unknown;
  created_at: unknown;
  updated_at: unknown;
};

function toHome(row: HomeRow) {
  return {
    id: String(row.id),
    address: row.address,
    status: row.status,
    story: row.story ?? "",
    lastSalePrice: row.last_sale_price ?? "",
    lastSaleDate: row.last_sale_date ?? "",
    epcRating: row.epc_rating ?? "",
    buildEra: row.build_era ?? "",
    previousOwners: row.previous_owners ?? "",
    // Every value above was typed by the owner; no record source is connected.
    recordsSource: row.records_source,
    keyDates: Array.isArray(row.key_dates) ? (row.key_dates as KeyDate[]) : [],
    hiddenGems: Array.isArray(row.hidden_gems) ? (row.hidden_gems as string[]) : [],
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

async function loadHome(id: string) {
  const db = sql();
  const rows = (await db`
    select id, address, status, story, last_sale_price, last_sale_date, epc_rating,
           build_era, previous_owners, records_source, key_dates, hidden_gems,
           created_at, updated_at
    from homes where id = ${id}
  `) as unknown as HomeRow[];
  if (rows.length === 0) return null;
  const photos = (await db`
    select id, position, width, height from home_photos
    where home_id = ${id} order by position asc, created_at asc
  `) as unknown as { id: string; position: number; width: number | null; height: number | null }[];
  return {
    ...toHome(rows[0]),
    photos: photos.map((p) => ({
      id: String(p.id),
      url: `/photos/${p.id}`,
      width: p.width,
      height: p.height,
    })),
  };
}

/** Ask Claude to refine the owner's draft. Never invents, never overwrites. */
async function polishStory(draft: string): Promise<{ text: string } | { error: string }> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return { error: "not-connected" };

  const system = [
    "You are a careful copy-editor for HomeStory, a service where UK homeowners write the history of their house.",
    "Rewrite the owner's draft so it reads clearly and warmly, in British English, keeping their own first-person voice.",
    "Hard rules:",
    "- Keep every fact, date, name, place and detail exactly as the owner wrote it.",
    "- Never add facts, dates, names, numbers or claims that are not in the draft. Do not invent history.",
    "- Do not add a title, headings, commentary, notes or quotation marks around the result.",
    "- If the draft is already good, change as little as possible.",
    "Return only the rewritten prose.",
  ].join("\n");

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 2000,
        system,
        messages: [{ role: "user", content: draft.slice(0, 12000) }],
      }),
      signal: AbortSignal.timeout(60000),
    });

    if (!response.ok) {
      const detail = await response.text();
      console.error("[story-polish] Anthropic error", response.status, detail.slice(0, 400));
      return { error: `Claude could not be reached just now (${response.status}). Your words are unchanged.` };
    }

    const payload = (await response.json()) as {
      content?: { type: string; text?: string }[];
    };
    const text = (payload.content ?? [])
      .filter((part) => part.type === "text" && typeof part.text === "string")
      .map((part) => part.text as string)
      .join("\n")
      .trim();

    if (!text) return { error: "Claude returned nothing to show. Your words are unchanged." };
    return { text };
  } catch (err) {
    console.error("[story-polish] request failed", err);
    return { error: "Claude could not be reached just now. Your words are unchanged." };
  }
}

async function handleApi(request: Request, url: URL): Promise<Response | null> {
  const { pathname } = url;
  const method = request.method;

  // ── Database status ────────────────────────────────────────────────────
  if (pathname === "/api/db-status" && method === "GET") {
    const status = await checkDatabaseConnection();
    return json({
      database: status.ok ? "connected" : "unavailable",
      hasDatabaseURL: hasDatabaseURL(),
      detail: status.ok ? "Schema is applied and reachable." : status.error,
    });
  }

  // ── Whether Claude is configured (the editor asks before offering Polish) ─
  if (pathname === "/api/ai-status" && method === "GET") {
    return json({ connected: Boolean(process.env.ANTHROPIC_API_KEY), model: MODEL });
  }

  // ── Serve a photograph ────────────────────────────────────────────────
  const photoMatch = pathname.match(/^\/photos\/([0-9a-f-]{36})$/i);
  if (photoMatch && method === "GET") {
    const db = sql();
    const rows = (await db`
      select mime, encode(bytes, 'base64') as b64 from home_photos where id = ${photoMatch[1]}
    `) as unknown as { mime: string; b64: string }[];
    if (rows.length === 0) return new Response("Not found", { status: 404 });
    const bytes = Buffer.from(rows[0].b64, "base64");
    return new Response(bytes, {
      status: 200,
      headers: {
        "Content-Type": rows[0].mime,
        "Content-Length": String(bytes.length),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  }

  // ── Create a home ─────────────────────────────────────────────────────
  if (pathname === "/api/homes" && method === "POST") {
    let body: Record<string, unknown>;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return fail("The form could not be read.");
    }

    const address = cleanText(body.address, 300);
    if (!address) return fail("An address is needed before a page can be started.");

    const id = crypto.randomUUID();
    const db = sql();
    await db`
      insert into homes (id, address, last_sale_price, last_sale_date, epc_rating,
                         build_era, previous_owners, records_source)
      values (${id}, ${address}, ${cleanText(body.lastSalePrice, 80)},
              ${cleanDate(body.lastSaleDate)}, ${cleanText(body.epcRating, 20)},
              ${cleanText(body.buildEra, 80)}, ${cleanText(body.previousOwners, 2000)},
              'owner')
    `;
    return json({ id }, 201);
  }

  // ── Read a home ───────────────────────────────────────────────────────
  const homeMatch = pathname.match(/^\/api\/homes\/([0-9a-f-]{36})$/i);
  if (homeMatch && method === "GET") {
    const home = await loadHome(homeMatch[1]);
    if (!home) return fail("That home could not be found.", 404);
    return json(home);
  }

  // ── Autosave the journal ──────────────────────────────────────────────
  if (homeMatch && method === "PATCH") {
    let body: Record<string, unknown>;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return fail("The change could not be read.");
    }
    const id = homeMatch[1];
    const db = sql();
    const existing = (await db`select id from homes where id = ${id}`) as unknown as { id: string }[];
    if (existing.length === 0) return fail("That home could not be found.", 404);

    const address = cleanText(body.address, 300);
    const story = typeof body.story === "string" ? body.story.slice(0, 40000) : "";
    const keyDates = cleanKeyDates(body.keyDates);
    const hiddenGems = cleanGems(body.hiddenGems);

    await db`
      update homes set
        address = ${address ?? ""},
        story = ${story},
        last_sale_price = ${cleanText(body.lastSalePrice, 80)},
        last_sale_date = ${cleanDate(body.lastSaleDate)},
        epc_rating = ${cleanText(body.epcRating, 20)},
        build_era = ${cleanText(body.buildEra, 80)},
        previous_owners = ${cleanText(body.previousOwners, 2000)},
        key_dates = ${JSON.stringify(keyDates)}::jsonb,
        hidden_gems = ${JSON.stringify(hiddenGems)}::jsonb,
        updated_at = now()
      where id = ${id}
    `;
    const home = await loadHome(id);
    return json(home);
  }

  // ── Story Polish ──────────────────────────────────────────────────────
  const polishMatch = pathname.match(/^\/api\/homes\/([0-9a-f-]{36})\/polish$/i);
  if (polishMatch && method === "POST") {
    let body: Record<string, unknown>;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return fail("The writing could not be read.");
    }
    const draft = typeof body.text === "string" ? body.text.trim() : "";
    if (draft.length < 40) {
      return fail("Write a sentence or two first, then ask Claude to polish it.");
    }
    const result = await polishStory(draft);
    if ("error" in result) {
      if (result.error === "not-connected") {
        return json({ connected: false }, 200);
      }
      return json({ connected: true, error: result.error }, 200);
    }
    return json({ connected: true, text: result.text });
  }

  // ── Photographs ───────────────────────────────────────────────────────
  const photosMatch = pathname.match(/^\/api\/homes\/([0-9a-f-]{36})\/photos$/i);
  if (photosMatch && method === "POST") {
    const homeId = photosMatch[1];
    const db = sql();
    const home = (await db`select id from homes where id = ${homeId}`) as unknown as { id: string }[];
    if (home.length === 0) return fail("That home could not be found.", 404);

    const countRows = (await db`
      select count(*)::int as n from home_photos where home_id = ${homeId}
    `) as unknown as { n: number }[];
    if ((countRows[0]?.n ?? 0) >= MAX_PHOTOS) {
      return fail(`A home's page holds ${MAX_PHOTOS} photographs. Remove one to add another.`);
    }

    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      return fail("The photograph could not be read.");
    }
    const file = form.get("photo");
    if (!(file instanceof File)) return fail("No photograph was attached.");
    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      return fail("That file is not a photograph. JPEG, PNG, WebP, AVIF or GIF only.");
    }
    if (file.size > MAX_UPLOAD_BYTES) return fail("That photograph is over 12MB. Try a smaller one.");

    let out: Buffer;
    let width: number | null = null;
    let height: number | null = null;
    try {
      const sharp = (await import("sharp")).default;
      const input = Buffer.from(await file.arrayBuffer());
      out = await sharp(input)
        .rotate()
        .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 82 })
        .toBuffer();
      const meta = await sharp(out).metadata();
      width = meta.width ?? null;
      height = meta.height ?? null;
    } catch (err) {
      console.error("[photo] processing failed", err);
      return fail("That photograph could not be processed.");
    }

    const id = crypto.randomUUID();
    const position = countRows[0]?.n ?? 0;
    await db`
      insert into home_photos (id, home_id, position, mime, width, height, bytes)
      values (${id}, ${homeId}, ${position}, 'image/jpeg', ${width}, ${height},
              decode(${out.toString("base64")}, 'base64'))
    `;
    return json({ id, url: `/photos/${id}`, width, height }, 201);
  }

  const photoDeleteMatch = pathname.match(
    /^\/api\/homes\/([0-9a-f-]{36})\/photos\/([0-9a-f-]{36})$/i,
  );
  if (photoDeleteMatch && method === "DELETE") {
    const db = sql();
    await db`
      delete from home_photos where id = ${photoDeleteMatch[2]} and home_id = ${photoDeleteMatch[1]}
    `;
    return json({ ok: true });
  }

  // ── Publish ───────────────────────────────────────────────────────────
  const publishMatch = pathname.match(/^\/api\/homes\/([0-9a-f-]{36})\/publish$/i);
  if (publishMatch && method === "POST") {
    const db = sql();
    const rows = (await db`
      update homes set status = 'published', published_at = coalesce(published_at, now()), updated_at = now()
      where id = ${publishMatch[1]}
      returning id, status
    `) as unknown as { id: string; status: string }[];
    if (rows.length === 0) return fail("That home could not be found.", 404);
    return json({ id: String(rows[0].id), status: rows[0].status });
  }

  return null;
}

export default {
  async fetch(request: Request, ...args: any[]) {
    const url = new URL(request.url);

    const isApiRoute = url.pathname.startsWith("/api/") || url.pathname.startsWith("/photos/");
    if (isApiRoute) {
      if (!hasDatabaseURL() && url.pathname !== "/api/ai-status") {
        return fail("The database is not connected yet.", 503);
      }
      try {
        const response = await handleApi(request, url);
        if (response) return response;
      } catch (err) {
        console.error("[api] unhandled error", url.pathname, err);
        return fail("Something went wrong saving that. Please try again.", 500);
      }
      return new Response("Not found", { status: 404 });
    }

    return handler(request, ...args);
  },
};
