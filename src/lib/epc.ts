/**
 * The EPC register — the record source for the *building*.
 *
 * The register holds the building: floor area, energy band, walls, roof,
 * windows, and — on some certificates — the construction age band. It holds no
 * people, so previous owners and their dates are still not available from
 * anywhere, and nothing here invents them. Sale prices and dates are not this
 * register's either: those come from HM Land Registry Price Paid Data, in
 * `price-paid.ts`.
 *
 * Two rules run through this file:
 *
 *  1. The token never leaves the server. It is read from `process.env` at
 *     request time and only ever used in the Authorization header.
 *  2. Nothing is inferred. A field the certificate does not carry comes back
 *     null, and the page says "not on the EPC record" rather than guessing a
 *     decade from a wall type.
 *
 * Data: EPC register, Open Government Licence v3.0, © Crown copyright.
 */

const API_BASE = "https://api.get-energy-performance-data.communities.gov.uk/api";

/** The attribution the licence requires, in one place. */
export const EPC_LICENCE = "Energy performance data from the EPC register (Open Government Licence v3.0)";

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

export type EpcFacts = {
  certificateNumber: string;
  address: string;
  postTown: string;
  postcode: string;
  uprn: string | null;
  registeredOn: string | null;
  /** e.g. "153 m²" — null when the certificate does not carry a floor area. */
  floorArea: string | null;
  /** A–G, as the certificate records it. */
  epcRating: string | null;
  /** Distinct wall descriptions joined with "; ". */
  walls: string | null;
  roof: string | null;
  windows: string | null;
  /** The register's own label for the build era, or null when it holds none. */
  buildEra: string | null;
  dwellingType: string | null;
  heating: string | null;
};

export function epcConfigured(): boolean {
  return Boolean(process.env.EPC_API_KEY);
}

/** A UK postcode, checked loosely: the shape is right, case and spacing forgiven. */
const UK_POSTCODE = /^[A-Za-z]{1,2}\d[A-Za-z\d]?\s*\d[A-Za-z]{2}$/;

export function normalisePostcode(value: string): string {
  const compact = value.replace(/\s+/g, "").toUpperCase();
  if (compact.length < 5) return value.trim().toUpperCase();
  return `${compact.slice(0, -3)} ${compact.slice(-3)}`;
}

export function isUkPostcode(value: string): boolean {
  return UK_POSTCODE.test(value.trim());
}

function text(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function textFrom(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return String(value);
  return text(value);
}

/** A certificate number as the register writes it: five groups of four digits. */
export function isCertificateNumber(value: string): boolean {
  return /^\d{4}-\d{4}-\d{4}-\d{4}-\d{4}$/.test(value);
}

type ApiResult = { status: number; body: unknown };

async function call(path: string, signal: AbortSignal): Promise<ApiResult> {
  const key = process.env.EPC_API_KEY;
  if (!key) throw new Error("not-configured");

  const response = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${key}`, Accept: "application/json" },
    signal,
  });

  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }
  return { status: response.status, body };
}

function dataOf(body: unknown): unknown {
  if (body && typeof body === "object" && "data" in body) {
    return (body as { data: unknown }).data;
  }
  return null;
}

/**
 * Every certificate the register holds for a postcode, newest first. A house can
 * have several over the years; the newest is the current state, and the rest are
 * offered so the owner can pick their own.
 *
 * The register answers 404 for "no certificates for that query" — that is an
 * empty result, not a failure.
 */
export async function searchByPostcode(
  postcode: string,
): Promise<{ ok: true; certificates: EpcCertificateSummary[] } | { ok: false; error: string }> {
  const clean = normalisePostcode(postcode);
  if (!isUkPostcode(clean)) return { ok: false, error: "That doesn’t look like a UK postcode." };

  try {
    const { status, body } = await call(
      `/domestic/search?postcode=${encodeURIComponent(clean)}`,
      AbortSignal.timeout(15000),
    );

    if (status === 404) return { ok: true, certificates: [] };
    if (status !== 200) {
      console.error("[epc] search failed", status);
      return { ok: false, error: "The EPC register could not be reached just now." };
    }

    const rows = dataOf(body);
    if (!Array.isArray(rows)) return { ok: true, certificates: [] };

    const certificates: EpcCertificateSummary[] = rows
      .map((row) => {
        const entry = row as Record<string, unknown>;
        const certificateNumber = textFrom(entry.certificateNumber);
        if (!certificateNumber) return null;
        return {
          certificateNumber,
          addressLine1: textFrom(entry.addressLine1) ?? "",
          postTown: textFrom(entry.postTown) ?? "",
          postcode: textFrom(entry.postcode) ?? clean,
          uprn: textFrom(entry.uprn),
          band: textFrom(entry.currentEnergyEfficiencyBand),
          registeredOn: textFrom(entry.registrationDate),
          schemaType: textFrom(entry.schemaType),
        } satisfies EpcCertificateSummary;
      })
      .filter((entry): entry is EpcCertificateSummary => entry !== null)
      .sort((a, b) => (b.registeredOn ?? "").localeCompare(a.registeredOn ?? ""));

    return { ok: true, certificates };
  } catch (err) {
    console.error("[epc] search error", err instanceof Error ? err.message : err);
    return { ok: false, error: "The EPC register could not be reached just now." };
  }
}

/**
 * The construction age band is a code, not a label ("C", "NR", …). The register
 * publishes the mapping, so we ask it rather than carrying a copy that could go
 * stale — and if it will not resolve, the era stays unrecorded.
 */
async function resolveAgeBand(key: string, schemaType: string | null): Promise<string | null> {
  if (!key || key === "0" || key.toUpperCase() === "NR") return null;
  const schema = schemaType ? `&schemaVersion=${encodeURIComponent(schemaType)}` : "";
  try {
    const { status, body } = await call(
      `/codes/info?code=construction_age_band&key=${encodeURIComponent(key)}${schema}`,
      AbortSignal.timeout(10000),
    );
    if (status !== 200) return null;
    const rows = dataOf(body);
    if (!Array.isArray(rows)) return null;
    for (const row of rows) {
      const values = (row as { values?: unknown }).values;
      if (!Array.isArray(values)) continue;
      for (const value of values) {
        const label = textFrom((value as Record<string, unknown>)?.value);
        if (label) return label;
      }
    }
    return null;
  } catch {
    return null;
  }
}

function joinDescriptions(value: unknown): string | null {
  if (!Array.isArray(value)) {
    const single = (value as Record<string, unknown> | null)?.description;
    return textFrom(single);
  }
  const seen = new Set<string>();
  const parts: string[] = [];
  for (const entry of value) {
    const description = textFrom((entry as Record<string, unknown>)?.description);
    if (!description || seen.has(description)) continue;
    seen.add(description);
    parts.push(description);
  }
  return parts.length > 0 ? parts.join("; ") : null;
}

/** The full certificate, normalised to the six facts the page shows. */
export async function fetchCertificate(
  certificateNumber: string,
): Promise<{ ok: true; facts: EpcFacts } | { ok: false; error: string }> {
  if (!isCertificateNumber(certificateNumber)) {
    return { ok: false, error: "That is not a certificate number." };
  }

  try {
    const { status, body } = await call(
      `/certificate?certificate_number=${encodeURIComponent(certificateNumber)}`,
      AbortSignal.timeout(15000),
    );
    if (status === 404) return { ok: false, error: "That certificate is no longer on the register." };
    if (status !== 200) {
      console.error("[epc] certificate failed", status);
      return { ok: false, error: "The EPC register could not be reached just now." };
    }

    const raw = dataOf(body);
    if (!raw || typeof raw !== "object") {
      return { ok: false, error: "That certificate could not be read." };
    }
    const cert = raw as Record<string, unknown>;

    const schemaType = textFrom(cert.schema_type) ?? textFrom(cert.schemaType);
    const ageCode = textFrom(cert.construction_age_band);
    const buildEra = ageCode ? await resolveAgeBand(ageCode, schemaType) : null;

    const floorArea = (() => {
      const value = cert.total_floor_area;
      const number = typeof value === "number" ? value : Number(textFrom(value) ?? "");
      if (!Number.isFinite(number) || number <= 0) return null;
      return `${Math.round(number)} m²`;
    })();

    const facts: EpcFacts = {
      certificateNumber,
      address: textFrom(cert.address_line_1) ?? "",
      postTown: textFrom(cert.post_town) ?? "",
      postcode: textFrom(cert.postcode) ?? "",
      uprn: textFrom(cert.uprn),
      registeredOn: textFrom(cert.registration_date),
      floorArea,
      epcRating: textFrom(cert.current_energy_efficiency_band),
      walls: joinDescriptions(cert.walls),
      roof: joinDescriptions(cert.roofs),
      windows: textFrom((cert.window as Record<string, unknown> | null)?.description),
      buildEra,
      dwellingType: textFrom(cert.dwelling_type),
      heating: joinDescriptions(cert.main_heating),
    };

    return { ok: true, facts };
  } catch (err) {
    console.error("[epc] certificate error", err instanceof Error ? err.message : err);
    return { ok: false, error: "The EPC register could not be reached just now." };
  }
}

/** "23 February 2026" — how a date is shown on the page, or "" when unknown. */
export function formatRecordedOn(iso: string | null | undefined): string {
  if (!iso) return "";
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso.trim());
  if (!match) return iso.trim();
  const date = new Date(`${match[1]}-${match[2]}-${match[3]}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return iso.trim();
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}
