"""Сохранение полного UserState (Cipherline) в PostgreSQL."""

from __future__ import annotations

import re
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentUser
from app.db.session import get_session
from app.models.game_state import CipherlineGameState
from app.services.skill_profile import compute_skill_profile

router = APIRouter(prefix="/cipherline", tags=["cipherline"])

_CERT_ID_RE = re.compile(r"^[a-f0-9]{16}$", re.IGNORECASE)

_COURSE_TITLE = {
    "ru": "Cipherline — программа по цифровой кибергигиене",
    "en": "Cipherline — cyber hygiene program",
}


@router.get("/certificate/verify/{certificate_id}")
async def verify_certificate_public(
    certificate_id: str,
    session: AsyncSession = Depends(get_session),
    lang: str = Query("ru", description="ru или en — заголовок курса"),
) -> dict[str, Any]:
    """
    Публичная проверка сертификата по ID с бланка / QR (без JWT).
    """
    cid = certificate_id.strip()
    if not _CERT_ID_RE.match(cid):
        return {"valid": False, "error": "invalid_id"}

    lng = lang if lang in _COURSE_TITLE else "ru"

    result = await session.execute(
        text(
            """
            SELECT email, state, updated_at
            FROM cipherline_game_state
            WHERE lower(state->>'certificateId') = lower(:cid)
              AND (state->>'certificateUnlocked') = 'true'
            LIMIT 1
            """
        ),
        {"cid": cid},
    )
    row = result.mappings().first()
    if not row:
        return {"valid": False, "error": "not_found"}

    state = row["state"]
    if not isinstance(state, dict):
        return {"valid": False, "error": "not_found"}

    stored_id = (state.get("certificateId") or "").strip()
    if stored_id.lower() != cid.lower():
        return {"valid": False, "error": "not_found"}

    login = (state.get("login") or row.get("email") or "").strip()
    issued_raw = state.get("certificateIssuedAt")
    if isinstance(issued_raw, str) and issued_raw.strip():
        issued_at = issued_raw.strip()
    else:
        ua = row.get("updated_at")
        issued_at = ua.isoformat() if ua is not None else None

    total_answers = int(state.get("totalAnswers") or 0)
    total_correct = int(state.get("totalCorrect") or 0)
    accuracy_percent: int | None
    if total_answers > 0:
        accuracy_percent = round((total_correct / total_answers) * 100)
    else:
        accuracy_percent = None

    return {
        "valid": True,
        "certificate_id": stored_id,
        "holder_login": login,
        "issued_at": issued_at,
        "course_title": _COURSE_TITLE[lng],
        "accuracy_percent": accuracy_percent,
        "xp": int(state.get("xp") or 0),
    }


@router.get("/state")
async def get_state(
    user: CurrentUser,
    session: AsyncSession = Depends(get_session),
) -> dict[str, Any]:
    user_id, _email = user
    row = await session.get(CipherlineGameState, user_id)
    if not row:
        raise HTTPException(status_code=404, detail="not_found")
    return {"state": row.state}


@router.get("/skill-profile")
async def get_skill_profile(
    user: CurrentUser,
    session: AsyncSession = Depends(get_session),
) -> dict[str, Any]:
    """
    Агрегат для simulation/ai: уровень сложности по истории ответов (без полного state).
    Если записи нет — базовый профиль (новичок).
    """
    user_id, _email = user
    row = await session.get(CipherlineGameState, user_id)
    if not row or not isinstance(row.state, dict):
        return {
            "skill_score": 0,
            "difficulty_tier": 0,
            "recent_correct_ratio": 0.0,
            "recent_sample_size": 0,
            "total_answers": 0,
            "total_correct": 0,
            "streak_balance": 0,
        }
    return compute_skill_profile(row.state)


@router.put("/state")
async def put_state(
    body: dict[str, Any],
    user: CurrentUser,
    session: AsyncSession = Depends(get_session),
) -> dict[str, str]:
    user_id, email = user
    login = (body.get("login") or "").strip().lower()
    if not login:
        raise HTTPException(status_code=400, detail="state_missing_login")
    if login != email:
        raise HTTPException(status_code=403, detail="login_mismatch_token")

    row = await session.get(CipherlineGameState, user_id)
    if row:
        row.state = body
        row.email = email
    else:
        session.add(
            CipherlineGameState(
                user_id=user_id,
                email=email,
                state=body,
            )
        )
    await session.commit()
    try:
        from app.integrations.soc_redis import emit_soc_event

        mods = body.get("scenariosCompleted")
        n_mods = len(mods) if isinstance(mods, list) else 0
        emit_soc_event(
            "progress_sync",
            {"modules_done": n_mods, "xp": int(body.get("xp") or 0)},
        )
    except Exception:
        pass
    return {"status": "ok"}
