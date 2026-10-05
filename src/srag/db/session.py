"""Database session management — async SQLAlchemy engine and session factory.

This module owns the database connection lifecycle. It provides:
- engine creation from settings
- async session factory
- dependency-injectable session getter for FastAPI
- graceful shutdown

The engine is created lazily and cached. Sessions are scoped to requests.
"""

from __future__ import annotations

from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from srag.settings import Settings, get_settings

# Module-level state — initialized lazily
_engine: AsyncEngine | None = None
_session_factory: async_sessionmaker[AsyncSession] | None = None


def get_engine(settings: Settings | None = None) -> AsyncEngine:
    """Create or return the cached async engine.

    Engine is created with sensible pool defaults. In testing mode,
    the pool is smaller to avoid resource exhaustion.
    """
    global _engine
    if _engine is not None:
        return _engine

    if settings is None:
        settings = get_settings()

    pool_size = 5 if settings.is_testing else 20
    max_overflow = 0 if settings.is_testing else 10

    _engine = create_async_engine(
        settings.database_url,
        pool_size=pool_size,
        max_overflow=max_overflow,
        pool_pre_ping=True,
        echo=settings.app_debug,
    )
    return _engine


def get_session_factory(engine: AsyncEngine | None = None) -> async_sessionmaker[AsyncSession]:
    """Create or return the cached async session factory."""
    global _session_factory
    if _session_factory is not None:
        return _session_factory

    if engine is None:
        engine = get_engine()

    _session_factory = async_sessionmaker(
        bind=engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )
    return _session_factory


async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency — yields a database session per request.

    The session is committed on success and rolled back on exception.
    """
    factory = get_session_factory()
    async with factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


async def close_engine() -> None:
    """Dispose the engine — called during application shutdown."""
    global _engine, _session_factory
    if _engine is not None:
        await _engine.dispose()
        _engine = None
        _session_factory = None
