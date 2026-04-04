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
