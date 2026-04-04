import type { UserState } from "@/types";
import { apiBaseUrl } from "@/api/client";
import { refreshGatewayAccessToken } from "@/lib/gatewaySession";

const path = "/api/v1/progress/cipherline/state";

function url(): string {
  const base = apiBaseUrl();
  return `${base}${path}`;
}

/** null — нет сохранения (404) или сеть/ответ не подошли; не бросает. */
export async function fetchCipherlineState(
  accessToken: string,
): Promise<UserState | null> {
  let token = accessToken;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(url(), {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 404) return null;
      if (res.status === 401 && attempt === 0) {
        const next = await refreshGatewayAccessToken();
        if (next) {
          token = next;
          continue;
        }
        return null;
      }
      if (!res.ok) return null;
      const data = (await res.json()) as { state?: UserState };
      const state = data.state;
      if (!state || typeof state.login !== "string") return null;
      return state;
    } catch {
      return null;
    }
  }
  return null;
}

/** Сохранить полный UserState на сервер. false = сеть/401/403 — рейтинг в БД не обновится. */
export async function putCipherlineState(
  accessToken: string,
  state: UserState,
): Promise<boolean> {
  let token = accessToken;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(url(), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(state),
      });
      if (res.status === 401 && attempt === 0) {
        const next = await refreshGatewayAccessToken();
        if (next) {
          token = next;
          continue;
        }
      }
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        console.warn("cipherline PUT failed", res.status, text);
        return false;
      }
      return true;
    } catch (e) {
      console.warn("cipherline PUT error", e);
      return false;
    }
  }
  return false;
}
