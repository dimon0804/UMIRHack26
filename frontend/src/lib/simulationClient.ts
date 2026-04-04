export type ApiScenarioListItem = {
  id: string;
  type: "email" | "chat" | "wifi" | "terminal" | "action_cards";
  title: string;
};

export type ApiScenarioChoice = { id: string; label: string };

/** Ссылки для отдельной страницы link-lab (смешанные легитимные / учебный фишинг) */
export type ApiTrainingLink = {
  id: string;
  href: string;
  label?: string;
  is_phishing: boolean;
  /** Для link-lab: подмена «темы» на фейковой странице (иначе берётся письмо/чат целиком). */
  breach_subject?: string;
  breach_preview?: string;
};

export type ApiDynamicDifficulty = {
  tier: number;
  skill_score: number;
};

/** Симуляция звонка (vishing): TTS или готовая дорожка + разметка времени */
export type ApiVoiceCall = {
  mode: "tts" | "audio";
  /** Подпись в UI («Входящий звонок») */
  label?: string;
  /** Путь к файлу (например /vishing/track.mp3) при mode=audio */
  audio_src?: string;
  /** Секунды начала реплики i (порядок как у сообщений peer); для синхронной подсветки */
  cues_sec?: number[];
  pause_between_ms?: number;
};

export type ApiScenarioMeta = {
  step: number;
  total_steps: number;
  narrative_arc?: string;
  attack_family?: string;
  /** С simulation-service при LLM-сценарии: адаптация сложности по прогрессу */
  dynamic_difficulty?: ApiDynamicDifficulty;
};

export type ApiEmailScenario = ApiScenarioMeta & {
  id: string;
  type: "email";
  title: string;
  sender_display: string;
  sender_email: string;
  subject: string;
  preview: string;
  body_paragraphs: string[];
  cta_label: string;
  cta_href_display: string;
  training_links?: ApiTrainingLink[];
  choices: ApiScenarioChoice[];
};

export type ApiChatScenario = ApiScenarioMeta & {
  id: string;
  type: "chat";
  title: string;
  peer_name: string;
  peer_handle: string;
  messages: { from: "peer" | "me"; text: string; time: string }[];
  training_links?: ApiTrainingLink[];
  choices: ApiScenarioChoice[];
  voice_call?: ApiVoiceCall;
};

export type ApiWifiNetwork = { ssid: string; secured: boolean; note?: string };

export type ApiWifiScenario = ApiScenarioMeta & {
  id: string;
  type: "wifi";
  title: string;
  context: string;
  networks: ApiWifiNetwork[];
  choices: ApiScenarioChoice[];
};

export type ApiTerminalScenario = ApiScenarioMeta & {
  id: string;
  type: "terminal";
  title: string;
  context: string;
  device_label: string;
  choices: ApiScenarioChoice[];
};

export type ApiActionCard = { id: string; title: string; detail?: string };

export type ApiActionCardsScenario = ApiScenarioMeta & {
  id: string;
  type: "action_cards";
  title: string;
  situation: string;
  cards: ApiActionCard[];
  choices: ApiScenarioChoice[];
};

export type ApiScenarioUnion =
  | ApiEmailScenario
  | ApiChatScenario
  | ApiWifiScenario
  | ApiTerminalScenario
  | ApiActionCardsScenario;

export type SubmitResult = {
  ok: boolean;
  locale?: string;
  error?: string;
  result?: {
    choice_id: string;
    is_safe: boolean;
    severity: "none" | "low" | "medium" | "critical";
    security_delta: number;
    xp_delta: number;
    teach_title: string;
    teach_body: string;
    show_consequences: boolean;
    consequence_steps: { title: string; detail: string }[];
    hint?: string | null;
  };
};

function apiPath(path: string) {
  const base = import.meta.env.VITE_API_URL?.replace(/\/$/, "") ?? "";
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

export async function fetchSimulationScenarioList(
  lang: "ru" | "en",
): Promise<{ scenarios: ApiScenarioListItem[] }> {
  const r = await fetch(apiPath(`/api/v1/simulation/scenarios?lang=${lang}`), {
    cache: "no-store",
    headers: { "Accept-Language": lang },
  });
  if (!r.ok) throw new Error(`scenarios ${r.status}`);
  return r.json() as Promise<{ scenarios: ApiScenarioListItem[] }>;
}

function authHeaders(lang: "ru" | "en", accessToken?: string | null): Record<string, string> {
  const h: Record<string, string> = { "Accept-Language": lang };
  if (accessToken) h.Authorization = `Bearer ${accessToken}`;
  return h;
}

export async function fetchSimulationScenario(
  id: string,
  lang: "ru" | "en",
  step: number,
  accessToken?: string | null,
  /** «Новый вариант ИИ»: бэкенд снова дергает LLM (агрегаты phishing-mail / se-chat). */
  refreshLlm = false,
): Promise<{ scenario: ApiScenarioUnion }> {
  const refreshQ = refreshLlm ? "&refresh=true" : "";
  const r = await fetch(
    apiPath(
      `/api/v1/simulation/scenarios/${encodeURIComponent(id)}?lang=${lang}&step=${step}${refreshQ}`,
    ),
    { cache: "no-store", headers: authHeaders(lang, accessToken) },
  );
  if (!r.ok) throw new Error(`scenario ${r.status}`);
  const data = (await r.json()) as { scenario?: ApiScenarioUnion };
  if (!data.scenario) throw new Error("empty scenario");
  return { scenario: data.scenario };
}

export async function submitSimulationChoice(
  scenarioId: string,
  choiceId: string,
  lang: "ru" | "en",
  step: number,
  accessToken?: string | null,
): Promise<SubmitResult> {
  const r = await fetch(
    apiPath(
      `/api/v1/simulation/scenarios/${encodeURIComponent(scenarioId)}/submit?lang=${lang}`,
    ),
    {
      method: "POST",
      headers: {
        ...authHeaders(lang, accessToken),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ choice_id: choiceId, step }),
    },
  );
  return (await r.json()) as SubmitResult;
}
