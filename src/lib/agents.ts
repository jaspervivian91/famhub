/**
 * Agent accounts — server only.
 *
 * Passwords are hashed with bcryptjs and never stored, returned or logged in
 * plain text. A session is a random 32-byte token held in an HttpOnly cookie;
 * only its SHA-256 hash is written to the database, so a copy of the table
 * cannot be replayed as a signed-in agent.
 *
 * There is no password-reset email: no transactional email path is wired for
 * agent accounts yet, and the sign-up screen says so plainly rather than
 * promising a reset link that cannot be sent.
 */
import { sql } from "../db";

export type Agent = {
  id: string;
  email: string;
  createdAt: string;
};

export const SESSION_COOKIE = "hs_agent";
export const SESSION_DAYS = 30;
export const MIN_PASSWORD_LENGTH = 10;

/** An email address, trimmed and lowercased — the account's identity. */
export function normaliseEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  if (email.length < 5 || email.length > 254) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return null;
  return email;
}

export async function hashPassword(password: string): Promise<string> {
  const bcrypt = (await import("bcryptjs")).default;
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const bcrypt = (await import("bcryptjs")).default;
  try {
    return await bcrypt.compare(password, hash);
  } catch {
    return false;
  }
}

function randomToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Buffer.from(bytes).toString("base64url");
}

async function hashToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return Buffer.from(new Uint8Array(digest)).toString("hex");
}

function cookieValue(request: Request, name: string): string | null {
  const header = request.headers.get("cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const index = part.indexOf("=");
    if (index === -1) continue;
    if (part.slice(0, index).trim() === name) {
      return part.slice(index + 1).trim() || null;
    }
  }
  return null;
}

function isSecureRequest(request: Request): boolean {
  const proto = request.headers.get("x-forwarded-proto");
  if (proto) return proto.split(",")[0].trim() === "https";
  try {
    return new URL(request.url).protocol === "https:";
  } catch {
    return false;
  }
}

/** The Set-Cookie value for a new session, or for clearing one (token null). */
export function sessionCookie(request: Request, token: string | null): string {
  const maxAge = token ? SESSION_DAYS * 24 * 60 * 60 : 0;
  const parts = [
    `${SESSION_COOKIE}=${token ?? ""}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${maxAge}`,
  ];
  if (isSecureRequest(request)) parts.push("Secure");
  return parts.join("; ");
}

export async function createSession(agentId: string): Promise<string> {
  const token = randomToken();
  const db = sql();
  await db`
    insert into agent_sessions (token_hash, agent_id, expires_at)
    values (${await hashToken(token)}, ${agentId}, now() + interval '30 days')
  `;
  // An old, forgotten session should not live for ever.
  await db`delete from agent_sessions where expires_at < now()`;
  return token;
}

export async function readSession(request: Request): Promise<Agent | null> {
  const token = cookieValue(request, SESSION_COOKIE);
  if (!token) return null;
  const db = sql();
  const rows = (await db`
    select a.id, a.email, a.created_at
    from agent_sessions s
    join agents a on a.id = s.agent_id
    where s.token_hash = ${await hashToken(token)} and s.expires_at > now()
    limit 1
  `) as unknown as { id: string; email: string; created_at: unknown }[];
  if (rows.length === 0) return null;
  return {
    id: String(rows[0].id),
    email: rows[0].email,
    createdAt: String(rows[0].created_at),
  };
}

export async function destroySession(request: Request): Promise<void> {
  const token = cookieValue(request, SESSION_COOKIE);
  if (!token) return;
  const db = sql();
  await db`delete from agent_sessions where token_hash = ${await hashToken(token)}`;
}

/** The client address, for rate limiting only. Never stored against an agent. */
export function clientAddress(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}
