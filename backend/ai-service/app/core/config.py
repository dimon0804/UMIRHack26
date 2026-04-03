from functools import lru_cache
from typing import Literal

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    llm_mode: Literal["mistral_sdk", "openai_http"] = Field(default="mistral_sdk", alias="LLM_MODE")
    mistral_api_key: str = Field(default="", alias="MISTRAL_API_KEY")

    @field_validator("mistral_api_key", mode="before")
    @classmethod
    def strip_mistral_key(cls, v: object) -> str:
        if v is None:
            return ""
        return str(v).strip()
    mistral_base_url: str = Field(default="https://api.mistral.ai", alias="MISTRAL_BASE_URL")
    mistral_chat_model: str = Field(default="mistral-small-latest", alias="MISTRAL_CHAT_MODEL")
    request_timeout_seconds: float = Field(default=120.0, alias="AI_REQUEST_TIMEOUT_SECONDS")


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
