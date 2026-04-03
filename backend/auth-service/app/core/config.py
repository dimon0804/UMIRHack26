from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "auth-service"
    database_url: str = "postgresql+asyncpg://cyberapp:cyberapp_secret_change_me@localhost:5432/auth_db"

    jwt_secret: str
    jwt_algorithm: str = "HS256"
    jwt_access_expire_minutes: int = 15
    jwt_refresh_expire_days: int = 7


settings = Settings()
