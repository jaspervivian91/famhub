import { createServerFn } from "@tanstack/react-start";
import { setCookie } from "@tanstack/start-server-core/request-response";
import {
  hashPassword,
  verifyPassword,
  createAccount,
  getAccountByEmail,
  createSession,
  deleteSession,
  COOKIE_NAME,
  getSessionCookieFromRequest,
  getAccountFromRequest,
} from "~/lib/auth";
import type { AccountPublic } from "~/lib/types";

/** Convert account to public-safe shape (no password_hash). */
function toPublic(account: {
  id: string;
  email: string;
  display_name: string;
  avatar_url: string | null;
  created_at: string;
}): AccountPublic {
  return {
    id: account.id,
    email: account.email,
    display_name: account.display_name,
    avatar_url: account.avatar_url,
    created_at: account.created_at,
  };
}

// ---------------------------------------------------------------------------
// signUp
// ---------------------------------------------------------------------------

export const signUp = createServerFn({ method: "POST" })
  .validator(
    (d: { email: string; password: string; displayName: string }) => d,
  )
  .handler(async ({ data }) => {
    const { email, password, displayName } = data;

    // Validate
    if (!email || !email.includes("@")) {
      throw new Error("Valid email is required.");
    }
    if (!password || password.length < 8) {
      throw new Error("Password must be at least 8 characters.");
    }
    if (!displayName || displayName.trim().length === 0) {
      throw new Error("Display name is required.");
    }

    // Check for existing account
    const existing = await getAccountByEmail(email);
    if (existing) {
      throw new Error("An account with this email already exists.");
    }

    // Hash password and create account
    const passwordHash = await hashPassword(password);
    const account = await createAccount({
      email,
      passwordHash,
      displayName: displayName.trim(),
    });

    // Create session
    const session = await createSession(account.id);

    // Set cookie via framework utility
    setCookie(COOKIE_NAME, session.id, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 2592000,
      path: "/",
    });

    return toPublic(account);
  });

// ---------------------------------------------------------------------------
// signIn
// ---------------------------------------------------------------------------

export const signIn = createServerFn({ method: "POST" })
  .validator((d: { email: string; password: string }) => d)
  .handler(async ({ data }) => {
    const { email, password } = data;

    if (!email || !password) {
      throw new Error("Email and password are required.");
    }

    const account = await getAccountByEmail(email);
    if (!account) {
      throw new Error("Invalid email or password.");
    }

    const valid = await verifyPassword(password, account.password_hash);
    if (!valid) {
      throw new Error("Invalid email or password.");
    }

    // Create session
    const session = await createSession(account.id);

    // Set cookie via framework utility
    setCookie(COOKIE_NAME, session.id, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 2592000,
      path: "/",
    });

    return toPublic(account);
  });

// ---------------------------------------------------------------------------
// signOut
// ---------------------------------------------------------------------------

export const signOut = createServerFn({ method: "POST" })
  .handler(async () => {
    setCookie(COOKIE_NAME, "", {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 0,
      path: "/",
    });
    return { success: true };
  });

// ---------------------------------------------------------------------------
// getMe — get current account from session cookie
// ---------------------------------------------------------------------------

export const getMe = createServerFn({ method: "GET" })
  .handler(async ({ request }): Promise<AccountPublic | null> => {
    if (!request) return null;

    const account = await getAccountFromRequest(request);
    if (!account) return null;

    // If we have a valid session, refresh the cookie expiry
    const sessionId = getSessionCookieFromRequest(request);
    if (sessionId) {
      setCookie(COOKIE_NAME, sessionId, {
        httpOnly: true,
        sameSite: "lax",
        maxAge: 2592000,
        path: "/",
      });
    }

    return toPublic(account);
  });