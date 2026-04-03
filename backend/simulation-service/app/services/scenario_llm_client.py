import logging
import random

import httpx

from app.core.config import settings

log = logging.getLogger(__name__)


async def fetch_llm_scenario(
    *,
    aggregate_id: str,
    scenario_type: str,
    locale: str,
) -> dict | None:
    """
    Запрос к ai-service /generate-scenario. Возвращает dict сценария (без id) или None при ошибке.
    aggregate_id — phishing-mail | se-chat (для логов).
    """
    base = settings.ai_service_url.strip().rstrip("/")
    if not base or not settings.simulation_llm_scenarios:
        return None

    url = f"{base}/generate-scenario"
    payload = {
        "scenario_type": scenario_type,
        "locale": locale if locale in ("ru", "en") else "ru",
        "diversity_roll": random.randint(0, 999_999),
    }

    timeout = httpx.Timeout(connect=10.0, read=90.0, write=10.0, pool=10.0)
    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            r = await client.post(url, json=payload)
    except httpx.RequestError as exc:
        log.warning("LLM scenario unreachable %s: %s", url, exc)
        return None

    if r.status_code >= 400:
        log.warning("LLM scenario HTTP %s: %s", r.status_code, (r.text or "")[:400])
        return None

    try:
        data = r.json()
    except ValueError:
        log.warning("LLM scenario: invalid JSON body")
        return None

    scenario = data.get("scenario")
    if not isinstance(scenario, dict):
        return None

    st = scenario.get("type")
    if st != scenario_type:
        log.warning("LLM scenario type mismatch: expected %s got %s", scenario_type, st)
        return None

    scenario = {**scenario, "id": aggregate_id}
    return scenario
