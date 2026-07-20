// UI Mode manager for Family Hub — toggles between standard and grandparent mode.
// Persists to localStorage and optionally syncs to member_preferences in the DB.

import { createServerFn } from "@tanstack/react-start";
import { sql, hasDatabaseURL } from "~/db";
import {
  getCurrentMemberId,
  getCurrentGroupId,
  getCurrentMemberName,
} from "~/lib/client-store";
import { getMemberById } from "~/lib/api";

const STORAGE_KEY = "fh_ui_mode";

function isBrowser() {
  return typeof window !== "undefined" && window.localStorage;
}

/** Get the current UI mode, checking localStorage first then DB preferences. */
export function getUIMode(): "standard" | "grandparent" {
  if (!isBrowser()) return "standard";

  // Check localStorage override first (fast path for persistence)
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "grandparent" || stored === "standard") return stored;

  return "standard";
}

/** Set UI mode, persisting to localStorage immediately. */
export function setUIMode(mode: "standard" | "grandparent"): void {
  if (!isBrowser()) return;
  localStorage.setItem(STORAGE_KEY, mode);
}

/** Toggle between standard and grandparent mode. Returns the new mode. */
export function toggleUIMode(): "standard" | "grandparent" {
  const current = getUIMode();
  const next = current === "grandparent" ? "standard" : "grandparent";
  setUIMode(next);
  return next;
}

/**
 * Sync UI mode to the DB (call after setting mode when a member is identified).
 * This is best-effort — it silently fails if no DB is connected.
 */
export const syncUIModeToDB = createServerFn({ method: "POST" })
  .validator((d: { memberId: string; mode: "standard" | "grandparent" }) => d)
  .handler(async ({ data }) => {
    if (!hasDatabaseURL()) {
      return { success: false, reason: "Database not connected." };
    }
    try {
      const db = sql();
      await db`
        update member_preferences
        set ui_mode = ${data.mode}
        where member_id = ${data.memberId}
      `;
      return { success: true };
    } catch {
      return { success: false };
    }
  });

/**
 * Fetch UI mode from DB preferences if available.
 * Used to initialize the mode when a member logs in.
 */
export const fetchUIModeFromDB = createServerFn({ method: "GET" })
  .validator((d: { memberId: string }) => d)
  .handler(async ({ data }) => {
    try {
      const member = await getMemberById({ data: { memberId: data.memberId } });
      const mode = member?.preferences?.ui_mode ?? "standard";
      return { mode };
    } catch {
      return { mode: "standard" as const };
    }
  });
