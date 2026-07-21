// Client-side state for current member/group tracking and auth cache.
// Uses localStorage so the choice survives refreshes.
//
// With authentication, the session cookie is the source of truth,
// but localStorage caches account + member data so the UI renders
// immediately without a server round-trip on initial mount.

const STORE_KEYS = {
  memberId: "fh_member_id",
  groupId: "fh_group_id",
  memberName: "fh_member_name",
  accountId: "fh_account_id",
  accountEmail: "fh_account_email",
  accountDisplayName: "fh_account_display_name",
} as const;

function isBrowser() {
  return typeof window !== "undefined" && window.localStorage;
}

// ── Family member identity ──────────────────────────────────────

export function getCurrentMemberId(): string | null {
  if (!isBrowser()) return null;
  return localStorage.getItem(STORE_KEYS.memberId);
}

export function getCurrentGroupId(): string | null {
  if (!isBrowser()) return null;
  return localStorage.getItem(STORE_KEYS.groupId);
}

export function getCurrentMemberName(): string | null {
  if (!isBrowser()) return null;
  return localStorage.getItem(STORE_KEYS.memberName);
}

export function setCurrentIdentity(
  memberId: string,
  groupId: string,
  memberName: string,
) {
  if (!isBrowser()) return;
  localStorage.setItem(STORE_KEYS.memberId, memberId);
  localStorage.setItem(STORE_KEYS.groupId, groupId);
  localStorage.setItem(STORE_KEYS.memberName, memberName);
}

export function clearCurrentIdentity() {
  if (!isBrowser()) return;
  localStorage.removeItem(STORE_KEYS.memberId);
  localStorage.removeItem(STORE_KEYS.groupId);
  localStorage.removeItem(STORE_KEYS.memberName);
}

// ── Auth cache (session cookie is source of truth) ──────────────

export function getCachedAccountId(): string | null {
  if (!isBrowser()) return null;
  return localStorage.getItem(STORE_KEYS.accountId);
}

export function getCachedAccountEmail(): string | null {
  if (!isBrowser()) return null;
  return localStorage.getItem(STORE_KEYS.accountEmail);
}

export function getCachedAccountDisplayName(): string | null {
  if (!isBrowser()) return null;
  return localStorage.getItem(STORE_KEYS.accountDisplayName);
}

export function setCachedAccount(
  accountId: string,
  email: string,
  displayName: string,
) {
  if (!isBrowser()) return;
  localStorage.setItem(STORE_KEYS.accountId, accountId);
  localStorage.setItem(STORE_KEYS.accountEmail, email);
  localStorage.setItem(STORE_KEYS.accountDisplayName, displayName);
}

export function clearCachedAccount() {
  if (!isBrowser()) return;
  localStorage.removeItem(STORE_KEYS.accountId);
  localStorage.removeItem(STORE_KEYS.accountEmail);
  localStorage.removeItem(STORE_KEYS.accountDisplayName);
}

/** Clear everything (sign out). */
export function clearAllIdentity() {
  clearCurrentIdentity();
  clearCachedAccount();
}
