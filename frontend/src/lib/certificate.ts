import type { UserState } from "@/types";
import { SIMULATION_SCENARIO_ORDER } from "@/lib/courseScenarios";

const MIN_SUCCESS_PERCENT = 70;

export function certificateEligible(state: UserState): boolean {
  const allDone = SIMULATION_SCENARIO_ORDER.every((id) => state.scenariosCompleted.includes(id));
  if (!allDone) return false;
  if (state.totalAnswers === 0) return false;
  const pct = Math.round((state.totalCorrect / state.totalAnswers) * 100);
  return pct >= MIN_SUCCESS_PERCENT;
}

export function generateCertificateId(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 16);
}

/** Формат ID на бланке и в ссылке /verify/:id (16 hex). */
export function certificateIdLooksValid(id: string): boolean {
  return /^[a-f0-9]{16}$/i.test(id.trim());
}

export function accuracyPercent(state: UserState): number | null {
  if (state.totalAnswers === 0) return null;
  return Math.round((state.totalCorrect / state.totalAnswers) * 100);
}

/** Заголовки завершённых модулей (ключи i18n scenario.module.*). */
export function completedScenarioTitleKeys(state: UserState): string[] {
  return SIMULATION_SCENARIO_ORDER.filter((id) => state.scenariosCompleted.includes(id)).map(
    (id) => `scenario.module.${id}`,
  );
}

export function certificateReconcilePatch(state: UserState): Partial<UserState> | null {
  if (!certificateEligible(state)) return null;
  if (state.certificateUnlocked && state.certificateId && state.certificateIssuedAt) return null;
  if (state.certificateUnlocked && state.certificateId && !state.certificateIssuedAt) {
    return { certificateIssuedAt: new Date().toISOString() };
  }
  const newId = state.certificateId || generateCertificateId();
  const issued = state.certificateIssuedAt || new Date().toISOString();
  return {
    certificateUnlocked: true,
    certificateId: newId,
    certificateIssuedAt: issued,
  };
}

export function certificateVerifyUrl(id: string): string {
  const base =
    typeof window !== "undefined" ? `${window.location.origin}/verify` : "https://example.com/verify";
  return `${base}/${id}`;
}

export function requiredModulesCount(): number {
  return SIMULATION_SCENARIO_ORDER.length;
}
