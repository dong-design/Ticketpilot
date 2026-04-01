from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "TicketPilot"
    app_env: str = "dev"
    app_host: str = "0.0.0.0"
    app_port: int = 8000
    database_url: str = "sqlite:///./ticketpilot.db"
    redis_url: str = "redis://localhost:6379/0"
    queue_backend: str = "inline"
    openai_api_key: str | None = None
    openai_model: str = "gpt-4.1-mini"
    queue_name: str = "ticketpilot:runs"
    auth_secret_key: str = "ticketpilot-dev-secret"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")


@lru_cache
def get_settings() -> Settings:
    return Settings()
