import type { ApiChatScenario, ApiEmailScenario, ApiScenarioUnion, ApiTrainingLink } from "@/lib/simulationClient";

/** Исход учебной цепочки по ссылке (возврат на экран сценария) */
export type BreachDrillOutcome = "safe" | "unsafe";

/** Источник учебной цепочки по ссылке */
export type BreachScenarioSource = "email" | "chat";

/** Сообщения для учебного макета мессенджера (чат) */
export type BreachChatMessageUi = { from: "peer" | "me"; text: string; time?: string };

/** Контекст для подстройки фейковой страницы (письмо или чат) */
export type BreachScenarioContext = {
  source: BreachScenarioSource;
  subject: string;
  preview: string;
  ctaLabel: string;
  /** Только для source=chat: переписка в отдельном окне */
  chatMessages?: BreachChatMessageUi[];
  chatPeerName?: string;
  chatPeerHandle?: string;
};

/** @deprecated используйте BreachScenarioContext */
export type BreachEmailContext = BreachScenarioContext;

export type BreachPageKind = "payment" | "account" | "track" | "wifi" | "generic";

const URL_IN_TEXT = /https?:\/\/[^\s)<>"']+/gi;

/**
 * Первый URL из списка строк (например сообщений собеседника в чате).
 */
export function extractUrlFromTexts(texts: string[]): string | null {
  for (const raw of texts) {
    const m = raw.match(URL_IN_TEXT);
    if (m?.[0]) {
      return m[0].replace(/[.,;:!?)]+$/, "");
    }
  }
  return null;
}

/**
 * Грубая классификация по тексту (RU/EN), чтобы форма совпадала с темой.
 */
export function inferBreachPageKind(ctx: Pick<BreachScenarioContext, "subject" | "preview" | "ctaLabel">): BreachPageKind {
  const blob = `${ctx.subject}\n${ctx.preview}\n${ctx.ctaLabel}`;
  if (/(оплат|платеж|платёж|тамож|сбор|сч[её]т|invoice|payment|pay\s|fee|карт[аы]|card|cvv|iban|перевод|customs|duty)/i.test(blob)) {
    return "payment";
  }
  if (/(wi-?fi|вай-?фай|сет[ьи]\s|router|роутер|hotspot|ssid)/i.test(blob)) {
    return "wifi";
  }
  if (/(вход|уч[её]тн|аккаунт|блокиров|парол|логин|sign[\s-]*in|password|verify\s*account|2fa|mfa|session|корпоративн)/i.test(blob)) {
    return "account";
  }
  if (/(отслеж|трек|track|доставк|package|посылк|заказ|ship|delivery|tracking|отправлен)/i.test(blob)) {
    return "track";
  }
  return "generic";
}

export function truncateUi(s: string, max: number): string {
  const x = s.trim();
  if (x.length <= max) return x;
  return `${x.slice(0, Math.max(0, max - 1))}…`;
}

/**
 * Контекст для /breach при открытии ссылки из link-lab (на базе текущего письма или чата).
 */
export function breachContextFromTrainingLink(
  data: ApiEmailScenario | ApiChatScenario,
  link: ApiTrainingLink,
): BreachScenarioContext {
  const cta = (link.label?.trim() || truncateUi(link.href.replace(/^https?:\/\//i, ""), 48)).trim();
  const subjOverride = link.breach_subject?.trim();
  const prevOverride = link.breach_preview?.trim();

  if (data.type === "email") {
    const basePreview = [data.preview, ...data.body_paragraphs].join("\n").slice(0, 1200);
    const preview = prevOverride
      ? `${prevOverride}\n\n—\n${basePreview}`.slice(0, 1200)
      : basePreview;
    return {
      source: "email",
      subject: subjOverride || data.subject,
      preview,
      ctaLabel: cta,
    };
  }
  const peerLines = data.messages.filter((m) => m.from === "peer").map((m) => m.text);
  const lastPeer = peerLines[peerLines.length - 1] ?? "";
  const basePreview = peerLines.join("\n").slice(0, 600);
  const preview = prevOverride ? `${prevOverride}\n\n—\n${basePreview}`.slice(0, 600) : basePreview;
  const defaultSubject = `${data.peer_name} — ${truncateUi(lastPeer || data.title, 56)}`;
  return {
    source: "chat",
    subject: subjOverride || defaultSubject,
    preview,
    ctaLabel: cta,
    chatPeerName: data.peer_name,
    chatPeerHandle: data.peer_handle,
    chatMessages: data.messages.map((m) => ({ from: m.from, text: m.text, time: m.time })),
  };
}

/** Ссылки для страницы link-lab из ответа API (если есть). */
export function getTrainingLinksFromScenario(data: ApiScenarioUnion): ApiTrainingLink[] | null {
  if (data.type === "email") {
    const links = (data as ApiEmailScenario).training_links;
    return links?.length ? links : null;
  }
  if (data.type === "chat") {
    const links = (data as ApiChatScenario).training_links;
    return links?.length ? links : null;
  }
  return null;
}

/** Перемешивание порядка ссылок (детерминированно по id сценария и шага). */
export function shuffleTrainingLinks<T>(items: T[], seed: string): T[] {
  const arr = [...items];
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  for (let i = arr.length - 1; i > 0; i--) {
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    const j = Math.abs(h) % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Ветка «лога взлома» в IntrusionTheater */
export type IntrusionLogFlavor = "credentials" | "permission";

const KIND_SUFFIX: Record<BreachPageKind, string> = {
  account: "Acc",
  payment: "Pay",
  track: "Trk",
  wifi: "Wifi",
  generic: "Gen",
};

export function intrusionLogLineKeys(pageKind: BreachPageKind, flavor: IntrusionLogFlavor): string[] {
  const suf = KIND_SUFFIX[pageKind];
  const base = flavor === "permission" ? "theater.hackPerm" : "theater.hack";
  return [1, 2, 3, 4, 5, 6].map((n) => `${base}${suf}${n}`);
}

export function intrusionProgressLabelKeys(
  pageKind: BreachPageKind,
  flavor: IntrusionLogFlavor,
): [string, string, string] {
  const suf = KIND_SUFFIX[pageKind];
  if (flavor === "permission") {
    return [`theater.progPerm${suf}A`, `theater.progPerm${suf}B`, `theater.progPerm${suf}C`];
  }
  return [`theater.prog${suf}A`, `theater.prog${suf}B`, `theater.prog${suf}C`];
}

export function intrusionLinkDemoAlertKeys(
  pageKind: BreachPageKind,
  flavor: IntrusionLogFlavor,
): { title: string; body: string } {
  const suf = KIND_SUFFIX[pageKind];
  if (flavor === "permission") {
    return { title: `theater.linkDemoTitlePerm${suf}`, body: `theater.linkDemoBodyPerm${suf}` };
  }
  return { title: `theater.linkDemoTitle${suf}`, body: `theater.linkDemoBody${suf}` };
}

export function intrusionConsequenceAlertKeys(pageKind: BreachPageKind): { title: string; body: string } {
  const suf = KIND_SUFFIX[pageKind];
  return { title: `theater.alertTitle${suf}`, body: `theater.alertBody${suf}` };
}

/**
 * Классификация для театра «взлома» по данным шага симуляции (email / chat).
 */
export function inferIntrusionPageKindFromScenario(data: ApiScenarioUnion): BreachPageKind {
  if (data.type === "email") {
    const e = data as ApiEmailScenario;
    const blobPreview = [e.preview, ...e.body_paragraphs].join("\n").slice(0, 1200);
    return inferBreachPageKind({
      subject: e.subject,
      preview: blobPreview,
      ctaLabel: e.cta_label,
    });
  }
  if (data.type === "chat") {
    const c = data as ApiChatScenario;
    const peerLines = c.messages.filter((m) => m.from === "peer").map((m) => m.text);
    const extracted = extractUrlFromTexts(peerLines);
    const preview = peerLines.join("\n").slice(0, 600);
    const subject = `${c.peer_name} — ${truncateUi(peerLines[peerLines.length - 1] ?? c.title, 56)}`;
    const ctaLabel = extracted ? truncateUi(extracted.replace(/^https?:\/\//i, ""), 44) : "";
    return inferBreachPageKind({ subject, preview, ctaLabel });
  }
  return "generic";
}
