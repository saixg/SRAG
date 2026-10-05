"""Tests for application settings and configuration."""

from __future__ import annotations

from srag.settings import Environment, Settings


class TestSettings:
    """Test the settings/configuration layer."""

    def setup_method(self):
        """Clear settings cache before each test."""
        from srag.settings import get_settings

        get_settings.cache_clear()

    def test_default_settings_load(self, monkeypatch):
        """Settings should load with defaults when no env vars are set."""
        monkeypatch.delenv("APP_ENV", raising=False)
        monkeypatch.delenv("APP_DEBUG", raising=False)
        settings = Settings(
            _env_file=None,  # type: ignore[call-arg]
        )
        assert settings.app_env == Environment.DEVELOPMENT
        assert settings.app_debug is False
        assert settings.server_port == 8000

    def test_environment_enum_values(self):
        """Environment enum should have expected values."""
        assert Environment.DEVELOPMENT.value == "development"
        assert Environment.TESTING.value == "testing"
        assert Environment.STAGING.value == "staging"
        assert Environment.PRODUCTION.value == "production"

    def test_is_testing_property(self):
        """is_testing should return True only for testing environment."""
        settings = Settings(app_env=Environment.TESTING, _env_file=None)  # type: ignore[call-arg]
        assert settings.is_testing is True

        settings = Settings(app_env=Environment.DEVELOPMENT, _env_file=None)  # type: ignore[call-arg]
        assert settings.is_testing is False

    def test_is_production_property(self):
        """is_production should return True only for production environment."""
        settings = Settings(app_env=Environment.PRODUCTION, _env_file=None)  # type: ignore[call-arg]
        assert settings.is_production is True

        settings = Settings(app_env=Environment.DEVELOPMENT, _env_file=None)  # type: ignore[call-arg]
        assert settings.is_production is False

    def test_secret_key_is_secret_str(self):
        """Secret key should be a SecretStr, not exposed in repr/str."""
        settings = Settings(_env_file=None)  # type: ignore[call-arg]
        secret_repr = repr(settings.secret_key)
        assert "CHANGE_ME" not in secret_repr
        # But the actual value is accessible via get_secret_value
        assert settings.secret_key.get_secret_value() == "CHANGE_ME_GENERATE_A_REAL_SECRET"

    def test_settings_from_env_vars(self, monkeypatch):
        """Settings should be overridable via environment variables."""
        monkeypatch.setenv("APP_ENV", "staging")
        monkeypatch.setenv("APP_DEBUG", "true")
        monkeypatch.setenv("SERVER_PORT", "9000")

        settings = Settings(_env_file=None)  # type: ignore[call-arg]
        assert settings.app_env == Environment.STAGING
        assert settings.app_debug is True
        assert settings.server_port == 9000
