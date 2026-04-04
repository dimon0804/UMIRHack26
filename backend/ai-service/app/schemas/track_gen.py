from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field, model_validator

# Синхронизировать с фронтом (THEME_ORDER) и track_generator._THEME_USER_*
TrackTheme = Literal[
    "office",
    "home",
    "public_wifi",
    "social_engineering",
    "mobile_mfa",
    "cloud_remote",
    "supply_chain",
]

TRACK_STEP_COUNT = 5


class TrackGenerateRequest(BaseModel):
    theme: TrackTheme
    locale: Literal["ru", "en"] = "ru"
    diversity_roll: int = Field(default=0, ge=0, le=999_999)


class TrackChoice(BaseModel):
    id: str
    label: str


class TrackOutcome(BaseModel):
    is_safe: bool
    recommendation_title: str
    recommendation_body: str


class TrackStepGenerated(BaseModel):
    situation: str = Field(min_length=20, max_length=8000)
    choices: list[TrackChoice] = Field(min_length=4, max_length=4)
    outcomes: dict[str, TrackOutcome]

    @model_validator(mode="after")
    def _validate_choice_outcomes(self) -> TrackStepGenerated:
        required = {"c1", "c2", "c3", "c4"}
        ids = {c.id for c in self.choices}
        if ids != required:
            raise ValueError(f"choices ids must be exactly {required}")
        if set(self.outcomes.keys()) != required:
            raise ValueError("outcomes must have exactly keys c1,c2,c3,c4")
        return self


class TrainingTrackPayload(BaseModel):
    theme: str
    steps: list[TrackStepGenerated] = Field(min_length=TRACK_STEP_COUNT, max_length=TRACK_STEP_COUNT)


class TrackGenerateResponse(BaseModel):
    theme: str
    locale: Literal["ru", "en"]
    steps: list[dict]
