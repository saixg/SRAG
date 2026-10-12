"""Shared test fixtures and configuration."""

from __future__ import annotations

import os
import uuid
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from srag.db.session import get_session_factory

# Force testing environment before any settings are loaded
os.environ["APP_ENV"] = "testing"
os.environ["APP_DEBUG"] = "false"
os.environ["EMBEDDER_PROVIDER"] = "hashing"


@pytest.fixture(scope="session")
def db_engine():
    """Session-scoped database engine."""
    from srag.db.session import get_engine

    return get_engine()


@pytest.fixture
async def db_session(db_engine):
    """Function-scoped, clean database session without tenant context."""
    factory = get_session_factory(db_engine)
    session = factory()
    try:
        await session.execute(text("RESET ROLE"))
        await session.execute(text("SELECT set_config('app.current_tenant_id', '', true)"))
        yield session
    finally:
        await session.rollback()
        await session.close()


@pytest.fixture
def rls_session():
    """Return a factory that yields RLS-bound database sessions.

    Usage:

        async with rls_session(tenant_id) as session:
            ...  # all reads/writes are constrained to `tenant_id` by RLS

    Passing None yields a bare session with no tenant context — useful to
    prove fail-closed behavior (S-011).
    """
    factory = get_session_factory()

    @asynccontextmanager
    async def make(tenant_id: uuid.UUID | None) -> AsyncGenerator[AsyncSession, None]:
        session = factory()
        try:
            if tenant_id is not None:
                # Bind the tenant context for this session's transaction;
                # RLS policies compare app.current_tenant_id.
                await session.execute(
                    text("SELECT set_config('app.current_tenant_id', :tid, true)"),
                    {"tid": str(tenant_id)},
                )

            # Switch to authenticated role which doesn't have BYPASSRLS
            await session.execute(text("SET LOCAL ROLE authenticated"))
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()

    return make


@pytest.fixture
def app():
    """Create a fresh FastAPI application for testing."""
    # Clear cached settings so each test gets a clean state
    from srag.settings import get_settings

    get_settings.cache_clear()
    from srag.api.search import get_retrieval_engine
    from srag.ingestion.embedder import get_embedder

    get_embedder.cache_clear()
    get_retrieval_engine.cache_clear()

    from srag.app import create_app

    application = create_app()
    yield application

    # Cleanup
    get_settings.cache_clear()


@pytest.fixture
async def client(app):
    """Async HTTP test client for the FastAPI application."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
