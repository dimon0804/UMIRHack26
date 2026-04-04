from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    ai_service_url: str = ""
    """Базовый URL ai-service (в Docker: http://ai-service:8000)."""

    jury_llm_deadline_sec: float = 3.0
    """Макс. время ожидания ответа jury-take (submit не должен висеть дольше)."""

    simulation_llm_scenarios: bool = True
    """Если true и задан ai_service_url — сценарии для вкладок почта/чат генерирует Mistral."""

    progress_service_url: str = ""
    """Базовый URL progress-service для пользовательских AI-кейсов (cs-mail-*/cs-chat-*)."""


settings = Settings()
