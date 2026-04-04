import type { UserState } from "@/types";

const PREFIX = "cg_cipherline_game_v1";

function key(login: string) {
  return `${PREFIX}:${login.toLowerCase()}`;
}

export function loadCipherlineGameState(login: string): UserState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(key(login));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as UserState;
    if (parsed.login !== login) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveCipherlineGameState(login: string, state: UserState) {
  if (typeof window === "undefined") return;
  if (state.login !== login) return;
  localStorage.setItem(key(login), JSON.stringify(state));
}
