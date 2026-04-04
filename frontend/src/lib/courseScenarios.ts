/** 5 модулей × 5 уровней; id совпадают с simulation-service. */
export const MODULE_TOTAL_STEPS = 5;

export const SIMULATION_SCENARIO_ORDER = [
  "phishing-mail",
  "se-chat",
  "wifi",
  "skimming",
  "action-choice",
] as const;

export type SimulationScenarioId = (typeof SIMULATION_SCENARIO_ORDER)[number];

export function isSimulationScenarioId(id: string): id is SimulationScenarioId {
  return (SIMULATION_SCENARIO_ORDER as readonly string[]).includes(id);
}

const CUSTOM_SCENARIO_ID_RE = /^cs-(mail|chat)-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Сохранённые AI-кейсы (progress-service + simulation-service). */
export function isCustomSimulationId(id: string): boolean {
  return CUSTOM_SCENARIO_ID_RE.test(id);
}

const VISHING_SCENARIO_IDS = ["vishing-bank", "vishing-it", "vishing-courier"] as const;

export function isVishingSimulationId(id: string): boolean {
  return (VISHING_SCENARIO_IDS as readonly string[]).includes(id);
}

export function isPlayableSimulationId(id: string): boolean {
  return isSimulationScenarioId(id) || isCustomSimulationId(id) || isVishingSimulationId(id);
}
