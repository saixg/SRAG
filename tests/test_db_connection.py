"""Connection-layer behaviour: pooler mode, keepalives, and tenant leakage.

The configuration tests are offline (building an engine does not connect). The
last two take a real connection, like the RLS suite does.
"""

from __future__ import annotations

import socket
import uuid

import pytest
from sqlalchemy import text

from srag.db.session import _connect_args, create_engine_from_settings
from srag.settings import Settings

SESSION_POOLER = "postgresql+asyncpg://u:p@aws-0-ap-southeast-2.pooler.supabase.com:5432/postgres"
TRANSACTION_POOLER = (
    "postgresql+asyncpg://u:p@aws-0-ap-southeast-2.pooler.supabase.com:6543/postgres"
)


def _settings(url: str) -> Settings:
    return Settings(_env_file=None, database_url=url)  # type: ignore[call-arg]


class TestPoolerMode:
    def test_port_5432_is_session_mode(self):
        assert _settings(SESSION_POOLER).db_is_transaction_pooler is False

    def test_port_6543_is_transaction_mode(self):
        assert _settings(TRANSACTION_POOLER).db_is_transaction_pooler is True

    def test_session_mode_keeps_prepared_statements(self):
        args = _connect_args(_settings(SESSION_POOLER))
        assert "statement_cache_size" not in args
        assert "prepared_statement_cache_size" not in args

    def test_transaction_mode_disables_both_caches(self):
        """A shared backend cannot carry another client's prepared statements."""
        args = _connect_args(_settings(TRANSACTION_POOLER))
        assert args["statement_cache_size"] == 0
        assert args["prepared_statement_cache_size"] == 0

    def test_command_timeout_is_passed_through(self):
        assert _connect_args(_settings(SESSION_POOLER))["command_timeout"] == pytest.approx(120.0)


class TestEngineHealthOptions:
    def test_engine_recycles_and_pre_pings(self):
        settings = _settings(SESSION_POOLER)
        engine = create_engine_from_settings(settings)
        try:
            assert engine.pool._pre_ping is True
            assert engine.pool._recycle == settings.db_pool_recycle
            # Must stay under Supavisor's 3600s server lifetime.
            assert 0 < engine.pool._recycle < 3600
        finally:
            engine.sync_engine.pool.dispose()

    def test_pool_stays_well_under_server_max_connections(self):
        settings = _settings(SESSION_POOLER)
        assert settings.db_pool_size + settings.db_max_overflow <= 30


@pytest.mark.asyncio
async def test_new_connections_have_tcp_keepalive_enabled(db_engine):
    """asyncpg sets only TCP_NODELAY; we must add SO_KEEPALIVE ourselves.

    Without it a connection idling through an embedding pass sends nothing and
    gets dropped by a NAT, surfacing as "connection was closed in the middle of
    operation" on the next INSERT.
    """
    async with db_engine.connect() as conn:
        raw = await conn.get_raw_connection()
        driver = raw.driver_connection
        sock = driver._transport.get_extra_info("socket")
        assert sock.getsockopt(socket.SOL_SOCKET, socket.SO_KEEPALIVE) == 1
        if hasattr(socket, "TCP_KEEPIDLE"):
            assert sock.getsockopt(socket.IPPROTO_TCP, socket.TCP_KEEPIDLE) > 0


@pytest.mark.asyncio
async def test_tenant_binding_does_not_survive_the_transaction(rls_session):
    """Pooling must never hand on a stale app.current_tenant_id.

    set_config(..., true) and SET LOCAL ROLE are transaction-local, so the
    binding is gone once the transaction ends and a reused connection starts
    with no tenant — fail-closed, not cross-tenant.
    """
    tenant_id = uuid.uuid4()
    async with rls_session(tenant_id) as session:
        bound = await session.scalar(text("SELECT current_setting('app.current_tenant_id', true)"))
        assert bound == str(tenant_id)
        role = await session.scalar(text("SELECT current_user"))
        assert role == "authenticated"

        # Ending the transaction must drop both.
        await session.commit()

        probe = text("SELECT current_setting('app.current_tenant_id', true)")
        leaked = await session.scalar(probe)
        assert not leaked, f"tenant id leaked past COMMIT: {leaked!r}"
        assert await session.scalar(text("SELECT current_user")) != "authenticated"
