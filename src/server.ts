import { createStartHandler, defaultStreamHandler } from "@tanstack/react-start/server";
import { hasDatabaseURL, checkDatabaseConnection, sql } from "./db";
import {
  MIN_PASSWORD_LENGTH,
  clientAddress,
  createSession,
  destroySession,
  hashPassword,
  normaliseEmail,
  readSession,
  sessionCookie,
  verifyPassword,
} from "./lib/agents";

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

function withCookie(response: Response, cookie: string): Response {
  response.headers.append("Set-Cookie", cookie);
  return response;
}

async function readJson(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const body = (await request.json()) as unknown;
    if (!body || typeof body !== "object") return null;
    return body as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * Who may open a home. A home an agent added belongs to that agent alone: any
 * other agent — or a visitor with no session — gets the same 404 a missing home
 * gets, so another agent's property is never confirmed to exist. A home with no
 * agent (an individual owner's page) is reached by its unguessable id, as before.
 */
async function mayOpenHome(request: Request, homeId: string): Promise<boolean> {
  const db = sql();
  const rows = (await db`
    select agent_id from homes where id = ${homeId}
  `) as unknown as { agent_id: string | null }[];
  if (rows.length === 0) return false;
  if (!rows[0].agent_id) return true;
  const agent = await readSession(request);
  return agent?.id === String(rows[0].agent_id);
}

const HOME_NOT_FOUND = "That home could not be found.";

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
  public_id: string | null;
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
    publicId: row.public_id ? String(row.public_id) : null,
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
    select id, public_id, address, status, story, last_sale_price, last_sale_date, epc_rating,
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

// ── The plaque ──────────────────────────────────────────────────────────

/**
 * A UK postcode, checked loosely and kindly: the shape is right, the case and
 * spacing are forgiven. A wrong-looking code is a typo, not a rejection.
 */
const UK_POSTCODE = /^[A-Za-z]{1,2}\d[A-Za-z\d]?\s*\d[A-Za-z]{2}$/;

function normalisePostcode(value: string): string {
  const compact = value.replace(/\s+/g, "").toUpperCase();
  if (compact.length < 5) return value.trim().toUpperCase();
  return `${compact.slice(0, -3)} ${compact.slice(-3)}`;
}

/**
 * The origin the plaque's QR code points at. A plaque is cut once and lives on
 * a wall for decades, so this must never be the sandbox or preview host a
 * request happens to arrive on — it is the public site, overridable with
 * PUBLIC_SITE_ORIGIN if the site ever moves.
 */
const LIVE_ORIGIN = "https://familycore.cto.site";

function publicOrigin(): string {
  const configured = process.env.PUBLIC_SITE_ORIGIN?.trim();
  return (configured || LIVE_ORIGIN).replace(/\/+$/, "");
}

type PlaqueHome = { id: string; publicId: string | null; address: string };

/** A home by its private id or by its public id — the plaque screen accepts both. */
async function loadHomeForPlaque(ref: string): Promise<PlaqueHome | null> {
  const db = sql();
  const rows = (await db`
    select id, public_id, address from homes
    where public_id = ${ref} or id::text = ${ref}
    limit 1
  `) as unknown as { id: string; public_id: string | null; address: string }[];
  if (rows.length === 0) return null;
  return {
    id: String(rows[0].id),
    publicId: rows[0].public_id ? String(rows[0].public_id) : null,
    address: rows[0].address,
  };
}

type PlaqueOrder = {
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

/** The most recent reservation for a home, if the owner has made one. */
async function loadPlaqueOrder(homeId: string): Promise<PlaqueOrder | null> {
  const db = sql();
  const rows = (await db`
    select id, name, address_line1, address_line2, town, postcode, note, status, created_at
    from plaque_orders where home_id = ${homeId}
    order by created_at desc limit 1
  `) as unknown as {
    id: string;
    name: string;
    address_line1: string;
    address_line2: string | null;
    town: string;
    postcode: string;
    note: string | null;
    status: string;
    created_at: unknown;
  }[];
  if (rows.length === 0) return null;
  const row = rows[0];
  return {
    id: String(row.id),
    name: row.name,
    addressLine1: row.address_line1,
    addressLine2: row.address_line2,
    town: row.town,
    postcode: row.postcode,
    note: row.note,
    status: row.status,
    createdAt: String(row.created_at),
  };
}

/** A short, unguessable public id. It is what the plaque at the door encodes. */
function newPublicId(): string {
  const alphabet = "abcdefghijkmnpqrstuvwxyz23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  let id = "";
  for (const byte of bytes) id += alphabet[byte % alphabet.length];
  return id;
}

// ── Rate limiting for Ask Your House ────────────────────────────────────
// In memory, per server process: enough to stop a page being used as a free
// model endpoint, and it forgets itself.
const askHits = new Map<string, number[]>();

function tooManyAsks(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const recent = (askHits.get(key) ?? []).filter((at) => now - at < windowMs);
  if (recent.length >= limit) {
    askHits.set(key, recent);
    return true;
  }
  recent.push(now);
  askHits.set(key, recent);
  if (askHits.size > 5000) {
    for (const [k, times] of askHits) {
      if (times.every((at) => now - at >= windowMs)) askHits.delete(k);
    }
  }
  return false;
}

/** The page's own records, as the model's entire knowledge of the house. */
function houseContext(row: Record<string, unknown>): string {
  const lines: string[] = [];
  const add = (label: string, value: unknown) => {
    if (typeof value !== "string") return;
    const trimmed = value.trim();
    if (trimmed) lines.push(`${label}: ${trimmed}`);
  };

  add("Address", row.address);
  add("Build era", row.build_era);
  add("EPC rating", row.epc_rating);
  add("Last sale price", row.last_sale_price);
  add("Last sale date", row.last_sale_date);
  add("Previous owners", row.previous_owners);
  add("The owner's chapter (their own words)", row.story);

  const keyDates = Array.isArray(row.key_dates) ? (row.key_dates as KeyDate[]) : [];
  const dates = keyDates
    .map((entry) => {
      const date = cleanDate(entry?.date) ?? "";
      const label = cleanText(entry?.label, 160) ?? "";
      return date || label ? `- ${date || "Undated"}: ${label}` : null;
    })
    .filter((line): line is string => line !== null);
  if (dates.length > 0) lines.push(`Key dates:\n${dates.join("\n")}`);

  const gems = Array.isArray(row.hidden_gems)
    ? (row.hidden_gems as unknown[]).map((gem) => cleanText(gem, 300)).filter((g): g is string => g !== null)
    : [];
  if (gems.length > 0) lines.push(`Hidden gems:\n${gems.map((gem) => `- ${gem}`).join("\n")}`);

  return lines.join("\n");
}

/** Answer only from the page. Saying "not recorded" is a correct answer. */
async function askHouse(
  row: Record<string, unknown>,
  question: string,
): Promise<{ answer: string; declined: boolean } | { error: string }> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return { error: "Ask Your House is not connected yet." };

  const context = houseContext(row);
  const system = [
    "You are the voice of a HomeStory page — the permanent history page of one British house, read by a visitor standing at its front door.",
    "Below is everything this page records about the house. It is your entire knowledge of this house, and your only source.",
    "",
    "Hard rules:",
    "- Answer only from the records below. Never use outside knowledge, general history, or assumptions about this address, its street, its period or its kind of building.",
    "- Never invent, infer or guess an owner, name, date, price, event, room, feature or alteration.",
    "- If the records do not answer the question, say so plainly and stop. For example: \"This page doesn't record who lived here in 1940.\" Do not soften it into a guess.",
    "- Never say 'probably', 'likely', 'may have', 'possibly', or offer a possibility instead of an answer.",
    "- If part of the question is answered and part is not, answer the part that is recorded and say plainly that the rest is not recorded.",
    "- Write in plain, warm British English, in two or three sentences at most. No headings, no bullet points, no preamble, no mention of 'records below' or 'context'.",
    "",
    "This page records:",
    context || "(nothing beyond the address)",
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
        max_tokens: 400,
        system,
        messages: [{ role: "user", content: question.slice(0, 300) }],
      }),
      signal: AbortSignal.timeout(45000),
    });

    if (!response.ok) {
      const detail = await response.text();
      console.error("[ask-your-house] Anthropic error", response.status, detail.slice(0, 400));
      return { error: "Claude could not be reached just now. Please ask again in a moment." };
    }

    const payload = (await response.json()) as { content?: { type: string; text?: string }[] };
    const answer = (payload.content ?? [])
      .filter((part) => part.type === "text" && typeof part.text === "string")
      .map((part) => part.text as string)
      .join("\n")
      .trim();

    if (!answer) return { error: "Claude did not return an answer. Please ask again." };

    const declined = /(doesn[’']?t|does not|do not|is not|isn[’']?t) (record|recorded|note|noted)|not recorded|no record/i.test(
      answer,
    );
    return { answer, declined };
  } catch (err) {
    console.error("[ask-your-house] request failed", err);
    return { error: "Claude could not be reached just now. Please ask again in a moment." };
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

  // ── Agent accounts ────────────────────────────────────────────────────
  // Email and password, a session cookie, and nothing else. No password-reset
  // email exists: the sign-up screen says so rather than promising one.
  if (pathname === "/api/agents/me" && method === "GET") {
    const agent = await readSession(request);
    return json({
      agent: agent ? { email: agent.email, createdAt: agent.createdAt } : null,
    });
  }

  if (pathname === "/api/agents/sign-up" && method === "POST") {
    const body = await readJson(request);
    if (!body) return fail("The form could not be read.");
    const email = normaliseEmail(body.email);
    if (!email) return fail("That doesn’t look like an email address.");
    const password = typeof body.password === "string" ? body.password : "";
    if (password.length < MIN_PASSWORD_LENGTH) {
      return fail(`A password of at least ${MIN_PASSWORD_LENGTH} characters is needed.`);
    }
    if (password.length > 200) return fail("That password is too long.");

    const db = sql();
    const existing = (await db`
      select id from agents where email = ${email}
    `) as unknown as { id: string }[];
    if (existing.length > 0) {
      return fail("An account with that email already exists. Sign in instead.", 409);
    }

    const id = crypto.randomUUID();
    const passwordHash = await hashPassword(password);
    try {
      await db`
        insert into agents (id, email, password_hash) values (${id}, ${email}, ${passwordHash})
      `;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes("duplicate key") || message.includes("23505")) {
        return fail("An account with that email already exists. Sign in instead.", 409);
      }
      throw err;
    }

    const token = await createSession(id);
    return withCookie(
      json({ agent: { email, createdAt: new Date().toISOString() } }, 201),
      sessionCookie(request, token),
    );
  }

  if (pathname === "/api/agents/sign-in" && method === "POST") {
    const body = await readJson(request);
    if (!body) return fail("The form could not be read.");
    const email = normaliseEmail(body.email);
    const password = typeof body.password === "string" ? body.password : "";
    if (!email || !password) return fail("Enter your email and password.");

    // Ten attempts per ten minutes from one address — a password is not a
    // guessable thing, and this stops a script treating it as one.
    if (tooManyAsks(`signin:${clientAddress(request)}`, 10, 10 * 60 * 1000)) {
      return fail("That is a lot of attempts. Please wait a few minutes and try again.", 429);
    }

    const db = sql();
    const rows = (await db`
      select id, email, password_hash from agents where email = ${email} limit 1
    `) as unknown as { id: string; email: string; password_hash: string }[];
    // The same answer whether the email is unknown or the password is wrong.
    const refusal = "That email and password don’t match an account.";
    if (rows.length === 0) return fail(refusal, 401);

    const ok = await verifyPassword(password, rows[0].password_hash);
    if (!ok) return fail(refusal, 401);

    const agentId = String(rows[0].id);
    await db`update agents set last_signed_in_at = now() where id = ${agentId}`;
    const token = await createSession(agentId);
    return withCookie(
      json({ agent: { email: rows[0].email } }),
      sessionCookie(request, token),
    );
  }

  if (pathname === "/api/agents/sign-out" && method === "POST") {
    await destroySession(request);
    return withCookie(json({ ok: true }), sessionCookie(request, null));
  }

  // ── An agent's ledger of properties ───────────────────────────────────
  // Every query is scoped to the signed-in agent. There is no route that lists
  // homes without one, and no route that takes an agent id from the client.
  if (pathname === "/api/agents/homes" && method === "GET") {
    const agent = await readSession(request);
    if (!agent) return fail("Sign in to see your properties.", 401);
    const db = sql();
    const rows = (await db`
      select id, public_id, address, status, created_at, updated_at
      from homes where agent_id = ${agent.id}
      order by updated_at desc
    `) as unknown as {
      id: string;
      public_id: string | null;
      address: string;
      status: string;
      created_at: unknown;
      updated_at: unknown;
    }[];
    return json({
      homes: rows.map((row) => ({
        id: String(row.id),
        publicId: row.public_id ? String(row.public_id) : null,
        address: row.address,
        status: row.status,
        createdAt: String(row.created_at),
        updatedAt: String(row.updated_at),
      })),
    });
  }

  if (pathname === "/api/agents/homes" && method === "POST") {
    const agent = await readSession(request);
    if (!agent) return fail("Sign in to add a property.", 401);
    const body = await readJson(request);
    if (!body) return fail("The form could not be read.");
    const address = cleanText(body.address, 300);
    if (!address) return fail("An address is needed before a property can be added.");

    const id = crypto.randomUUID();
    const db = sql();
    await db`
      insert into homes (id, address, records_source, agent_id)
      values (${id}, ${address}, 'agent', ${agent.id})
    `;
    const rows = (await db`
      select id, public_id, address, status, created_at, updated_at
      from homes where id = ${id}
    `) as unknown as {
      id: string;
      public_id: string | null;
      address: string;
      status: string;
      created_at: unknown;
      updated_at: unknown;
    }[];
    const row = rows[0];
    return json(
      {
        home: {
          id: String(row.id),
          publicId: row.public_id ? String(row.public_id) : null,
          address: row.address,
          status: row.status,
          createdAt: String(row.created_at),
          updatedAt: String(row.updated_at),
        },
      },
      201,
    );
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
    if (!(await mayOpenHome(request, homeMatch[1]))) return fail(HOME_NOT_FOUND, 404);
    const home = await loadHome(homeMatch[1]);
    if (!home) return fail(HOME_NOT_FOUND, 404);
    return json(home);
  }

  // ── Autosave the journal ──────────────────────────────────────────────
  if (homeMatch && method === "PATCH") {
    if (!(await mayOpenHome(request, homeMatch[1]))) return fail(HOME_NOT_FOUND, 404);
    let body: Record<string, unknown>;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return fail("The change could not be read.");
    }
    const id = homeMatch[1];
    const db = sql();
    const existing = (await db`select id from homes where id = ${id}`) as unknown as { id: string }[];
    if (existing.length === 0) return fail(HOME_NOT_FOUND, 404);

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
    if (!(await mayOpenHome(request, polishMatch[1]))) return fail(HOME_NOT_FOUND, 404);
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
    if (!(await mayOpenHome(request, homeId))) return fail(HOME_NOT_FOUND, 404);
    const db = sql();
    const home = (await db`select id from homes where id = ${homeId}`) as unknown as { id: string }[];
    if (home.length === 0) return fail(HOME_NOT_FOUND, 404);

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
    if (!(await mayOpenHome(request, photoDeleteMatch[1]))) return fail(HOME_NOT_FOUND, 404);
    const db = sql();
    await db`
      delete from home_photos where id = ${photoDeleteMatch[2]} and home_id = ${photoDeleteMatch[1]}
    `;
    return json({ ok: true });
  }

  // ── Publish ───────────────────────────────────────────────────────────
  // Publishing assigns the home's public id the first time and keeps it for
  // ever: the plaque at the door encodes it, so it must never change.
  const publishMatch = pathname.match(/^\/api\/homes\/([0-9a-f-]{36})\/publish$/i);
  if (publishMatch && method === "POST") {
    if (!(await mayOpenHome(request, publishMatch[1]))) return fail(HOME_NOT_FOUND, 404);
    const db = sql();
    const rows = (await db`
      update homes set
        status = 'published',
        public_id = coalesce(public_id, ${newPublicId()}),
        published_at = coalesce(published_at, now()),
        updated_at = now()
      where id = ${publishMatch[1]}
      returning id, status, public_id
    `) as unknown as { id: string; status: string; public_id: string | null }[];
    if (rows.length === 0) return fail("That home could not be found.", 404);
    const publicId = rows[0].public_id ? String(rows[0].public_id) : null;
    return json({
      id: String(rows[0].id),
      status: rows[0].status,
      publicId,
      url: publicId ? `/h/${publicId}` : null,
    });
  }

  // ── The plaque ────────────────────────────────────────────────────────
  // Two separate truths here. The QR code is real: it encodes the home's
  // permanent public page, and the same code is what gets engraved. The order
  // is not a sale — no workshop is connected, so nothing can be made or posted,
  // and no payment is taken.
  const plaqueMatch = pathname.match(/^\/api\/homes\/([a-z0-9-]{6,40})\/plaque$/i);
  const plaqueQrMatch = pathname.match(/^\/api\/homes\/([a-z0-9-]{6,40})\/plaque\/qr\.svg$/i);

  if (plaqueMatch && method === "GET") {
    const home = await loadHomeForPlaque(plaqueMatch[1]);
    if (!home) return fail(HOME_NOT_FOUND, 404);
    if (!(await mayOpenHome(request, home.id))) return fail(HOME_NOT_FOUND, 404);
    return json({
      home: { address: home.address, published: Boolean(home.publicId) },
      publicUrl: home.publicId ? `${publicOrigin()}/h/${home.publicId}` : null,
      order: await loadPlaqueOrder(home.id),
    });
  }

  if (plaqueMatch && method === "POST") {
    const home = await loadHomeForPlaque(plaqueMatch[1]);
    if (!home) return fail(HOME_NOT_FOUND, 404);
    if (!(await mayOpenHome(request, home.id))) return fail(HOME_NOT_FOUND, 404);
    if (!home.publicId) {
      return fail("Publish your home’s page first — the plaque carries its QR code.");
    }

    let body: Record<string, unknown>;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return fail("The form could not be read.");
    }

    const name = cleanText(body.name, 120);
    const addressLine1 = cleanText(body.addressLine1, 160);
    const addressLine2 = cleanText(body.addressLine2, 160);
    const town = cleanText(body.town, 120);
    const postcode = cleanText(body.postcode, 16);
    const note = cleanText(body.note, 600);

    if (!name) return fail("A name is needed on the order.");
    if (!addressLine1) return fail("The first line of the delivery address is needed.");
    if (!town) return fail("A town or city is needed on the delivery address.");
    if (!postcode) return fail("A postcode is needed on the delivery address.");
    if (!UK_POSTCODE.test(postcode)) {
      return fail("That postcode doesn’t look quite right — a UK one looks like SW1A 2AA.");
    }

    const id = crypto.randomUUID();
    const db = sql();
    await db`
      insert into plaque_orders (id, home_id, name, address_line1, address_line2,
                                 town, postcode, note, status)
      values (${id}, ${home.id}, ${name}, ${addressLine1}, ${addressLine2},
              ${town}, ${normalisePostcode(postcode)}, ${note}, 'reserved')
    `;
    return json({ order: await loadPlaqueOrder(home.id) }, 201);
  }

  if (plaqueQrMatch && method === "GET") {
    const home = await loadHomeForPlaque(plaqueQrMatch[1]);
    if (!home) return new Response("Not found", { status: 404 });
    if (!home.publicId) return new Response("This home has no public page yet.", { status: 404 });

    const url = `${publicOrigin()}/h/${home.publicId}`;
    try {
      const QRCode = (await import("qrcode")).default;
      const svg = await QRCode.toString(url, {
        type: "svg",
        errorCorrectionLevel: "Q",
        margin: 2,
        width: 640,
        color: { dark: "#1c1c1a", light: "#00000000" },
      });
      return new Response(svg, {
        status: 200,
        headers: {
          "Content-Type": "image/svg+xml; charset=utf-8",
          "Cache-Control": "public, max-age=300",
        },
      });
    } catch (err) {
      console.error("[plaque] QR generation failed", err);
      return new Response("The QR code could not be drawn just now.", { status: 500 });
    }
  }

  // ── Ask Your House ────────────────────────────────────────────────────
  const askMatch = pathname.match(/^\/api\/public\/([a-z0-9]{6,40})\/ask$/i);
  if (askMatch && method === "POST") {
    const publicId = askMatch[1].toLowerCase();

    let body: Record<string, unknown>;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return fail("The question could not be read.");
    }
    const question = cleanText(body.question, 300);
    if (!question) return fail("Ask a question first.");

    const db = sql();
    const rows = (await db`
      select address, story, build_era, epc_rating, last_sale_price, last_sale_date,
             previous_owners, key_dates, hidden_gems
      from homes where public_id = ${publicId} and status = 'published' limit 1
    `) as unknown as Record<string, unknown>[];
    if (rows.length === 0) return fail("There is no page here to ask.", 404);

    if (!process.env.ANTHROPIC_API_KEY) {
      return json({ connected: false, error: "Ask Your House is not connected yet." }, 200);
    }

    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      request.headers.get("x-real-ip") ??
      "unknown";
    if (tooManyAsks(`ip:${ip}`, 15, 10 * 60 * 1000) || tooManyAsks(`page:${publicId}`, 90, 60 * 60 * 1000)) {
      return fail("That is a lot of questions at once. Please wait a moment and ask again.", 429);
    }

    const result = await askHouse(rows[0], question);
    if ("error" in result) return json({ connected: true, error: result.error }, 200);
    return json({ connected: true, answer: result.answer, declined: result.declined });
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
