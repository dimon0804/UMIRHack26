"""Загрузка сохранённых пользователем сценариев из progress-service."""

from __future__ import annotations

import logging
import re

import httpx

from app.core.config import settings

log = logging.getLogger(__name__)

CUSTOM_SCENARIO_ID_RE = re.compile(r"^cs-(mail|chat)-([0-9a-fA-F-]{36})$")


def is_custom_scenario_id(scenario_id: str) -> bool:
    return bool(CUSTOM_SCENARIO_ID_RE.match(scenario_id.strip()))


async def fetch_custom_scenario_payload(
    scenario_id: str,
    authorization: str | None,
) -> dict | None:
    if not authorization or not authorization.strip():
        return None
    if not is_custom_scenario_id(scenario_id):
        return None
    base = settings.progress_service_url.strip().rstrip("/")
    if not base:
        log.debug("progress_service_url empty; skip custom scenario")
        return None
    url = f"{base}/custom-scenarios/{scenario_id.strip()}/payload"
    timeout = httpx.Timeout(connect=5.0, read=20.0, write=5.0, pool=5.0)
    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            r = await client.get(url, headers={"Authorization": authorization.strip()})
    except httpx.RequestError as exc:
        log.warning("progress custom payload request failed: %s", exc)
        return None
    if r.status_code == 404:
        return None
    if r.status_code != 200:
        log.warning("progress custom payload HTTP %s: %s", r.status_code, (r.text or "")[:200])
        return None
    try:
        data = r.json()
    except ValueError:
        return None
    return data if isinstance(data, dict) else None
