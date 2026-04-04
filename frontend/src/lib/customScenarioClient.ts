import { parseGatewayErrorBody } from "@/api/umirGateway";

function apiPath(path: string) {
  const base = import.meta.env.VITE_API_URL?.replace(/\/$/, "") ?? "";
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

export type CustomScenarioListItem = {
  id: string;
  type: "email" | "chat";
  title: string;
  created_at: string;
};

export async function generateAiScenario(
  scenarioType: "email" | "chat",
  locale: "ru" | "en",
): Promise<Record<string, unknown>> {
  const diversity_roll = Math.floor(Math.random() * 1_000_000);
  const r = await fetch(apiPath("/api/v1/ai/generate-scenario"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept-Language": locale,
    },
    body: JSON.stringify({ scenario_type: scenarioType, locale, diversity_roll }),
  });
  const text = await r.text();
  if (!r.ok) throw new Error(parseGatewayErrorBody(text) || `AI ${r.status}`);
  const j = JSON.parse(text) as { scenario?: Record<string, unknown> };
  if (!j.scenario || typeof j.scenario !== "object") throw new Error("empty scenario");
  return j.scenario;
}

export async function saveCustomScenario(
  accessToken: string,
  scenario: Record<string, unknown>,
): Promise<{ id: string; type: string; title: string }> {
  const r = await fetch(apiPath("/api/v1/progress/custom-scenarios"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ scenario }),
  });
  const text = await r.text();
  if (!r.ok) throw new Error(parseGatewayErrorBody(text) || `save ${r.status}`);
  return JSON.parse(text) as { id: string; type: string; title: string };
}

export async function listCustomScenarios(accessToken: string): Promise<CustomScenarioListItem[]> {
  const r = await fetch(apiPath("/api/v1/progress/custom-scenarios"), {
    cache: "no-store",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!r.ok) throw new Error(`list custom ${r.status}`);
  const j = (await r.json()) as { items?: CustomScenarioListItem[] };
  return j.items ?? [];
}

export async function deleteCustomScenario(accessToken: string, scenarioId: string): Promise<void> {
  const r = await fetch(apiPath(`/api/v1/progress/custom-scenarios/${encodeURIComponent(scenarioId)}`), {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!r.ok) throw new Error(`delete ${r.status}`);
}
