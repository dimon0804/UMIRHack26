"""Загрузка профиля навыка из progress-service (тот же Bearer, что у клиента)."""

from __future__ import annotations

import logging
from typing import Any

import httpx

from app.core.config import settings

log = logging.getLogger(__name__)

DEFAULT_PROFILE: dict[str, Any] = {
    "skill_score": 0,
    "difficulty_tier": 0,
    "recent_correct_ratio": 0.0,
    "recent_sample_size": 0,
    "total_answers": 0,
    "total_correct": 0,
    "streak_balance": 0,
}


async def fetch_player_skill_profile(authorization: str | None) -> dict[str, Any]:
    if not authorization or not authorization.strip():
        return dict(DEFAULT_PROFILE)
    base = settings.progress_service_url.strip().rstrip("/")
    if not base:
        return dict(DEFAULT_PROFILE)
    url = f"{base}/cipherline/skill-profile"
    timeout = httpx.Timeout(connect=5.0, read=10.0, write=5.0, pool=5.0)
    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            r = await client.get(url, headers={"Authorization": authorization.strip()})
    except httpx.RequestError as exc:
        log.debug("skill-profile request failed: %s", exc)
        return dict(DEFAULT_PROFILE)
    if r.status_code != 200:
        log.debug("skill-profile HTTP %s", r.status_code)
        return dict(DEFAULT_PROFILE)
    try:
        data = r.json()
    except ValueError:
        return dict(DEFAULT_PROFILE)
    if not isinstance(data, dict):
        return dict(DEFAULT_PROFILE)
    tier = data.get("difficulty_tier")
    if not isinstance(tier, int) or tier < 0 or tier > 3:
        tier = 0
    out = dict(DEFAULT_PROFILE)
    out.update(data)
    out["difficulty_tier"] = tier
    score = data.get("skill_score")
    out["skill_score"] = int(score) if isinstance(score, (int, float)) else 0
    return out
