import { createStartHandler, defaultStreamHandler } from "@tanstack/react-start/server";
import { timingSafeEqual } from "node:crypto";
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
import {
  EPC_LICENCE,
  epcConfigured,
  fetchCertificate,
  formatRecordedOn,
  isCertificateNumber,
  searchByPostcode,
} from "./lib/epc";
import { cleanSales, lookupPricePaid } from "./lib/price-paid";
import {
  PREMIUM_AMOUNT_PENCE,
  PREMIUM_CURRENCY,
  PREMIUM_PRICE_ID,
  PREMIUM_PRICE_LABEL,
  PREMIUM_TERMS_LINE,
  missingSellerDetails,
  premiumOnSale,
  premiumPaymentLink,
  sellerDetails,
  sessionConfirmsHome,
  stripeKey,
  type CheckoutSession,
} from "./lib/premium";

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
  floor_area: string | null;
  wall_type: string | null;
  roof_type: string | null;
  window_type: string | null;
  previous_owners: string | null;
  records_source: string;
  epc_certificate_number: string | null;
  epc_certificate_date: string | null;
  epc_uprn: string | null;
  epc_sourced: boolean | null;
  epc_fields: unknown;
  price_paid_sales: unknown;
  price_paid_checked_at: unknown;
  price_paid_paon: string | null;
  key_dates: unknown;
  hidden_gems: unknown;
  created_at: unknown;
  updated_at: unknown;
};

/**
 * The record fields the EPC register can fill. They are ordinary, editable
 * fields; `epc_fields` remembers which of them are still exactly as the
 * register recorded them, so an owner's correction is never credited to the
 * register.
 */
const EPC_FIELD_KEYS = [
  "floorArea",
  "epcRating",
  "buildEra",
  "wallType",
  "roofType",
  "windowType",
] as const;

type EpcFieldKey = (typeof EPC_FIELD_KEYS)[number];

function epcFieldValue(body: Record<string, unknown>, key: EpcFieldKey): string {
  switch (key) {
    case "floorArea":
      return cleanText(body.floorArea, 40) ?? "";
    case "epcRating":
      return cleanText(body.epcRating, 20) ?? "";
    case "buildEra":
      return cleanText(body.buildEra, 80) ?? "";
    case "wallType":
      return cleanText(body.wallType, 300) ?? "";
    case "roofType":
      return cleanText(body.roofType, 300) ?? "";
    case "windowType":
      return cleanText(body.windowType, 300) ?? "";
  }
}

function epcFieldValueFromRow(row: Record<string, unknown>, key: EpcFieldKey): string {
  const column: Record<EpcFieldKey, string> = {
    floorArea: "floor_area",
    epcRating: "epc_rating",
    buildEra: "build_era",
    wallType: "wall_type",
    roofType: "roof_type",
    windowType: "window_type",
  };
  const value = row[column[key]];
  return typeof value === "string" ? value : "";
}

function cleanEpcFields(value: unknown): EpcFieldKey[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => (typeof entry === "string" ? entry : ""))
    .filter((entry): entry is EpcFieldKey => (EPC_FIELD_KEYS as readonly string[]).includes(entry));
}

function toHome(row: HomeRow) {
  const epcFields = cleanEpcFields(row.epc_fields);
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
    floorArea: row.floor_area ?? "",
    wallType: row.wall_type ?? "",
    roofType: row.roof_type ?? "",
    windowType: row.window_type ?? "",
    previousOwners: row.previous_owners ?? "",
    // Where a value came from: the owner typed it, or the EPC register holds it.
    recordsSource: row.records_source,
    epcSourced: Boolean(row.epc_sourced),
    epcRecordedOn: row.epc_certificate_date ?? "",
    epcFields,
    // What the Land Registry records for this address, and when it was asked.
    // Read-only everywhere: it is the register's, never the owner's.
    pricePaidSales: cleanSales(row.price_paid_sales),
    pricePaidCheckedAt: row.price_paid_checked_at ? String(row.price_paid_checked_at) : null,
    pricePaidPaon: row.price_paid_paon ?? "",
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
           build_era, floor_area, wall_type, roof_type, window_type, previous_owners,
           records_source, epc_certificate_number, epc_certificate_date, epc_uprn,
           epc_sourced, epc_fields, price_paid_sales, price_paid_checked_at, price_paid_paon,
           key_dates, hidden_gems, created_at, updated_at
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

// ── HomeStory Premium ───────────────────────────────────────────────────
// One £24.99 payment, for one house, made once. The two Claude features with a
// real running cost sit behind it; everything a free owner already has does not.
// No card data passes through here — Stripe hosts the payment page and tells us
// only whether a session was paid, for how much, and for which home.

type PremiumHome = {
  id: string;
  publicId: string | null;
  address: string;
  premiumAt: string | null;
};

/** A home by its private id or its public id — the premium screen accepts both. */
async function loadHomeByRef(ref: string): Promise<PremiumHome | null> {
  const db = sql();
  const rows = (await db`
    select id, public_id, address, premium_at from homes
    where id::text = ${ref} or public_id = ${ref.toLowerCase()}
    limit 1
  `) as unknown as {
    id: string;
    public_id: string | null;
    address: string;
    premium_at: unknown;
  }[];
  if (rows.length === 0) return null;
  return {
    id: String(rows[0].id),
    publicId: rows[0].public_id ? String(rows[0].public_id) : null,
    address: rows[0].address,
    premiumAt: rows[0].premium_at ? String(rows[0].premium_at) : null,
  };
}

async function isPremiumHome(homeId: string): Promise<boolean> {
  const db = sql();
  const rows = (await db`
    select premium_at from homes where id = ${homeId}
  `) as unknown as { premium_at: unknown }[];
  return rows.length > 0 && Boolean(rows[0].premium_at);
}

// ── The owner's Premium admin screen ────────────────────────────────────
// Payments arrive on the hosted Stripe link, which records each home's id as
// client_reference_id. The owner reads that off Stripe and matches it to the
// home by hand; this screen is the other half of that — a list of homes and one
// button that turns Premium on. It is closed entirely, with a plain 404 rather
// than a sign-in prompt, unless PREMIUM_ADMIN_TOKEN is set in the environment.

function premiumAdminToken(): string | null {
  const token = process.env.PREMIUM_ADMIN_TOKEN?.trim();
  return token ? token : null;
}

/** Constant-time comparison, so the token cannot be guessed a character at a time. */
function tokensMatch(given: string, expected: string): boolean {
  const a = Buffer.from(given, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function premiumAdminAuthorised(request: Request, url: URL): boolean {
  const expected = premiumAdminToken();
  if (!expected) return false;
  const given = (request.headers.get("x-admin-token") ?? url.searchParams.get("token") ?? "").trim();
  if (!given) return false;
  return tokensMatch(given, expected);
}

/**
 * The origin a checkout should return to. The owner's own browser origin when
 * it sends one, so the return lands where they were; the public site otherwise.
 */
function requestOrigin(request: Request): string {
  const header = request.headers.get("origin");
  if (header) {
    try {
      const origin = new URL(header).origin;
      if (origin.startsWith("http://") || origin.startsWith("https://")) return origin;
    } catch {
      // Fall through to the public origin.
    }
  }
  return publicOrigin();
}

const STRIPE_API = "https://api.stripe.com/v1";

/**
 * Stripe takes form-encoded bodies. `{CHECKOUT_SESSION_ID}` must reach Stripe
 * as braces — it is a placeholder it substitutes on the way back — so that one
 * token is left unencoded.
 */
function stripeForm(params: Record<string, string>): string {
  return Object.entries(params)
    .map(
      ([key, value]) =>
        `${encodeURIComponent(key)}=${encodeURIComponent(value).replace(
          /%7BCHECKOUT_SESSION_ID%7D/gi,
          "{CHECKOUT_SESSION_ID}",
        )}`,
    )
    .join("&");
}

type StripeResult<T> = { ok: true; data: T } | { ok: false; message: string };

async function stripeRequest<T>(
  path: string,
  init: { method: "GET" | "POST"; body?: string },
): Promise<StripeResult<T>> {
  const key = stripeKey();
  if (!key) return { ok: false, message: "Payments are not connected yet." };
  try {
    const response = await fetch(`${STRIPE_API}${path}`, {
      method: init.method,
      headers: {
        Authorization: `Bearer ${key}`,
        ...(init.body ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
      },
      body: init.body,
      signal: AbortSignal.timeout(20000),
    });
    const payload = (await response.json().catch(() => null)) as unknown;
    if (!response.ok) {
      const detail = payload as { error?: { message?: string } } | null;
      console.error("[premium] Stripe error", response.status, detail?.error?.message ?? "");
      return { ok: false, message: "Stripe could not be reached just now." };
    }
    return { ok: true, data: payload as T };
  } catch (err) {
    console.error("[premium] Stripe request failed", err);
    return { ok: false, message: "Stripe could not be reached just now." };
  }
}

/** A checkout session for this home at the one Premium price. Nothing is charged until it is paid. */
async function createPremiumSession(
  homeId: string,
  origin: string,
): Promise<StripeResult<{ id: string; url: string }>> {
  const back = `${origin}/homes/${homeId}/premium`;
  const result = await stripeRequest<{ id?: string; url?: string }>("/checkout/sessions", {
    method: "POST",
    body: stripeForm({
      mode: "payment",
      "line_items[0][price]": PREMIUM_PRICE_ID,
      "line_items[0][quantity]": "1",
      client_reference_id: homeId,
      "metadata[homeId]": homeId,
      "payment_intent_data[metadata][homeId]": homeId,
      success_url: `${back}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${back}?cancelled=1`,
    }),
  });
  if (!result.ok) return result;
  const { id, url } = result.data;
  if (!id || !url) return { ok: false, message: "Stripe did not return a checkout to open." };
  return { ok: true, data: { id: String(id), url: String(url) } };
}

/** A checkout session id, as Stripe writes them. Anything else is not asked about. */
const STRIPE_SESSION_ID = /^cs_[A-Za-z0-9_]{8,200}$/;

async function retrieveCheckoutSession(sessionId: string): Promise<StripeResult<CheckoutSession>> {
  return stripeRequest<CheckoutSession>(`/checkout/sessions/${encodeURIComponent(sessionId)}`, {
    method: "GET",
  });
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
  add("Floor area", row.floor_area);
  add("Walls", row.wall_type);
  add("Roof", row.roof_type);
  add("Windows", row.window_type);
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

  // ── The EPC register ──────────────────────────────────────────────────
  // Two questions, one route: which certificates does the register hold for
  // this postcode, and what does this one certificate say about the building.
  // The token stays here — the browser only ever sees the normalised facts.
  if (pathname === "/api/epc/lookup" && method === "GET") {
    if (!epcConfigured()) {
      return json({
        connected: false,
        message:
          "The EPC register is not connected just now, so nothing could be looked up. What you type is what is used.",
      });
    }

    const ip = clientAddress(request);
    if (tooManyAsks(`epc:${ip}`, 60, 10 * 60 * 1000)) {
      return json({
        connected: true,
        error: "That is a lot of lookups at once. Please wait a moment and try again.",
      });
    }

    const certificateNumber = url.searchParams.get("certificateNumber")?.trim() ?? "";
    if (certificateNumber) {
      if (!isCertificateNumber(certificateNumber)) {
        return json({ connected: true, found: false, error: "That is not a certificate number." });
      }
      const result = await fetchCertificate(certificateNumber);
      if ("error" in result) {
        return json({ connected: true, found: false, error: result.error });
      }
      return json({
        connected: true,
        found: true,
        certificate: result.facts,
        source: {
          name: "EPC register",
          licence: EPC_LICENCE,
          recordedOn: formatRecordedOn(result.facts.registeredOn),
        },
      });
    }

    const postcode = url.searchParams.get("postcode")?.trim() ?? "";
    if (!postcode) {
      return json({
        connected: true,
        found: false,
        error: "Type a postcode to look it up in the EPC register.",
      });
    }

    const result = await searchByPostcode(postcode);
    if ("error" in result) {
      return json({ connected: true, found: false, error: result.error });
    }
    if (result.certificates.length === 0) {
      return json({
        connected: true,
        found: false,
        postcode,
        message: "Nothing on the EPC register for that postcode.",
      });
    }
    return json({ connected: true, found: true, certificates: result.certificates });
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
    // The EPC facts (and their provenance) are written once, here, from what the
    // register said at the moment the owner started the page. From then on the
    // fields are the owner's: their corrections win, and a corrected field
    // leaves epc_fields so it is no longer shown as the register's.
    const epcFields = cleanEpcFields(body.epcFields).filter(
      (key) => epcFieldValue(body, key) !== "",
    );
    const epcSourced = Boolean(body.epcSourced) && epcFields.length > 0;

    // What the Land Registry records for this address. Asked once, here, from
    // the address itself — never taken from the browser, so a sale price on the
    // page can only ever be the register's. A miss is normal and stored as an
    // empty list; an unreachable register leaves the columns null so the page
    // can tell "nothing recorded" from "never asked".
    const pricePaid = await lookupPricePaid(address);

    await db`
      insert into homes (id, address, last_sale_price, last_sale_date, epc_rating,
                         build_era, floor_area, wall_type, roof_type, window_type,
                         previous_owners, records_source, epc_certificate_number,
                         epc_certificate_date, epc_uprn, epc_sourced, epc_fields,
                         price_paid_sales, price_paid_checked_at, price_paid_postcode,
                         price_paid_paon)
      values (${id}, ${address}, ${cleanText(body.lastSalePrice, 80)},
              ${cleanDate(body.lastSaleDate)}, ${epcFieldValue(body, "epcRating") || null},
              ${epcFieldValue(body, "buildEra") || null}, ${epcFieldValue(body, "floorArea") || null},
              ${epcFieldValue(body, "wallType") || null}, ${epcFieldValue(body, "roofType") || null},
              ${epcFieldValue(body, "windowType") || null},
              ${cleanText(body.previousOwners, 2000)},
              'owner',
              ${epcSourced ? cleanText(body.epcCertificateNumber, 40) : null},
              ${epcSourced ? cleanDate(body.epcRecordedOn) : null},
              ${epcSourced ? cleanText(body.epcUprn, 40) : null},
              ${epcSourced}, ${JSON.stringify(epcSourced ? epcFields : [])}::jsonb,
              ${JSON.stringify(pricePaid.ok ? pricePaid.sales : [])}::jsonb,
              ${pricePaid.ok ? new Date().toISOString() : null},
              ${pricePaid.ok ? pricePaid.postcode : null},
              ${pricePaid.ok ? pricePaid.paon : null})
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
    const existing = (await db`
      select id, epc_fields, epc_rating, build_era, floor_area, wall_type, roof_type, window_type
      from homes where id = ${id}
    `) as unknown as Record<string, unknown>[];
    if (existing.length === 0) return fail(HOME_NOT_FOUND, 404);

    const address = cleanText(body.address, 300);
    const story = typeof body.story === "string" ? body.story.slice(0, 40000) : "";
    const keyDates = cleanKeyDates(body.keyDates);
    const hiddenGems = cleanGems(body.hiddenGems);

    // Provenance is worked out here, never taken from the client: a field keeps
    // its EPC marker only while it still says exactly what the register said.
    const epcFields = cleanEpcFields(existing[0].epc_fields).filter(
      (key) =>
        epcFieldValue(body, key) !== "" &&
        epcFieldValue(body, key) === epcFieldValueFromRow(existing[0], key),
    );

    await db`
      update homes set
        address = ${address ?? ""},
        story = ${story},
        last_sale_price = ${cleanText(body.lastSalePrice, 80)},
        last_sale_date = ${cleanDate(body.lastSaleDate)},
        epc_rating = ${epcFieldValue(body, "epcRating") || null},
        build_era = ${epcFieldValue(body, "buildEra") || null},
        floor_area = ${epcFieldValue(body, "floorArea") || null},
        wall_type = ${epcFieldValue(body, "wallType") || null},
        roof_type = ${epcFieldValue(body, "roofType") || null},
        window_type = ${epcFieldValue(body, "windowType") || null},
        previous_owners = ${cleanText(body.previousOwners, 2000)},
        epc_fields = ${JSON.stringify(epcFields)}::jsonb,
        key_dates = ${JSON.stringify(keyDates)}::jsonb,
        hidden_gems = ${JSON.stringify(hiddenGems)}::jsonb,
        updated_at = now()
      where id = ${id}
    `;
    const home = await loadHome(id);
    return json(home);
  }

  // ── Story Polish ──────────────────────────────────────────────────────
  // Part of Premium: the door is shut here, on the server, not only in the
  // editor. A free owner gets a plain explanation and their words untouched.
  const polishMatch = pathname.match(/^\/api\/homes\/([0-9a-f-]{36})\/polish$/i);
  if (polishMatch && method === "POST") {
    if (!(await mayOpenHome(request, polishMatch[1]))) return fail(HOME_NOT_FOUND, 404);
    if (!(await isPremiumHome(polishMatch[1]))) {
      return json(
        {
          premiumRequired: true,
          error: `Story Polish is part of HomeStory Premium — ${PREMIUM_PRICE_LABEL} once for this house. Your words are unchanged.`,
        },
        402,
      );
    }
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

  // ── HomeStory Premium ─────────────────────────────────────────────────
  // Three steps, and only the last one changes anything: what the screen needs
  // to know, start a checkout, and — on the way back — believe Stripe rather
  // than the query string.
  const premiumMatch = pathname.match(/^\/api\/homes\/([a-z0-9-]{6,40})\/premium$/i);
  const premiumCheckoutMatch = pathname.match(
    /^\/api\/homes\/([a-z0-9-]{6,40})\/premium\/checkout$/i,
  );
  const premiumVerifyMatch = pathname.match(
    /^\/api\/homes\/([a-z0-9-]{6,40})\/premium\/verify$/i,
  );

  if (premiumMatch && method === "GET") {
    const home = await loadHomeByRef(premiumMatch[1]);
    if (!home) return fail(HOME_NOT_FOUND, 404);
    if (!(await mayOpenHome(request, home.id))) return fail(HOME_NOT_FOUND, 404);

    const purchase = home.premiumAt
      ? (
          (await sql()`
            select stripe_session_id, amount_total, currency, paid_at
            from premium_purchases where home_id = ${home.id}
            order by paid_at desc limit 1
          `) as unknown as {
            stripe_session_id: string;
            amount_total: number;
            currency: string;
            paid_at: unknown;
          }[]
        )[0]
      : null;

    return json({
      homeId: home.id,
      publicId: home.publicId,
      address: home.address,
      premium: Boolean(home.premiumAt),
      premiumAt: home.premiumAt,
      // The live buy path: a hosted Stripe payment link, which needs no key and
      // carries this home's id as client_reference_id.
      onSale: premiumOnSale(),
      payUrl: premiumOnSale() ? premiumPaymentLink(home.id) : null,
      paymentsConnected: Boolean(stripeKey()),
      missing: missingSellerDetails(),
      price: { label: PREMIUM_PRICE_LABEL, amount: PREMIUM_AMOUNT_PENCE, currency: PREMIUM_CURRENCY },
      terms: PREMIUM_TERMS_LINE,
      seller: sellerDetails(),
      purchase: purchase
        ? {
            // The Stripe reference is ours to keep, not the buyer's card: no card
            // detail ever reaches this server.
            sessionId: String(purchase.stripe_session_id),
            amountTotal: Number(purchase.amount_total),
            currency: String(purchase.currency),
            paidAt: String(purchase.paid_at),
          }
        : null,
    });
  }

  if (premiumCheckoutMatch && method === "POST") {
    const home = await loadHomeByRef(premiumCheckoutMatch[1]);
    if (!home) return fail(HOME_NOT_FOUND, 404);
    if (!(await mayOpenHome(request, home.id))) return fail(HOME_NOT_FOUND, 404);

    if (home.premiumAt) return json({ premium: true, alreadyPremium: true });
    if (!premiumOnSale()) {
      return json({
        onSale: false,
        error: `HomeStory Premium is not on sale yet — ${PREMIUM_PRICE_LABEL} has been agreed, but there is no payment page to send you to. Nothing has been charged.`,
      });
    }

    // No secret key on this account, so no session can be created. The hosted
    // payment link is the live path: Stripe takes the payment and records this
    // home's id with it, and the owner unlocks the home by hand afterwards.
    if (!stripeKey()) {
      return json({ url: premiumPaymentLink(home.id), hosted: true });
    }

    const session = await createPremiumSession(home.id, requestOrigin(request));
    if (!session.ok) return fail(session.message, 502);
    return json({ url: session.data.url, sessionId: session.data.id });
  }

  if (premiumVerifyMatch && method === "POST") {
    const home = await loadHomeByRef(premiumVerifyMatch[1]);
    if (!home) return fail(HOME_NOT_FOUND, 404);
    if (!(await mayOpenHome(request, home.id))) return fail(HOME_NOT_FOUND, 404);

    let body: Record<string, unknown>;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return fail("That return from the payment page could not be read.");
    }
    const sessionId = typeof body.sessionId === "string" ? body.sessionId.trim() : "";
    if (!STRIPE_SESSION_ID.test(sessionId)) {
      return fail("That is not a payment that can be checked.", 400);
    }

    // Ask Stripe. The query string says only which session to ask about; it is
    // never the evidence that anything was paid.
    const found = await retrieveCheckoutSession(sessionId);
    if (!found.ok) {
      return json({ premium: Boolean(home.premiumAt), error: found.message }, 502);
    }

    const verdict = sessionConfirmsHome(found.data, home.id);
    if (!verdict.ok) {
      return json({ premium: Boolean(home.premiumAt), error: verdict.reason }, 400);
    }

    // Paid, in full, for this home. Record it once, then mark the home — both
    // idempotent, so reloading the return page changes nothing.
    const db = sql();
    await db`
      insert into premium_purchases (id, home_id, stripe_session_id, amount_total, currency)
      values (${crypto.randomUUID()}, ${home.id}, ${sessionId},
              ${Number(found.data.amount_total ?? PREMIUM_AMOUNT_PENCE)},
              ${String(found.data.currency ?? PREMIUM_CURRENCY).toLowerCase()})
      on conflict (stripe_session_id) do nothing
    `;
    await db`
      update homes set premium_at = coalesce(premium_at, now()), updated_at = now()
      where id = ${home.id}
    `;

    return json({ premium: true });
  }

  // ── The owner's Premium admin screen ──────────────────────────────────
  // 404 — not 401, not a sign-in — when PREMIUM_ADMIN_TOKEN is unset, so an
  // unconfigured site does not even admit this screen exists.
  if (pathname === "/api/admin/premium" || pathname === "/api/admin/premium/unlock") {
    if (!premiumAdminToken()) return json({ error: "Not found" }, 404);
    if (!premiumAdminAuthorised(request, url)) {
      return json({ error: "That token is not right." }, 401);
    }

    if (pathname === "/api/admin/premium" && method === "GET") {
      const rows = (await sql()`
        select id, address, public_id, premium_at, status, created_at
        from homes
        order by created_at desc
        limit 200
      `) as unknown as {
        id: string;
        address: string;
        public_id: string | null;
        premium_at: unknown;
        status: string;
        created_at: unknown;
      }[];
      return json({
        homes: rows.map((row) => ({
          id: String(row.id),
          address: row.address,
          publicId: row.public_id ? String(row.public_id) : null,
          premium: Boolean(row.premium_at),
          premiumAt: row.premium_at ? String(row.premium_at) : null,
          status: row.status,
          createdAt: String(row.created_at),
        })),
      });
    }

    if (pathname === "/api/admin/premium/unlock" && method === "POST") {
      const body = await readJson(request);
      const homeId = typeof body?.homeId === "string" ? body.homeId.trim() : "";
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(homeId)) {
        return fail("That is not a home this screen can open.");
      }
      // Idempotent: unlocking a home that has already paid changes nothing and
      // does not move the date it paid on.
      const rows = (await sql()`
        update homes set premium_at = coalesce(premium_at, now()), updated_at = now()
        where id = ${homeId}
        returning id, premium_at
      `) as unknown as { id: string; premium_at: unknown }[];
      if (rows.length === 0) return fail("That home could not be found.", 404);
      return json({
        id: String(rows[0].id),
        premium: true,
        premiumAt: String(rows[0].premium_at),
      });
    }

    return null;
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
      select address, story, build_era, epc_rating, floor_area, wall_type, roof_type,
             window_type, last_sale_price, last_sale_date,
             previous_owners, key_dates, hidden_gems, premium_at
      from homes where public_id = ${publicId} and status = 'published' limit 1
    `) as unknown as Record<string, unknown>[];
    if (rows.length === 0) return fail("There is no page here to ask.", 404);

    // Ask Your House is part of Premium. The page says so where the question
    // box would be, so a visitor is told plainly rather than met by a refusal.
    if (!rows[0].premium_at) {
      return json(
        {
          premiumRequired: true,
          error: `Ask Your House is part of HomeStory Premium — ${PREMIUM_PRICE_LABEL} once for this house.`,
        },
        402,
      );
    }

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

    // The Premium admin screen does not exist on a site with no admin token.
    if (url.pathname === "/admin/premium" && !premiumAdminToken()) {
      return new Response("Not found", {
        status: 404,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }

    const isApiRoute = url.pathname.startsWith("/api/") || url.pathname.startsWith("/photos/");
    if (isApiRoute) {
      // The EPC register and Claude status need no database, and the address
      // search asks the register before any home exists.
      const needsDatabase = url.pathname !== "/api/ai-status" && url.pathname !== "/api/epc/lookup";
      if (needsDatabase && !hasDatabaseURL()) {
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
