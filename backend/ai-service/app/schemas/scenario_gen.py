from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


class ScenarioGenerateRequest(BaseModel):
    scenario_type: Literal["email", "chat"]
    locale: Literal["ru", "en"] = "ru"
    """Случайное число от клиента — разнообразие формулировок без хранения состояния."""
    diversity_roll: int = Field(default=0, ge=0, le=999_999)


class ScenarioChoice(BaseModel):
    id: str
    label: str


class ChatMessageIn(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    from_: Literal["peer"] = Field(alias="from", serialization_alias="from")
    text: str
    time: str


class EmailScenarioGenerated(BaseModel):
    type: Literal["email"] = "email"
    title: str
    sender_display: str
    sender_email: str
    subject: str
    preview: str
    body_paragraphs: list[str] = Field(min_length=2, max_length=6)
    cta_label: str
    cta_href_display: str
    choices: list[ScenarioChoice]

    @field_validator("choices")
    @classmethod
    def _mail_choices(cls, v: list[ScenarioChoice]) -> list[ScenarioChoice]:
        required = ("open_link", "delete_only", "verify_sender", "report")
        by_id = {c.id: c for c in v}
        if set(by_id) != set(required):
            raise ValueError(f"email choices must be exactly ids: {required}")
        return [by_id[i] for i in required]


class ChatScenarioGenerated(BaseModel):
    type: Literal["chat"] = "chat"
    title: str
    peer_name: str
    peer_handle: str
    messages: list[ChatMessageIn] = Field(min_length=1, max_length=4)
    choices: list[ScenarioChoice]

    @field_validator("choices")
    @classmethod
    def _chat_choices(cls, v: list[ScenarioChoice]) -> list[ScenarioChoice]:
        required = ("send_codes", "callback", "official_channel", "ignore")
        by_id = {c.id: c for c in v}
        if set(by_id) != set(required):
            raise ValueError(f"chat choices must be exactly ids: {required}")
        return [by_id[i] for i in required]


class ScenarioGenerateResponse(BaseModel):
    locale: Literal["ru", "en"]
    scenario_type: Literal["email", "chat"]
    scenario: dict
