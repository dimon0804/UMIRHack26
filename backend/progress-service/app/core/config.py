from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://cyberapp:cyberapp_secret_change_me@localhost:5432/progress_db"
    jwt_secret: str = "dev-only-change-in-production-min-32-chars"
    jwt_algorithm: str = "HS256"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore", env_file_encoding="utf-8")


settings = Settings()
