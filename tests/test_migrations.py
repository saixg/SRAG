"""Migration-level checks that don't need a real database.

2.4: canary/dev tenants must not be seeded into a production database. These
rows exist only for the demo identities in srag.api.auth._demo_identities(),
which the app already refuses to serve outside development/testing — this
test guards the migration side of that same boundary.
"""

from __future__ import annotations

import importlib.util
from pathlib import Path
from types import ModuleType
from unittest.mock import MagicMock, patch

MIGRATION_PATH = (
    Path(__file__).parent.parent
    / "migrations"
    / "versions"
    / "b2a1e0c360f0_seed_dev_and_test_tenants.py"
)


def _load_migration() -> ModuleType:
    """Load the migration module directly by path.

    migrations/versions/ isn't on sys.path (alembic discovers it by directory
    scan, not import), so this is the only way to reach it from a test.
    """
    spec = importlib.util.spec_from_file_location("seed_dev_and_test_tenants", MIGRATION_PATH)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_seed_is_skipped_in_production(monkeypatch):
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.setenv("SECRET_KEY", "a-real-secret-not-the-default")
    monkeypatch.setenv("SUPABASE_JWT_SECRET", "jwt-secret")
    monkeypatch.setenv("GROQ_API_KEY", "gsk-test")
    monkeypatch.setenv("CORS_ORIGINS", "https://bevel.example")
    from srag.settings import get_settings

    get_settings.cache_clear()
    module = _load_migration()
    with patch.object(module.op, "execute", MagicMock()) as mock_execute:
        module.upgrade()
    mock_execute.assert_not_called()
    get_settings.cache_clear()


def test_seed_runs_outside_production(monkeypatch):
    monkeypatch.setenv("APP_ENV", "development")
    from srag.settings import get_settings

    get_settings.cache_clear()
    module = _load_migration()
    with patch.object(module.op, "execute", MagicMock()) as mock_execute:
        module.upgrade()
    mock_execute.assert_called_once()
    assert "Tenant A (Canary)" in mock_execute.call_args[0][0]
    get_settings.cache_clear()
