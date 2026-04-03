from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "api-gateway"

    auth_service_url: str = "http://localhost:8001"
    simulation_service_url: str = "http://localhost:8002"
    progress_service_url: str = "http://localhost:8003"

    jwt_secret: str
    jwt_algorithm: str = "HS256"

    gateway_cors_origins: str = "http://localhost:3000"

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.gateway_cors_origins.split(",") if o.strip()]


settings = Settings()
