// Client-side state for current member/group tracking.
// Uses localStorage so the choice survives refreshes.
// This is a lightweight identity marker, not auth — the app
// uses it to know "which family member is using this device."

const STORE_KEYS = {
  memberId: "fh_member_id",
  groupId: "fh_group_id",
  memberName: "fh_member_name",
} as const;

function isBrowser() {
  return typeof window !== "undefined" && window.localStorage;
}

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
