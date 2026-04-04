"""CRUD пользовательских сценариев (ответ AI → каталог → игра через simulation-service)."""

from __future__ import annotations

import re
import uuid

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentUser
from app.db.session import get_session
from app.models.custom_simulation import CustomSimulationCase
from app.schemas.custom_simulation import validate_and_normalize_scenario

router = APIRouter(prefix="/custom-scenarios", tags=["custom-scenarios"])

MAX_CASES_PER_USER = 24

_CUSTOM_ID_RE = re.compile(r"^cs-(mail|chat)-([0-9a-fA-F-]{36})$")


def _external_id(kind: str, uid: uuid.UUID) -> str:
    return f"cs-{kind}-{uid}"


def _parse_external_id(scenario_id: str) -> tuple[str, uuid.UUID] | None:
    m = _CUSTOM_ID_RE.match(scenario_id.strip())
    if not m:
        return None
    kind, ustr = m.group(1), m.group(2)
    try:
        return kind, uuid.UUID(ustr)
    except ValueError:
        return None


class CreateCustomScenarioBody(BaseModel):
    scenario: dict = Field(description="Объект сценария из POST /api/v1/ai/generate-scenario")


class CreateCustomScenarioResponse(BaseModel):
    id: str
    type: str
    title: str


class CustomScenarioListItem(BaseModel):
    id: str
    type: str
    title: str
    created_at: str


class CustomScenarioListResponse(BaseModel):
    items: list[CustomScenarioListItem]


@router.get("", response_model=CustomScenarioListResponse)
async def list_custom(
    user: CurrentUser,
    session: AsyncSession = Depends(get_session),
) -> CustomScenarioListResponse:
    uid, _ = user
    res = await session.execute(
        select(CustomSimulationCase)
        .where(CustomSimulationCase.user_id == uid)
        .order_by(CustomSimulationCase.created_at.desc())
    )
    rows = res.scalars().all()
    items = [
        CustomScenarioListItem(
            id=_external_id(r.kind, r.id),
            type="email" if r.kind == "mail" else "chat",
            title=r.title,
            created_at=r.created_at.isoformat() if r.created_at else "",
        )
        for r in rows
    ]
    return CustomScenarioListResponse(items=items)


@router.post("", response_model=CreateCustomScenarioResponse)
async def create_custom(
    body: CreateCustomScenarioBody,
    user: CurrentUser,
    session: AsyncSession = Depends(get_session),
) -> CreateCustomScenarioResponse:
    uid, _ = user
    try:
        kind, payload = validate_and_normalize_scenario(body.scenario)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e

    cnt = await session.scalar(
        select(func.count()).select_from(CustomSimulationCase).where(CustomSimulationCase.user_id == uid)
    )
    if (cnt or 0) >= MAX_CASES_PER_USER:
        raise HTTPException(status_code=400, detail="custom_scenario_limit_reached")

    cid = uuid.uuid4()
    title = str(payload.get("title") or "AI scenario")[:500]
    row = CustomSimulationCase(
        id=cid,
        user_id=uid,
        kind=kind,
        title=title,
        payload=payload,
    )
    session.add(row)
    await session.commit()

    ext = _external_id(kind, cid)
    return CreateCustomScenarioResponse(
        id=ext,
        type="email" if kind == "mail" else "chat",
        title=title,
    )


@router.get("/{scenario_id}/payload")
async def get_payload_for_simulation(
    scenario_id: str,
    user: CurrentUser,
    session: AsyncSession = Depends(get_session),
) -> dict:
    """Тело сценария для отображения в тренажёре (только владелец)."""
    parsed = _parse_external_id(scenario_id)
    if not parsed:
        raise HTTPException(status_code=404, detail="not_found")
    kind, cid = parsed
    uid, _ = user
    row = await session.get(CustomSimulationCase, cid)
    if not row or row.user_id != uid or row.kind != kind:
        raise HTTPException(status_code=404, detail="not_found")
    return row.payload


@router.delete("/{scenario_id}")
async def delete_custom(
    scenario_id: str,
    user: CurrentUser,
    session: AsyncSession = Depends(get_session),
) -> dict:
    parsed = _parse_external_id(scenario_id)
    if not parsed:
        raise HTTPException(status_code=404, detail="not_found")
    kind, cid = parsed
    uid, _ = user
    row = await session.get(CustomSimulationCase, cid)
    if not row or row.user_id != uid or row.kind != kind:
        raise HTTPException(status_code=404, detail="not_found")
    await session.delete(row)
    await session.commit()
    return {"status": "ok"}
