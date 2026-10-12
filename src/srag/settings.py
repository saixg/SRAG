"""Application settings — environment-driven configuration."""

from __future__ import annotations

from enum import StrEnum
from functools import lru_cache

from pydantic import Field, SecretStr, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Environment(StrEnum):
    DEVELOPMENT = "development"
    TESTING = "testing"
    STAGING = "staging"
    PRODUCTION = "production"


class EmbedderProvider(StrEnum):
    LOCAL = "local"
    HASHING = "hashing"


class CacheBackend(StrEnum):
    MEMORY = "memory"
    REDIS = "redis"
    DISABLED = "disabled"


_DEFAULT_SECRET = "CHANGE_ME_GENERATE_A_REAL_SECRET"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    app_env: Environment = Environment.DEVELOPMENT
    app_debug: bool = False
    app_log_level: str = "INFO"

    database_url: str = Field(
        default="postgresql+asyncpg://postgres:changeme@localhost:5432/srag_dev",
        description="Async SQLAlchemy connection string",
    )

    embedder_provider: EmbedderProvider = EmbedderProvider.LOCAL
    embedder_model_name: str = "BAAI/bge-m3"
    embedder_dimension: int = 1024

    secret_key: SecretStr = Field(default=SecretStr(_DEFAULT_SECRET))
    supabase_jwt_secret: SecretStr | None = Field(
        default=None,
        description="Supabase JWT secret used to verify access tokens",
    )
    dev_auth_token: str = Field(
        default="dev_token_123",
        description="Static bearer token accepted only in development and testing",
    )

    groq_api_key: SecretStr | None = None
    groq_model: str = "openai/gpt-oss-120b"

    cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173,http://127.0.0.1:5173"

    server_host: str = "0.0.0.0"
    server_port: int = 8000

    max_body_bytes: int = 10_485_760
    max_upload_bytes: int = 10_485_760
    rate_limit_query_per_minute: int = 60
    rate_limit_upload_per_minute: int = 20

    cache_backend: CacheBackend = CacheBackend.MEMORY
    redis_url: str | None = None

    supabase_url: str | None = None
    supabase_service_role_key: SecretStr | None = None

    visual_store_dir: str = "data/visuals"
    ingest_upload_dir: str = "data/uploads"

    @field_validator("dev_auth_token")
    @classmethod
    def token_not_blank(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("DEV_AUTH_TOKEN must not be empty")
        return value

    def validate_runtime_security(self) -> None:
        if self.app_env != Environment.PRODUCTION:
            return
        if self.secret_key.get_secret_value() == _DEFAULT_SECRET:
            raise RuntimeError("SECRET_KEY must be set in production")
        if self.supabase_jwt_secret is None:
            raise RuntimeError("SUPABASE_JWT_SECRET is required in production")
        if self.app_debug:
            raise RuntimeError("APP_DEBUG must be false in production")
        import os

        if os.environ.get("DEV_AUTH_TOKEN"):
            raise RuntimeError("DEV_AUTH_TOKEN must not be set in production")
        if self.embedder_provider == EmbedderProvider.HASHING:
            raise RuntimeError("EMBEDDER_PROVIDER=hashing is not allowed in production")
        if self.cache_backend == CacheBackend.MEMORY:
            raise RuntimeError("CACHE_BACKEND must be redis or disabled in production")
        if self.cache_backend == CacheBackend.REDIS and not self.redis_url:
            raise RuntimeError("REDIS_URL is required when CACHE_BACKEND=redis")
        if any(origin == "*" for origin in self.cors_origin_list):
            raise RuntimeError("CORS_ORIGINS must be an explicit allowlist in production")

    @property
    def is_testing(self) -> bool:
        return self.app_env == Environment.TESTING

    @property
    def is_production(self) -> bool:
        return self.app_env == Environment.PRODUCTION

    @property
    def allows_dev_token(self) -> bool:
        return self.app_env in (Environment.DEVELOPMENT, Environment.TESTING)

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
