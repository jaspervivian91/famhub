import { sql, hasDatabaseURL } from "~/db";
import type { Account, Session } from "~/lib/types";

// Dynamic import for bcryptjs — it's a Node-only module and must not be bundled
// into the client bundle. TanStack Start tree-shakes server functions, but
// Rollup still tries to resolve the static import during the client build.
// The dynamic import + build.rollupOptions.external in vite.config.ts
// keeps bcryptjs out of the client bundle.
async function getBcrypt(): Promise<typeof import("bcryptjs")> {
  return import("bcryptjs");
}

const SALT_ROUNDS = 12;
const SESSION_MAX_AGE = 2592000; // 30 days in seconds
export const COOKIE_NAME = "famhub_session";

// ---------------------------------------------------------------------------
// Password hashing
// ---------------------------------------------------------------------------

export async function hashPassword(plain: string): Promise<string> {
  const { hash } = await getBcrypt();
  return hash(plain, SALT_ROUNDS);
}

export async function verifyPassword(
  plain: string,
  hashed: string,
): Promise<boolean> {
  const { compare } = await getBcrypt();
  return compare(plain, hashed);
}

// ---------------------------------------------------------------------------
// Account CRUD
// ---------------------------------------------------------------------------

export async function createAccount(params: {
  email: string;
  passwordHash: string;
  displayName: string;
}): Promise<Account> {
  if (!hasDatabaseURL()) {
    throw new Error("Database is not connected.");
  }
  const db = sql();
  const rows = await db`
    insert into accounts (email, password_hash, display_name)
    values (${params.email.toLowerCase().trim()}, ${params.passwordHash}, ${params.displayName})
    returning id, email, password_hash, display_name, avatar_url, created_at
  `;
  return coerceRow(rows[0] as unknown as Account);
}

export async function getAccountByEmail(
  email: string,
): Promise<Account | null> {
  if (!hasDatabaseURL()) return null;
  const db = sql();
  const rows = await db`
    select id, email, password_hash, display_name, avatar_url, created_at
    from accounts
    where email = ${email.toLowerCase().trim()}
    limit 1
  `;
  if (rows.length === 0) return null;
  return coerceRow(rows[0] as unknown as Account);
}

export async function getAccountById(id: string): Promise<Account | null> {
  if (!hasDatabaseURL()) return null;
  const db = sql();
  const rows = await db`
    select id, email, password_hash, display_name, avatar_url, created_at
    from accounts
    where id = ${id}
    limit 1
  `;
  if (rows.length === 0) return null;
  return coerceRow(rows[0] as unknown as Account);
}

// ---------------------------------------------------------------------------
// Session management
// ---------------------------------------------------------------------------

export async function createSession(accountId: string): Promise<Session> {
  if (!hasDatabaseURL()) {
    throw new Error("Database is not connected.");
  }
  const db = sql();
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE * 1000);
  const rows = await db`
    insert into sessions (account_id, expires_at)
    values (${accountId}, ${expiresAt})
    returning id, account_id, expires_at, created_at
  `;
  return coerceRow(rows[0] as unknown as Session);
}

export async function getSessionById(
  sessionId: string,
): Promise<Session | null> {
  if (!hasDatabaseURL()) return null;
  const db = sql();
  const rows = await db`
    select id, account_id, expires_at, created_at
    from sessions
    where id = ${sessionId}
      and expires_at > now()
    limit 1
  `;
  if (rows.length === 0) return null;
  return coerceRow(rows[0] as unknown as Session);
}

export async function deleteSession(sessionId: string): Promise<void> {
  if (!hasDatabaseURL()) return;
  const db = sql();
  await db`
    delete from sessions where id = ${sessionId}
  `;
}

// ---------------------------------------------------------------------------
// Cookie helpers
// ---------------------------------------------------------------------------

export function sessionCookie(sessionId: string): string {
  return `${COOKIE_NAME}=${sessionId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_MAX_AGE}`;
}

export function clearSessionCookie(): string {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

// ---------------------------------------------------------------------------
// Request helper: extract session cookie
// ---------------------------------------------------------------------------

export function getSessionCookieFromRequest(request: Request): string | null {
  const cookieHeader = request.headers.get("Cookie");
  if (!cookieHeader) return null;

  const cookies = cookieHeader.split(";").map((c) => c.trim());
  for (const cookie of cookies) {
    const [name, value] = cookie.split("=");
    if (name === COOKIE_NAME && value) {
      return decodeURIComponent(value);
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Get current account from request (full auth check)
// ---------------------------------------------------------------------------

export async function getAccountFromRequest(
  request: Request,
): Promise<Account | null> {
  const sessionId = getSessionCookieFromRequest(request);
  if (!sessionId) return null;

  const session = await getSessionById(sessionId);
  if (!session) return null;

  return getAccountById(session.account_id);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function coerceRow<T extends Record<string, unknown>>(row: T): T {
  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(row)) {
    if (val instanceof Date) {
      out[key] = val.toISOString();
    } else if (typeof val === "bigint") {
      out[key] = String(val);
    } else if (val !== null && typeof val === "object") {
      out[key] = coerceRow(val as Record<string, unknown>);
    } else {
      out[key] = val;
    }
  }
  return out as T;
}
