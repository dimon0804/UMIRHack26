"""Валидация JSON сценария как у ai-service /generate-scenario."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


class ScenarioChoice(BaseModel):
    id: str
    label: str


class ChatMessageIn(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    from_: Literal["peer"] = Field(alias="from", serialization_alias="from")
    text: str
    time: str


class EmailScenarioPayload(BaseModel):
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


class ChatScenarioPayload(BaseModel):
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


def validate_and_normalize_scenario(raw: dict) -> tuple[Literal["mail", "chat"], dict]:
    t = raw.get("type")
    if t == "email":
        m = EmailScenarioPayload.model_validate(raw)
        return "mail", m.model_dump(by_alias=True, mode="json")
    if t == "chat":
        c = ChatScenarioPayload.model_validate(raw)
        return "chat", c.model_dump(by_alias=True, mode="json")
    raise ValueError("scenario.type must be 'email' or 'chat'")
