"""Database engine and session factory. Request handlers must use an RLS-bound session."""

from __future__ import annotations

import logging
import socket
from typing import Any

from sqlalchemy import event
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from srag.settings import Settings, get_settings

logger = logging.getLogger(__name__)

_engine: AsyncEngine | None = None
_session_factory: async_sessionmaker[AsyncSession] | None = None


def _connect_args(settings: Settings) -> dict[str, Any]:
    args: dict[str, Any] = {}
    if settings.db_command_timeout > 0:
        args["command_timeout"] = settings.db_command_timeout
    if settings.db_is_transaction_pooler:
        # A transaction-mode pooler hands the same backend to different
        # clients between transactions, so a prepared statement named by one
        # client may not exist (or may belong to another) on the next use.
        args["statement_cache_size"] = 0
        args["prepared_statement_cache_size"] = 0
    return args


def _enable_tcp_keepalive(engine: AsyncEngine, settings: Settings) -> None:
    """Turn on SO_KEEPALIVE for every new asyncpg connection.

    asyncpg only sets TCP_NODELAY (see asyncpg/connect_utils.py::_set_nodelay);
    unlike libpq it never enables keepalives. A connection held across a long
    CPU/GPU-bound gap — embedding a batch of documents, say — therefore sends
    nothing at all, and any NAT or stateful firewall between us and the remote
    pooler eventually drops the flow. The write that follows fails with
    "connection was closed in the middle of operation".

    asyncpg exposes no option for this, so we reach the transport socket on the
    connect event. Failure here is never fatal: the connection still works, it
    is just back to having no liveness traffic.
    """
    idle = settings.db_keepalive_idle
    interval = settings.db_keepalive_interval
    count = settings.db_keepalive_count
    if idle <= 0:
        return

    @event.listens_for(engine.sync_engine, "connect")
    def _set_keepalive(dbapi_connection: Any, _record: Any) -> None:
        try:
            raw = getattr(dbapi_connection, "driver_connection", None) or dbapi_connection
            sock = raw._transport.get_extra_info("socket")
            if sock is None or sock.family == getattr(socket, "AF_UNIX", object()):
                return
            sock.setsockopt(socket.SOL_SOCKET, socket.SO_KEEPALIVE, 1)
            for name, value in (
                ("TCP_KEEPIDLE", idle),
                ("TCP_KEEPINTVL", interval),
                ("TCP_KEEPCNT", count),
            ):
                option = getattr(socket, name, None)
                if option is not None:
                    sock.setsockopt(socket.IPPROTO_TCP, option, value)
        except Exception:  # pragma: no cover - platform/driver dependent
            logger.warning("db_tcp_keepalive_not_set", exc_info=True)


def create_engine_from_settings(settings: Settings | None = None, **overrides: Any) -> AsyncEngine:
    """Build an engine configured for a remote connection pooler.

    Scripts must use this rather than calling ``create_async_engine`` directly,
    otherwise they get connections with no keepalives and no pool recycling.
    """
    if settings is None:
        settings = get_settings()

    pool_size = 5 if settings.is_testing else settings.db_pool_size
    max_overflow = 0 if settings.is_testing else settings.db_max_overflow

    kwargs: dict[str, Any] = {
        "pool_size": pool_size,
        "max_overflow": max_overflow,
        # Drop a connection the pooler or a firewall may have quietly killed
        # rather than handing it to a caller mid-statement.
        "pool_pre_ping": True,
        "pool_recycle": settings.db_pool_recycle,
        "pool_timeout": settings.db_pool_timeout,
        "connect_args": _connect_args(settings),
        "echo": settings.app_debug,
    }
    kwargs.update(overrides)

    engine = create_async_engine(settings.database_url, **kwargs)
    _enable_tcp_keepalive(engine, settings)
    return engine


def get_engine(settings: Settings | None = None) -> AsyncEngine:
    global _engine
    if _engine is not None:
        return _engine

    _engine = create_engine_from_settings(settings)
    return _engine


def get_session_factory(engine: AsyncEngine | None = None) -> async_sessionmaker[AsyncSession]:
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


async def close_engine() -> None:
    global _engine, _session_factory
    if _engine is not None:
        await _engine.dispose()
        _engine = None
        _session_factory = None
