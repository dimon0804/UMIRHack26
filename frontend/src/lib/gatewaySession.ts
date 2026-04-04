import { umirRefresh } from "@/api/umirGateway";

export const GATEWAY_SESSION_KEY = "cg_session_v1";

export type GatewaySessionPayload = {
  login: string;
  accessToken: string;
  refreshToken?: string;
};

/** Сырой объект из sessionStorage (демо: только login; gateway: access + refresh). */
export type StoredSessionPayload = {
  login: string;
  accessToken?: string;
  refreshToken?: string;
};

let onAccessTokenRotated: ((access: string) => void) | null = null;

/** AppProvider подписывается, чтобы синхронизировать React state после silent refresh. */
export function setGatewayAccessTokenListener(cb: ((access: string) => void) | null): void {
  onAccessTokenRotated = cb;
}

export function parseStoredSession(): StoredSessionPayload | null {
  try {
    const raw = sessionStorage.getItem(GATEWAY_SESSION_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as Partial<StoredSessionPayload>;
    if (!p.login) return null;
    return {
      login: String(p.login),
      accessToken: p.accessToken ? String(p.accessToken) : undefined,
      refreshToken: p.refreshToken ? String(p.refreshToken) : undefined,
    };
  } catch {
    return null;
  }
}

/** Только полная gateway-сессия (нужна для refresh). */
export function readGatewaySession(): GatewaySessionPayload | null {
  const p = parseStoredSession();
  if (!p?.accessToken) return null;
  return {
    login: p.login,
    accessToken: p.accessToken,
    refreshToken: p.refreshToken,
  };
}

export function writeGatewaySession(payload: GatewaySessionPayload): void {
  sessionStorage.setItem(GATEWAY_SESSION_KEY, JSON.stringify(payload));
}

export function clearGatewaySession(): void {
  sessionStorage.removeItem(GATEWAY_SESSION_KEY);
}

/** POST /auth/refresh, обновляет sessionStorage и уведомляет слушателя. null = нет refresh или ошибка. */
export async function refreshGatewayAccessToken(): Promise<string | null> {
  const cur = readGatewaySession();
  if (!cur?.refreshToken) return null;
  try {
    const pair = await umirRefresh(cur.refreshToken);
    writeGatewaySession({
      login: cur.login,
      accessToken: pair.access_token,
      refreshToken: pair.refresh_token,
    });
    onAccessTokenRotated?.(pair.access_token);
    return pair.access_token;
  } catch {
    return null;
  }
}
