import { apiUrl } from "@/lib/api";

export type ChatRequestPayload = {
  prompt: string;
  system_prompt?: string;
  temperature?: number;
  max_tokens?: number;
  json_mode?: boolean;
};

export type ChatResponsePayload = {
  content: string;
  model: string;
};

export type LlmConfigPayload = {
  llm_mode: string;
  base_url: string;
  chat_model: string;
  api_key_configured: boolean;
};

export async function fetchLlmConfig(): Promise<LlmConfigPayload> {
  const r = await fetch(apiUrl("/api/v1/ai/llm-config"), { cache: "no-store" });
  if (!r.ok) throw new Error(`llm-config ${r.status}`);
  return r.json() as Promise<LlmConfigPayload>;
}

function formatAiChatError(status: number, raw: string): string {
  try {
    const j = JSON.parse(raw) as { detail?: unknown };
    const d = j.detail;
    if (typeof d === "string") {
      if (status === 401 || d.includes("401") || d.toLowerCase().includes("unauthorized")) {
        return d.includes("Mistral") || d.includes("MISTRAL")
          ? d
          : "401: проверьте MISTRAL_API_KEY в .env и перезапустите контейнер ai-service.";
      }
      return d.length > 600 ? `${d.slice(0, 600)}…` : d;
    }
  } catch {
    /* not JSON */
  }
  if (status === 401) {
    return "401 Unauthorized: неверный или пустой ключ Mistral. Укажите MISTRAL_API_KEY в .env и выполните docker compose up -d --force-recreate ai-service.";
  }
  return raw.slice(0, 500) || `chat ${status}`;
}

export async function postAiChat(body: ChatRequestPayload): Promise<ChatResponsePayload> {
  const r = await fetch(apiUrl("/api/v1/ai/chat"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt: body.prompt,
      system_prompt: body.system_prompt ?? "You are a helpful assistant.",
      temperature: body.temperature ?? 0.25,
      max_tokens: body.max_tokens ?? 600,
      json_mode: body.json_mode ?? false,
    }),
  });
  if (!r.ok) {
    const text = await r.text();
    throw new Error(formatAiChatError(r.status, text));
  }
  return r.json() as Promise<ChatResponsePayload>;
}
