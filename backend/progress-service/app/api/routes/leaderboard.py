"""Публичный лидерборд и агрегированная статистика по сохранённым состояниям Cipherline."""

from __future__ import annotations

from typing import Any, Literal

from fastapi import APIRouter, Depends, Query
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentUser
from app.db.session import get_session
from app.schemas.leaderboard import (
    LeaderboardEntryPublic,
    LeaderboardResponse,
    LeaderboardStatsResponse,
    LeagueDistributionItem,
    MyRankResponse,
)
from app.services.leaderboard_util import accuracy_percent, league_key_from_xp, mask_email

router = APIRouter(prefix="/leaderboard", tags=["leaderboard"])

SortKey = Literal["xp", "accuracy", "modules"]

ORDER_SQL = {
    "xp": """
        COALESCE((state->>'xp')::int, 0) DESC,
        CASE WHEN COALESCE((state->>'totalAnswers')::int, 0) > 0
          THEN COALESCE((state->>'totalCorrect')::int, 0)::double precision
               / (state->>'totalAnswers')::double precision
          ELSE 0 END DESC,
        COALESCE(jsonb_array_length(COALESCE(state->'scenariosCompleted', '[]'::jsonb)), 0) DESC,
        COALESCE((state->>'hp')::int, 0) DESC
    """,
    "accuracy": """
        CASE WHEN COALESCE((state->>'totalAnswers')::int, 0) > 0
          THEN COALESCE((state->>'totalCorrect')::int, 0)::double precision
               / (state->>'totalAnswers')::double precision
          ELSE 0 END DESC,
        COALESCE((state->>'xp')::int, 0) DESC,
        COALESCE(jsonb_array_length(COALESCE(state->'scenariosCompleted', '[]'::jsonb)), 0) DESC,
        COALESCE((state->>'hp')::int, 0) DESC
    """,
    "modules": """
        COALESCE(jsonb_array_length(COALESCE(state->'scenariosCompleted', '[]'::jsonb)), 0) DESC,
        COALESCE((state->>'xp')::int, 0) DESC,
        CASE WHEN COALESCE((state->>'totalAnswers')::int, 0) > 0
          THEN COALESCE((state->>'totalCorrect')::int, 0)::double precision
               / (state->>'totalAnswers')::double precision
          ELSE 0 END DESC,
        COALESCE((state->>'hp')::int, 0) DESC
    """,
}


def _row_to_entry(rank: int, row: dict[str, Any]) -> LeaderboardEntryPublic:
    xp = int(row["xp"] or 0)
    hp = min(100, max(0, int(row["hp"] or 0)))
    tc = int(row["total_correct"] or 0)
    ta = int(row["total_answers"] or 0)
    mods = int(row["modules_done"] or 0)
    email = str(row["email"] or "")
    uid = str(row["user_id"])
    return LeaderboardEntryPublic(
        rank=rank,
        user_id=uid,
        display_name=mask_email(email),
        xp=xp,
        hp=hp,
        modules_completed=mods,
        total_correct=tc,
        total_answers=ta,
        accuracy_percent=accuracy_percent(tc, ta),
        league_key=league_key_from_xp(xp),
    )


@router.get("", response_model=LeaderboardResponse)
async def get_leaderboard(
    session: AsyncSession = Depends(get_session),
    limit: int = Query(50, ge=1, le=200),
    sort: SortKey = Query("xp", description="Сортировка: xp | accuracy | modules"),
) -> LeaderboardResponse:
    order_clause = ORDER_SQL.get(sort, ORDER_SQL["xp"])
    count_res = await session.execute(text("SELECT COUNT(*)::int AS c FROM cipherline_game_state"))
    total = int(count_res.scalar() or 0)

    q = text(f"""
        SELECT user_id::text AS user_id, email,
          COALESCE((state->>'xp')::int, 0) AS xp,
          COALESCE((state->>'hp')::int, 0) AS hp,
          COALESCE((state->>'totalCorrect')::int, 0) AS total_correct,
          COALESCE((state->>'totalAnswers')::int, 0) AS total_answers,
          COALESCE(jsonb_array_length(COALESCE(state->'scenariosCompleted', '[]'::jsonb)), 0) AS modules_done
        FROM cipherline_game_state
        ORDER BY {order_clause}
        LIMIT :lim
    """)
    result = await session.execute(q, {"lim": limit})
    rows = result.mappings().all()
    entries = [_row_to_entry(i + 1, dict(r)) for i, r in enumerate(rows)]
    return LeaderboardResponse(sort=sort, limit=limit, total_players=total, entries=entries)


@router.get("/stats", response_model=LeaderboardStatsResponse)
async def get_leaderboard_stats(session: AsyncSession = Depends(get_session)) -> LeaderboardStatsResponse:
    agg = await session.execute(
        text("""
        SELECT
          COUNT(*)::int AS total_players,
          COALESCE(AVG(COALESCE((state->>'xp')::int, 0)), 0)::float AS avg_xp,
          COALESCE(MAX(COALESCE((state->>'xp')::int, 0)), 0)::int AS max_xp,
          COALESCE(AVG(COALESCE(
            jsonb_array_length(COALESCE(state->'scenariosCompleted', '[]'::jsonb)), 0
          )), 0)::float AS avg_modules,
          AVG(
            CASE WHEN COALESCE((state->>'totalAnswers')::int, 0) > 0
              THEN (COALESCE((state->>'totalCorrect')::int, 0)::numeric
                    / (state->>'totalAnswers')::numeric) * 100
            END
          )::float AS avg_accuracy
        FROM cipherline_game_state
        """)
    )
    row = agg.mappings().first()
    if not row:
        return LeaderboardStatsResponse(
            total_players=0,
            avg_xp=0.0,
            max_xp=0,
            avg_modules_completed=0.0,
            avg_accuracy_percent=None,
            league_distribution=[],
        )

    dist_res = await session.execute(
        text("""
        SELECT bucket AS league_key, COUNT(*)::int AS cnt
        FROM (
          SELECT CASE
            WHEN COALESCE((state->>'xp')::int, 0) >= 220 THEN 'expert'
            WHEN COALESCE((state->>'xp')::int, 0) >= 120 THEN 'analyst'
            WHEN COALESCE((state->>'xp')::int, 0) >= 40 THEN 'trainee'
            ELSE 'novice'
          END AS bucket
          FROM cipherline_game_state
        ) t
        GROUP BY bucket
        ORDER BY cnt DESC
        """)
    )
    dist_rows = dist_res.mappings().all()
    distribution = [LeagueDistributionItem(league_key=str(r["league_key"]), count=int(r["cnt"])) for r in dist_rows]

    acc = row.get("avg_accuracy")
    return LeaderboardStatsResponse(
        total_players=int(row["total_players"] or 0),
        avg_xp=float(row["avg_xp"] or 0),
        max_xp=int(row["max_xp"] or 0),
        avg_modules_completed=float(row["avg_modules"] or 0),
        avg_accuracy_percent=float(acc) if acc is not None else None,
        league_distribution=distribution,
    )


@router.get("/me", response_model=MyRankResponse)
async def get_my_rank(
    user: CurrentUser,
    session: AsyncSession = Depends(get_session),
) -> MyRankResponse:
    user_id, email = user
    count_res = await session.execute(text("SELECT COUNT(*)::int AS c FROM cipherline_game_state"))
    total = int(count_res.scalar() or 0)

    row_res = await session.execute(
        text("""
        SELECT user_id::text AS user_id, email,
          COALESCE((state->>'xp')::int, 0) AS xp,
          COALESCE((state->>'hp')::int, 0) AS hp,
          COALESCE((state->>'totalCorrect')::int, 0) AS total_correct,
          COALESCE((state->>'totalAnswers')::int, 0) AS total_answers,
          COALESCE(jsonb_array_length(COALESCE(state->'scenariosCompleted', '[]'::jsonb)), 0) AS modules_done
        FROM cipherline_game_state
        WHERE user_id = CAST(:uid AS uuid)
        """),
        {"uid": str(user_id)},
    )
    mine = row_res.mappings().first()
    if not mine:
        return MyRankResponse(rank=None, total_players=total, entry=None)

    rank_res = await session.execute(
        text("""
        WITH ordered AS (
          SELECT user_id,
            RANK() OVER (
              ORDER BY
                COALESCE((state->>'xp')::int, 0) DESC,
                CASE WHEN COALESCE((state->>'totalAnswers')::int, 0) > 0
                  THEN COALESCE((state->>'totalCorrect')::int, 0)::double precision
                       / (state->>'totalAnswers')::double precision
                  ELSE 0 END DESC,
                COALESCE(jsonb_array_length(COALESCE(state->'scenariosCompleted', '[]'::jsonb)), 0) DESC,
                COALESCE((state->>'hp')::int, 0) DESC
            ) AS rk
          FROM cipherline_game_state
        )
        SELECT rk FROM ordered WHERE user_id = CAST(:uid AS uuid)
        """),
        {"uid": str(user_id)},
    )
    rk = rank_res.scalar()
    rank = int(rk) if rk is not None else None
    entry = _row_to_entry(rank or 1, dict(mine)) if rank is not None else None
    if entry:
        entry = entry.model_copy(update={"display_name": mask_email(email)})
    return MyRankResponse(rank=rank, total_players=total, entry=entry)
