import { apiBaseUrl } from "@/api/client";

type Detail = {
  message?: string;
  messages?: { ru?: string; en?: string };
};

export function parseGatewayErrorBody(raw: string): string {
  try {
    const j = JSON.parse(raw) as { detail?: string | Detail | Detail[] };
    const d = j.detail;
    if (typeof d === "string") return d.length > 400 ? `${d.slice(0, 400)}…` : d;
    if (d && typeof d === "object" && !Array.isArray(d)) {
      const o = d as Detail;
      if (o.message) return o.message;
      if (o.messages?.ru) return o.messages.ru;
      if (o.messages?.en) return o.messages.en;
    }
    if (Array.isArray(d) && d[0] && typeof d[0] === "object" && "msg" in d[0]) {
      return String((d[0] as { msg?: string }).msg ?? raw);
    }
  } catch {
    /* not JSON */
  }
  return raw.slice(0, 400) || "Ошибка запроса";
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const base = apiBaseUrl();
  const url = `${base}${path.startsWith("/") ? path : `/${path}`}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Accept-Language": "ru" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(parseGatewayErrorBody(text) || res.statusText);
  }
  return (await res.json()) as T;
}

export type TokenPair = {
  access_token: string;
  refresh_token: string;
  token_type: string;
};

export async function umirLogin(email: string, password: string): Promise<TokenPair> {
  return postJson<TokenPair>("/api/v1/auth/login", { email, password });
}

export async function umirRegister(
  email: string,
  password: string,
  locale: "ru" | "en" = "ru",
): Promise<TokenPair> {
  return postJson<TokenPair>("/api/v1/auth/register", { email, password, locale });
}

export async function umirRefresh(refreshToken: string): Promise<TokenPair> {
  return postJson<TokenPair>("/api/v1/auth/refresh", { refresh_token: refreshToken });
}
