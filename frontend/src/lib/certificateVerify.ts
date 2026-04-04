import { apiBaseUrl } from "@/api/client";

export type CertificateVerifyOk = {
  valid: true;
  certificate_id: string;
  holder_login: string;
  issued_at: string | null;
  course_title: string;
  accuracy_percent: number | null;
  xp: number;
};

export type CertificateVerifyFail = {
  valid: false;
  error: "invalid_id" | "not_found";
};

export type CertificateVerifyResponse = CertificateVerifyOk | CertificateVerifyFail;

/** Публичный запрос к progress-service (без JWT). */
export async function fetchCertificateVerify(
  certificateId: string,
  lang: "ru" | "en",
): Promise<CertificateVerifyResponse | null> {
  const base = apiBaseUrl();
  const url = `${base}/api/v1/progress/cipherline/certificate/verify/${encodeURIComponent(certificateId)}?lang=${lang}`;
  try {
    const r = await fetch(url, { cache: "no-store" });
    if (!r.ok) return null;
    const data = (await r.json()) as Record<string, unknown>;
    if (data.valid === true) {
      return {
        valid: true,
        certificate_id: String(data.certificate_id ?? certificateId),
        holder_login: String(data.holder_login ?? ""),
        issued_at: typeof data.issued_at === "string" ? data.issued_at : null,
        course_title: String(data.course_title ?? ""),
        accuracy_percent: typeof data.accuracy_percent === "number" ? data.accuracy_percent : null,
        xp: typeof data.xp === "number" ? data.xp : Number(data.xp) || 0,
      };
    }
    if (data.valid === false && (data.error === "invalid_id" || data.error === "not_found")) {
      return { valid: false, error: data.error };
    }
    return null;
  } catch {
    return null;
  }
}
