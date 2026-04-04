from typing import Literal

from pydantic import BaseModel, Field


class JuryTakeRequest(BaseModel):
    locale: Literal["ru", "en"] = "ru"
    scenario_type: str = Field(max_length=64)
    scenario_title: str = Field(max_length=240)
    choice_id: str = Field(max_length=80)
    choice_summary: str = Field(max_length=400)
    is_safe: bool
    teach_title: str = Field(max_length=200)


class JuryTakeResponse(BaseModel):
    commentary: str = Field(max_length=600)
