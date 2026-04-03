const base = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export function apiUrl(path: string) {
  return `${base.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
}

export type TokenPair = {
  access_token: string;
  refresh_token: string;
  token_type: string;
};

export type ApiErrorDetail = {
  code?: string;
  message?: string;
  messages?: { ru?: string; en?: string };
  detail?: string | ApiErrorDetail | ApiErrorDetail[];
};

async function parseError(res: Response, locale: "ru" | "en"): Promise<string> {
  try {
    const data = (await res.json()) as ApiErrorDetail;
    if (typeof data.detail === "object" && data.detail !== null && !Array.isArray(data.detail)) {
      const d = data.detail as ApiErrorDetail;
      if (d.message) return d.message;
      if (d.messages) return locale === "en" ? (d.messages.en ?? d.messages.ru ?? "") : (d.messages.ru ?? d.messages.en ?? "");
    }
    if (Array.isArray(data.detail)) {
      const first = data.detail[0] as { msg?: string } | undefined;
      return first?.msg ?? res.statusText;
    }
    if (typeof data.detail === "string") return data.detail;
  } catch {
    /* ignore */
  }
  return res.statusText;
}

export async function postJson<T>(
  path: string,
  body: unknown,
  locale: "ru" | "en",
): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  const res = await fetch(apiUrl(path), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept-Language": locale === "en" ? "en" : "ru",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    return { ok: false, error: await parseError(res, locale) };
  }
  return { ok: true, data: (await res.json()) as T };
}

export async function getJson<T>(
  path: string,
  token: string,
  locale: "ru" | "en",
): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  const res = await fetch(apiUrl(path), {
    headers: {
      Authorization: `Bearer ${token}`,
      "Accept-Language": locale === "en" ? "en" : "ru",
    },
  });
  if (!res.ok) {
    return { ok: false, error: await parseError(res, locale) };
  }
  return { ok: true, data: (await res.json()) as T };
}
