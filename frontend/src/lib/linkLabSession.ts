import type { BreachDrillOutcome } from "@/lib/breachFromEmail";
import type { ApiChatScenario, ApiEmailScenario, ApiTrainingLink } from "@/lib/simulationClient";

export function snapshotScenarioForLinkLab(
  data: ApiEmailScenario | ApiChatScenario,
): LinkLabScenarioSnapshot {
  if (data.type === "email") {
    return {
      type: "email",
      title: data.title,
      subject: data.subject,
      preview: data.preview,
      body_paragraphs: data.body_paragraphs,
    };
  }
  return {
    type: "chat",
    title: data.title,
    peer_name: data.peer_name,
    peer_handle: data.peer_handle,
    messages: data.messages,
  };
}

const KEY = "cipherline_link_lab_v1";

/** Минимум полей сценария для breachContextFromTrainingLink */
export type LinkLabScenarioSnapshot =
  | Pick<ApiEmailScenario, "type" | "title" | "subject" | "preview" | "body_paragraphs">
  | Pick<ApiChatScenario, "type" | "title" | "peer_name" | "peer_handle" | "messages">;

export type LinkLabSession = {
  scenarioId: string;
  step: number;
  links: ApiTrainingLink[];
  scenario: LinkLabScenarioSnapshot;
  /** Индекс в массиве links последней открытой ссылки */
  openedQueueIndex: number;
  anyUnsafe: boolean;
};

export function clearLinkLabSession(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

export function readLinkLabSession(): LinkLabSession | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as LinkLabSession;
    if (!p?.scenarioId || !Array.isArray(p.links) || !p.scenario?.type) return null;
    return p;
  } catch {
    return null;
  }
}

export function writeLinkLabSession(s: LinkLabSession): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

/** Старт или сброс очереди при загрузке страницы link-lab */
export function initLinkLabSession(
  scenarioId: string,
  step: number,
  links: ApiTrainingLink[],
  scenario: LinkLabScenarioSnapshot,
): void {
  writeLinkLabSession({
    scenarioId,
    step,
    links,
    scenario,
    openedQueueIndex: -1,
    anyUnsafe: false,
  });
}

/** Перед открытием ссылки по индексу в списке */
export function markLinkLabOpened(
  scenarioId: string,
  step: number,
  links: ApiTrainingLink[],
  scenario: LinkLabScenarioSnapshot,
  queueIndex: number,
): void {
  const prev = readLinkLabSession();
  const anyUnsafe =
    prev?.scenarioId === scenarioId && prev.step === step ? Boolean(prev.anyUnsafe) : false;
  writeLinkLabSession({
    scenarioId,
    step,
    links,
    scenario,
    openedQueueIndex: queueIndex,
    anyUnsafe,
  });
}

export function asScenarioForBreach(s: LinkLabScenarioSnapshot): ApiEmailScenario | ApiChatScenario {
  return s as unknown as ApiEmailScenario | ApiChatScenario;
}

/**
 * После шага breach: либо следующая ссылка (breach), либо возврат в сценарий.
 */
export function linkLabAfterBreachExit(
  scenarioId: string,
  outcome: BreachDrillOutcome,
):
  | { kind: "next_breach"; link: ApiTrainingLink; scenarioTitle: string }
  | { kind: "done"; breachDrillOutcome: BreachDrillOutcome }
  | null {
  const sess = readLinkLabSession();
  if (!sess || sess.scenarioId !== scenarioId) return null;

  const anyUnsafe = sess.anyUnsafe || outcome === "unsafe";
  const nextIdx = sess.openedQueueIndex + 1;
  if (nextIdx < sess.links.length) {
    const nextLink = sess.links[nextIdx];
    writeLinkLabSession({
      ...sess,
      openedQueueIndex: nextIdx,
      anyUnsafe,
    });
    return {
      kind: "next_breach",
      link: nextLink,
      scenarioTitle: sess.scenario.title,
    };
  }

  clearLinkLabSession();
  return { kind: "done", breachDrillOutcome: anyUnsafe ? "unsafe" : outcome };
}

/**
 * После закрытия модалки «безопасной» ссылки на link-lab.
 */
export function linkLabAfterSafeModal(
  scenarioId: string,
):
  | { kind: "next_breach"; link: ApiTrainingLink; scenarioTitle: string }
  | { kind: "next_safe_modal"; link: ApiTrainingLink }
  | { kind: "done" }
  | null {
  const sess = readLinkLabSession();
  if (!sess || sess.scenarioId !== scenarioId) return null;

  const nextIdx = sess.openedQueueIndex + 1;
  if (nextIdx >= sess.links.length) {
    clearLinkLabSession();
    return { kind: "done" };
  }

  const nextLink = sess.links[nextIdx];
  writeLinkLabSession({
    ...sess,
    openedQueueIndex: nextIdx,
  });

  if (nextLink.is_phishing) {
    return {
      kind: "next_breach",
      link: nextLink,
      scenarioTitle: sess.scenario.title,
    };
  }
  return { kind: "next_safe_modal", link: nextLink };
}
