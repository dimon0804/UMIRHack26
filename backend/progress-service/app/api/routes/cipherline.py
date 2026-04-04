"""Сохранение полного UserState (Cipherline) в PostgreSQL."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentUser
from app.db.session import get_session
from app.models.game_state import CipherlineGameState

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
    return {"status": "ok"}
