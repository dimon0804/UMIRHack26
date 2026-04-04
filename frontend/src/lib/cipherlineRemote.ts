import type { UserState } from "@/types";
import { apiBaseUrl } from "@/api/client";

const path = "/api/v1/progress/cipherline/state";

function url(): string {
  const base = apiBaseUrl();
  return `${base}${path}`;
}

/** null — нет сохранения (404) или сеть/ответ не подошли; не бросает. */
export async function fetchCipherlineState(
  accessToken: string,
): Promise<UserState | null> {
  try {
    const res = await fetch(url(), {
      method: "GET",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (res.status === 404) return null;
    if (!res.ok) return null;
    const data = (await res.json()) as { state?: UserState };
    const state = data.state;
    if (!state || typeof state.login !== "string") return null;
    return state;
  } catch {
    return null;
  }
}

/** Сохранить полный UserState на сервер; ошибки только в консоль. */
export async function putCipherlineState(
  accessToken: string,
  state: UserState,
): Promise<void> {
  try {
    const res = await fetch(url(), {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(state),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.warn("cipherline PUT failed", res.status, text);
    }
  } catch (e) {
    console.warn("cipherline PUT error", e);
  }
}
