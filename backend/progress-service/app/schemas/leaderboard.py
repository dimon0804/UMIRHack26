from __future__ import annotations

from pydantic import BaseModel, Field


class LeaderboardEntryPublic(BaseModel):
    rank: int = Field(..., ge=1)
    user_id: str
    display_name: str = Field(..., description="Маскированный email для публичного табло")
    xp: int = Field(0, ge=0)
    hp: int = Field(0, ge=0, le=100)
    modules_completed: int = Field(0, ge=0)
    total_correct: int = Field(0, ge=0)
    total_answers: int = Field(0, ge=0)
    accuracy_percent: int = Field(0, ge=0, le=100)
    league_key: str


class LeaderboardResponse(BaseModel):
    sort: str
    limit: int
    total_players: int
    entries: list[LeaderboardEntryPublic]


class LeagueDistributionItem(BaseModel):
    league_key: str
    count: int


class LeaderboardStatsResponse(BaseModel):
    total_players: int
    avg_xp: float
    max_xp: int
    avg_modules_completed: float
    avg_accuracy_percent: float | None = Field(None, description="Средняя точность только по тем, у кого были ответы")
    league_distribution: list[LeagueDistributionItem]


class MyRankResponse(BaseModel):
    rank: int | None = Field(None, description="null если прогресс ещё не сохранялся в БД")
    total_players: int
    entry: LeaderboardEntryPublic | None = None
