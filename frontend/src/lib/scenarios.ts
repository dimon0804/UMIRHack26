import type { ScenarioMeta } from "@/types";
import office from "@/data/scenarios/office.json";
import home from "@/data/scenarios/home.json";
import wifi from "@/data/scenarios/wifi.json";

const raw = [office, home, wifi] as unknown as ScenarioMeta[];

export const SCENARIO_ORDER = raw.map((s) => s.id);

export function getAllScenarios(): ScenarioMeta[] {
  return raw;
}

export function getScenarioById(id: string): ScenarioMeta | undefined {
  return raw.find((s) => s.id === id);
}
