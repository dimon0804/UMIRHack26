"""Сохранение полного UserState (Cipherline) в PostgreSQL."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentUser
from app.db.session import get_session
from app.models.game_state import CipherlineGameState
from app.services.skill_profile import compute_skill_profile

router = APIRouter(prefix="/cipherline", tags=["cipherline"])


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
