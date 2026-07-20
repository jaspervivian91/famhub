import { neon } from "@neondatabase/serverless";

/**
 * Server-only handle to the team's database (Neon serverless Postgres over HTTP).
 * The connection string comes from `DATABASE_URL`, which the owner connects via
 * the database card and which is injected into the sandbox and passed to the live
 * host on publish. Resolved lazily (per call, not at module load) so the site
 * still builds and serves before a database is connected — the error only
 * surfaces if a query actually runs without `DATABASE_URL`.
 *
 * Use it only inside a `createServerFn()` handler or an `src/routes/api/*` route
 * (never client code):
 *
 *   const getPosts = createServerFn().handler(async () => {
 *     const rows = await sql()`select id, title, created_at from posts`;
 *     // Coerce non-primitive columns (timestamps are JS Dates) to strings before
 *     // returning to the client, or React will refuse to render them:
 *     return rows.map((r) => ({ ...r, created_at: String(r.created_at) }));
 *   });
 */
export const sql = () => {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set — connect a database (via the database card) before running queries.",
    );
  }
  return neon(url);
};

/**
 * Check whether DATABASE_URL is configured. Does NOT attempt a connection —
 * only checks that the environment variable is present. Use this to decide
 * whether the app should operate in live or fallback mode.
 */
export function hasDatabaseURL(): boolean {
  return typeof process.env.DATABASE_URL === "string" && process.env.DATABASE_URL.length > 0;
}

/**
 * Lightweight connectivity check — attempts a simple query against the database.
 * Returns { ok: true } if the DB is reachable and the schema is present,
 * or { ok: false, error: string } with a diagnostic message.
 */
export async function checkDatabaseConnection(): Promise<{ ok: boolean; error?: string }> {
  if (!hasDatabaseURL()) {
    return { ok: false, error: "DATABASE_URL not set — app is running in fallback mode with mock data." };
  }
  try {
    const db = sql();
    // Verify we can query and that the core table exists
    await db`select 1 from family_groups limit 0`;
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("relation") && msg.includes("does not exist")) {
      return { ok: false, error: "Database is reachable but schema has not been applied. Run `bun run db:migrate`." };
    }
    return { ok: false, error: `Database connection failed: ${msg}` };
  }
}
