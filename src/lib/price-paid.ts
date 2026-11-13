/**
 * HM Land Registry Price Paid Data — what an address has sold for, and when.
 *
 * Price Paid Data is the register of residential sales in England and Wales
 * since 1995. It holds prices, dates, tenure and whether the sale was a new
 * build. It holds no names: a past owner is still on no register we can reach,
 * and nothing here pretends otherwise.
 *
 * There is no API key. The register publishes PPD as linked data, and the
 * SPARQL endpoint answers a postcode-and-house-number question with real sale
 * records, so the data is asked for one address at a time and stored against
 * the home. The whole 1.5 GB file is never imported.
 *
 * Two rules run through this file:
 *
 *  1. Only the address asked about is ever returned. The query filters on the
 *     postcode *and* the house number or name, so a neighbour's sale can never
 *     be read as this home's — the register does the filtering, not us.
 *  2. A miss is normal. Plenty of homes have no record (never sold since 1995,
 *     Scotland or Northern Ireland, a new build). The answer is then an empty
 *     list, never a guess and never a neighbour's price.
 *
 * Data: HM Land Registry Price Paid Data, Open Government Licence v3.0,
 * © Crown copyright.
 */

const SPARQL_ENDPOINT = "https://landregistry.data.gov.uk/landregistry/query";

/** The attribution the licence requires, in one place. */
export const PRICE_PAID_LICENCE =
  "Sale prices and dates from HM Land Registry Price Paid Data (Open Government Licence v3.0), © Crown copyright";

/** One sale, as the register records it. */
export type PricePaidSale = {
  /** What it sold for, in whole pounds. */
  price: number;
  /** The date of the sale, `YYYY-MM-DD`. */
  date: string;
  /** Whether the register marks the sale as a new build, or null if unrecorded. */
  newBuild: boolean | null;
  /** "Freehold" or "Leasehold", as recorded, or null. */
  tenure: string | null;
  /** The house number or name the sale is recorded against. */
  paon: string | null;
  street: string | null;
};

export type PricePaidLookup =
  | {
      ok: true;
      /** Newest first. Empty means the register has no sale for this address. */
      sales: PricePaidSale[];
      /** What was asked, so the page can say what was searched. */
      postcode: string;
      paon: string;
    }
  | { ok: false; reason: "no-address" | "unreachable" };

const UK_POSTCODE = /[A-Za-z]{1,2}\d[A-Za-z\d]?\s*\d[A-Za-z]{2}/;

/** The postcode inside a typed or register-composed address, normalised. */
export function postcodeFromAddress(address: string): string | null {
  const match = UK_POSTCODE.exec(address ?? "");
  if (!match) return null;
  const compact = match[0].replace(/\s+/g, "").toUpperCase();
  return `${compact.slice(0, -3)} ${compact.slice(-3)}`;
}

/**
 * The house number or name inside an address, as Price Paid Data writes it:
 * "25" for "25 High Petergate, York, YO1 7HP", "THE OLD RECTORY" for
 * "The Old Rectory, Main Street, ...". A flat number is the secondary part of
 * the address and is not a house number on its own.
 */
export function paonFromAddress(address: string): string | null {
  const first = (address ?? "").split(",")[0]?.trim() ?? "";
  if (!first) return null;
  // "Flat 2, 14 Elm Road" — the flat is the secondary addressable object, so the
  // house number is in the next part.
  if (/^(flat|apartment|unit)\b/i.test(first)) {
    const next = (address ?? "").split(",")[1]?.trim() ?? "";
    const number = /^(\d+[A-Za-z]?)\b/.exec(next);
    return number ? number[1].toUpperCase() : null;
  }
  const number = /^(\d+[A-Za-z]?)\b/.exec(first);
  if (number) return number[1].toUpperCase();
  return first.replace(/\s+/g, " ").toUpperCase();
}

/** A SPARQL string literal, with the quote and backslash escapes it needs. */
function literal(value: string): string {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function text(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

/** `http://…/def/common/freehold` → "Freehold". */
function tenureLabel(value: unknown): string | null {
  const uri = text(value);
  if (!uri) return null;
  const last = uri.split(/[\/#]/).pop() ?? "";
  if (!last) return null;
  return last.charAt(0).toUpperCase() + last.slice(1).toLowerCase();
}

type Binding = Record<string, { value?: string } | undefined>;

/**
 * The sale history the register holds for one address. An address with no
 * postcode cannot be asked about, and an unreachable register is reported as
 * such rather than as "no sales" — the two mean different things on the page.
 */
export async function lookupPricePaid(address: string): Promise<PricePaidLookup> {
  const postcode = postcodeFromAddress(address);
  const paon = paonFromAddress(address);
  if (!postcode || !paon) return { ok: false, reason: "no-address" };

  const query = [
    "PREFIX lrppi: <http://landregistry.data.gov.uk/def/ppi/>",
    "PREFIX common: <http://landregistry.data.gov.uk/def/common/>",
    "SELECT ?paon ?street ?amount ?date ?newBuild ?estateType WHERE {",
    "  ?trans lrppi:pricePaid ?amount ;",
    "         lrppi:transactionDate ?date ;",
    "         lrppi:propertyAddress ?addr .",
    `  ?addr common:postcode ${literal(postcode)} ;`,
    "        common:paon ?paon .",
    "  OPTIONAL { ?addr common:street ?street }",
    "  OPTIONAL { ?trans lrppi:newBuild ?newBuild }",
    "  OPTIONAL { ?trans lrppi:estateType ?estateType }",
    `  FILTER (UCASE(STR(?paon)) = ${literal(paon)})`,
    "}",
    "ORDER BY DESC(?date)",
    "LIMIT 200",
  ].join("\n");

  try {
    const response = await fetch(SPARQL_ENDPOINT, {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        accept: "application/sparql-results+json",
      },
      body: new URLSearchParams({ query }).toString(),
      signal: AbortSignal.timeout(20000),
    });

    if (!response.ok) {
      console.error("[price-paid] register answered", response.status);
      return { ok: false, reason: "unreachable" };
    }

    const payload = (await response.json().catch(() => null)) as {
      results?: { bindings?: Binding[] };
    } | null;
    const bindings = payload?.results?.bindings;
    if (!Array.isArray(bindings)) return { ok: false, reason: "unreachable" };

    const sales: PricePaidSale[] = [];
    for (const binding of bindings) {
      const price = Number(binding.amount?.value ?? "");
      const date = text(binding.date?.value)?.slice(0, 10) ?? "";
      if (!Number.isFinite(price) || price <= 0 || !/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
      const newBuildValue = text(binding.newBuild?.value);
      sales.push({
        price,
        date,
        newBuild: newBuildValue === null ? null : newBuildValue === "true",
        tenure: tenureLabel(binding.estateType?.value),
        paon: text(binding.paon?.value),
        street: text(binding.street?.value),
      });
    }

    sales.sort((a, b) => b.date.localeCompare(a.date));
    return { ok: true, sales, postcode, paon };
  } catch (err) {
    console.error("[price-paid] lookup error", err instanceof Error ? err.message : err);
    return { ok: false, reason: "unreachable" };
  }
}

/** "£5,095,000" — a sale price as the page shows it. */
export function formatSalePrice(price: number): string {
  if (!Number.isFinite(price)) return "";
  return `£${Math.round(price).toLocaleString("en-GB")}`;
}

/** "29 March 2023" — a sale date as the page shows it. */
export function formatSaleDate(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec((iso ?? "").trim());
  if (!match) return iso ?? "";
  const date = new Date(`${match[1]}-${match[2]}-${match[3]}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

/** The stored rows, checked before they reach a page. */
export function cleanSales(value: unknown): PricePaidSale[] {
  if (!Array.isArray(value)) return [];
  const sales: PricePaidSale[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object") continue;
    const row = entry as Record<string, unknown>;
    const price = typeof row.price === "number" ? row.price : Number(row.price ?? "");
    const date = typeof row.date === "string" ? row.date.slice(0, 10) : "";
    if (!Number.isFinite(price) || price <= 0 || !/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
    sales.push({
      price,
      date,
      newBuild: typeof row.newBuild === "boolean" ? row.newBuild : null,
      tenure: typeof row.tenure === "string" && row.tenure.trim() ? row.tenure.trim() : null,
      paon: typeof row.paon === "string" && row.paon.trim() ? row.paon.trim() : null,
      street: typeof row.street === "string" && row.street.trim() ? row.street.trim() : null,
    });
  }
  return sales.sort((a, b) => b.date.localeCompare(a.date));
}
