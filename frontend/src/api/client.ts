function trimApiBase(): string {
  const u = import.meta.env.VITE_API_URL;
  if (typeof u === "string" && u.trim() !== "") return u.replace(/\/$/, "");
  return "";
}

/** Пустая строка = относительные URL (nginx проксирует /api на gateway). */
export function apiBaseUrl(): string {
  return trimApiBase();
}

export function useRealApi(): boolean {
  return (
    import.meta.env.VITE_USE_GATEWAY === "true" || Boolean(trimApiBase())
  );
}

async function request<T>(
  path: string,
  options: RequestInit & { parseJson?: boolean } = {},
): Promise<T> {
  const { parseJson = true, ...init } = options;
  const base = trimApiBase();
  const url = `${base}${path.startsWith("/") ? path : `/${path}`}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText || "Ошибка сети");
  }
  if (!parseJson) return undefined as T;
  return (await res.json()) as T;
}

export const api = {
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body) }),
  get: <T>(path: string) => request<T>(path, { method: "GET" }),
};
