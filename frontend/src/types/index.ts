export type ScenarioUiType = "messenger" | "email" | "phone" | "wifi";

export interface ScenarioChoice {
  id: string;
  text: string;
  correct: boolean;
  /** Показывается при правильном выборе */
  safeExplanation: string;
  /** Показывается при неправильном + в блоке ошибок */
  unsafeExplanation: string;
  attackType: string;
  hint?: string;
}

export interface ScenarioStep {
  id: string;
  title?: string;
  narrative: string;
  uiType: ScenarioUiType;
  /** Короткий текст для имитации UI (от кого письмо и т.д.) */
  uiMeta?: Record<string, string>;
  choices: ScenarioChoice[];
}

export interface ScenarioMeta {
  id: string;
  title: string;
  shortDescription: string;
  icon: string;
  steps: ScenarioStep[];
}

export type ScenarioStatus = "locked" | "available" | "completed";

export interface UserProgress {
  scenarioId: string;
  currentStep: number;
  completed: boolean;
  lastPlayedAt?: string;
}

export interface HistoryEntry {
  id: string;
  date: string;
  scenarioId: string;
  scenarioTitle: string;
  stepLabel: string;
  correct: boolean;
  attackType?: string;
}

export interface UserState {
  login: string;
  hp: number;
  xp: number;
  league: string;
  totalCorrect: number;
  totalAnswers: number;
  totalMistakes: number;
  scenariosCompleted: string[];
  progress: Record<string, UserProgress>;
  history: HistoryEntry[];
  mistakeByType: Record<string, number>;
  certificateId?: string;
  /** ISO-8601, выставляется при первой выдаче сертификата (для реестра /verify). */
  certificateIssuedAt?: string;
  certificateUnlocked: boolean;
}

export interface AuthUser {
  login: string;
  token?: string;
}
