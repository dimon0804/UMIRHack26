const STORAGE_USERS = "cg_users_v1";

export type StoredUserRow = { password: string; state: import("@/types").UserState };

export function loadUsers(): Record<string, StoredUserRow> {
  try {
    const raw = localStorage.getItem(STORAGE_USERS);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, StoredUserRow>;
  } catch {
    return {};
  }
}

export function saveUsers(u: Record<string, StoredUserRow>) {
  localStorage.setItem(STORAGE_USERS, JSON.stringify(u));
}
