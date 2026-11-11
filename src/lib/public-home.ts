import { createServerFn } from "@tanstack/react-start";

/**
 * What a visitor at the front door sees.
 *
 * Only a published home is reachable, and only by its public id — the owner's
 * private id is never part of a public URL. Blank fields are dropped here (null)
 * so the page can omit a section rather than print "not yet on record": that
 * phrasing belongs to the editor, not to the plaque.
 */
export type PublicHome = {
  publicId: string;
  address: string;
  story: string | null;
  buildEra: string | null;
  epcRating: string | null;
  floorArea: string | null;
  wallType: string | null;
  roofType: string | null;
  windowType: string | null;
  /** The certificate's registration date, and which fields are still its own. */
  epcRecordedOn: string | null;
  epcFields: string[];
  lastSalePrice: string | null;
  lastSaleDate: string | null;
  previousOwners: string | null;
  keyDates: { date: string; label: string }[];
  hiddenGems: string[];
  photos: { id: string; url: string; width: number | null; height: number | null }[];
  publishedAt: string | null;
  aiConnected: boolean;
};

export type PublicHomeResult =
  | { found: true; home: PublicHome }
  | { found: false };

function text(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export const getPublicHome = createServerFn({ method: "GET" })
  .inputValidator((input: { publicId: string }) => ({
    publicId: String(input?.publicId ?? "").slice(0, 40),
  }))
  .handler(async ({ data }): Promise<PublicHomeResult> => {
    if (!/^[a-z0-9]{6,40}$/.test(data.publicId)) return { found: false };

    // Dynamic import so the database driver never reaches the client bundle.
    const { sql } = await import("../db");
    const db = sql();

    const rows = (await db`
      select public_id, address, story, build_era, epc_rating, floor_area, wall_type,
             roof_type, window_type, epc_certificate_date, epc_fields,
             last_sale_price, last_sale_date, previous_owners, key_dates, hidden_gems,
             published_at
      from homes
      where public_id = ${data.publicId} and status = 'published'
      limit 1
    `) as unknown as {
      public_id: string;
      address: string;
      story: string | null;
      build_era: string | null;
      epc_rating: string | null;
      floor_area: string | null;
      wall_type: string | null;
      roof_type: string | null;
      window_type: string | null;
      epc_certificate_date: string | null;
      epc_fields: unknown;
      last_sale_price: string | null;
      last_sale_date: string | null;
      previous_owners: string | null;
      key_dates: unknown;
      hidden_gems: unknown;
      published_at: unknown;
    }[];

    if (rows.length === 0) return { found: false };
    const row = rows[0];

    const photos = (await db`
      select id, width, height from home_photos
      where home_id = (select id from homes where public_id = ${data.publicId})
      order by position asc, created_at asc
    `) as unknown as { id: string; width: number | null; height: number | null }[];

    const keyDates = Array.isArray(row.key_dates)
      ? (row.key_dates as { date?: unknown; label?: unknown }[])
          .map((entry) => ({
            date: text(entry?.date) ?? "",
            label: text(entry?.label) ?? "",
          }))
          .filter((entry) => entry.date || entry.label)
      : [];

    const hiddenGems = Array.isArray(row.hidden_gems)
      ? (row.hidden_gems as unknown[]).map(text).filter((gem): gem is string => gem !== null)
      : [];

    const epcFields = Array.isArray(row.epc_fields)
      ? (row.epc_fields as unknown[])
          .map(text)
          .filter((key): key is string => key !== null)
      : [];

    return {
      found: true,
      home: {
        publicId: String(row.public_id),
        address: row.address,
        story: text(row.story),
        buildEra: text(row.build_era),
        epcRating: text(row.epc_rating),
        floorArea: text(row.floor_area),
        wallType: text(row.wall_type),
        roofType: text(row.roof_type),
        windowType: text(row.window_type),
        epcRecordedOn: epcFields.length > 0 ? text(row.epc_certificate_date) : null,
        epcFields,
        lastSalePrice: text(row.last_sale_price),
        lastSaleDate: text(row.last_sale_date),
        previousOwners: text(row.previous_owners),
        keyDates,
        hiddenGems,
        photos: photos.map((photo) => ({
          id: String(photo.id),
          url: `/photos/${photo.id}`,
          width: photo.width,
          height: photo.height,
        })),
        publishedAt: row.published_at ? String(row.published_at) : null,
        aiConnected: Boolean(process.env.ANTHROPIC_API_KEY),
      },
    };
  });
