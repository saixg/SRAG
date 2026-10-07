"""Application settings â€” environment-driven configuration.

All configuration is loaded from environment variables or a .env file.
No secrets are hard-coded. Settings are validated at startup via Pydantic.
"""

from __future__ import annotations

from enum import StrEnum
from functools import lru_cache

from pydantic import Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Environment(StrEnum):
    """Deployment environment."""

    DEVELOPMENT = "development"
    TESTING = "testing"
    STAGING = "staging"
    PRODUCTION = "production"


class Settings(BaseSettings):
    """Root application settings.

    Loaded from environment variables. A .env file is read if present.
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # --- Application ---
    app_env: Environment = Environment.DEVELOPMENT
    app_debug: bool = False
    app_log_level: str = "INFO"

    # --- Database ---
    database_url: str = Field(
        default="postgresql+asyncpg://postgres:changeme@localhost:5432/srag_dev",
        description="Async SQLAlchemy connection string",
    )

    # --- Security ---
    secret_key: SecretStr = Field(
        default=SecretStr("CHANGE_ME_GENERATE_A_REAL_SECRET"),
        description="Secret key for signing â€” must be replaced in production",
    )

    # --- Portal username/password authentication ---
    # Required to prevent uninvited public account creation.
    portal_signup_invite_code: SecretStr = SecretStr("")
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"
    auth_session_cookie_name: str = "nexus_one_session"
    auth_session_max_age_seconds: int = Field(default=28800, ge=300, le=2592000)

    # --- Server ---
    server_host: str = "0.0.0.0"
    server_port: int = 8000

    @property
    def is_testing(self) -> bool:
        return self.app_env == Environment.TESTING

    @property
    def is_production(self) -> bool:
        return self.app_env == Environment.PRODUCTION


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return cached application settings singleton."""
    return Settings()
