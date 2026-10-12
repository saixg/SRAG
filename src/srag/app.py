"""FastAPI application factory."""

from __future__ import annotations

import time
import uuid
from collections.abc import AsyncGenerator, Awaitable, Callable
from contextlib import asynccontextmanager
from pathlib import Path

import structlog
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from starlette.types import Message, Receive, Scope, Send

from srag.api.audit import router as audit_router
from srag.api.documents import router as documents_router
from srag.api.evidence import router as evidence_router
from srag.api.health import router as health_router
from srag.api.identity import router as identity_router
from srag.api.metrics import router as metrics_router
from srag.api.query import router as query_router
from srag.api.search import router as search_router
from srag.api.tenants import router as tenants_router
from srag.api.workspace import router as workspace_router
from srag.db.session import close_engine
from srag.logging import setup_logging
from srag.observability import metrics
from srag.settings import get_settings

logger = structlog.stdlib.get_logger(__name__)

SPA_DIST = Path(__file__).resolve().parents[2] / "srag-frontend" / "dist"


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    import asyncio

    settings = get_settings()
    setup_logging(settings.app_log_level, json_logs=settings.is_production)
    logger.info(
        "application_starting",
        environment=settings.app_env.value,
        debug=settings.app_debug,
    )
    stop = asyncio.Event()
    worker: asyncio.Task[None] | None = None
    if settings.redis_url and not settings.is_testing:
        from srag.ingestion.jobs import redis_worker

        worker = asyncio.create_task(redis_worker(stop))
    yield
    stop.set()
    if worker is not None:
        worker.cancel()
    logger.info("application_shutting_down")
    await close_engine()


class RequestContextMiddleware:
    """Bind a request id and record aggregate latency without buffering SSE bodies."""

    def __init__(self, app: Callable[[Scope, Receive, Send], Awaitable[None]]) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        request_id = _header(scope, b"x-request-id") or uuid.uuid4().hex
        structlog.contextvars.clear_contextvars()
        structlog.contextvars.bind_contextvars(request_id=request_id)
        metrics.requests += 1
        started = time.perf_counter()
        status_code = 200

        async def send_wrapper(message: Message) -> None:
            nonlocal status_code
            if message["type"] == "http.response.start":
                status_code = int(message["status"])
                headers = list(message.get("headers") or [])
                headers.append((b"x-request-id", request_id.encode()))
                message = {**message, "headers": headers}
            await send(message)

        try:
            await self.app(scope, receive, send_wrapper)
        except Exception:
            metrics.errors += 1
            raise
        finally:
            elapsed_ms = (time.perf_counter() - started) * 1000
            path = scope.get("path", "")
            if isinstance(path, str) and path.startswith("/api/v1/query"):
                metrics.observe_query(elapsed_ms)
            if status_code >= 500:
                metrics.errors += 1


class MaxBodySizeMiddleware:
    def __init__(
        self,
        app: Callable[[Scope, Receive, Send], Awaitable[None]],
        max_bytes: int,
    ) -> None:
        self.app = app
        self.max_bytes = max_bytes

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] == "http":
            raw = _header(scope, b"content-length")
            if raw is not None and raw.isdigit() and int(raw) > self.max_bytes:
                response = JSONResponse({"detail": "Payload too large"}, status_code=413)
                await response(scope, receive, send)
                return
        await self.app(scope, receive, send)


def _header(scope: Scope, name: bytes) -> str | None:
    for key, value in scope.get("headers") or []:
        if key.lower() == name:
            return str(value.decode("latin-1"))
    return None


def create_app() -> FastAPI:
    settings = get_settings()
    settings.validate_runtime_security()
    app = FastAPI(
        title="Secure Multimodal RAG",
        description="Secure enterprise knowledge platform with permission-aware evidence retrieval",
        version="0.1.0",
        debug=settings.app_debug,
        lifespan=lifespan,
    )
    app.add_middleware(MaxBodySizeMiddleware, max_bytes=settings.max_body_bytes)
    app.add_middleware(RequestContextMiddleware)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type", "X-Request-ID"],
        expose_headers=["X-Request-ID"],
    )
    app.include_router(health_router, prefix="/api/v1")
    app.include_router(identity_router, prefix="/api/v1")
    app.include_router(tenants_router, prefix="/api/v1")
    app.include_router(search_router, prefix="/api/v1")
    app.include_router(documents_router, prefix="/api/v1")
    app.include_router(query_router, prefix="/api/v1")
    app.include_router(evidence_router, prefix="/api/v1")
    app.include_router(audit_router, prefix="/api/v1")
    app.include_router(workspace_router, prefix="/api/v1")
    app.include_router(metrics_router, prefix="/api/v1")

    if SPA_DIST.is_dir():
        app.mount("/", StaticFiles(directory=SPA_DIST, html=True), name="spa")
    else:

        @app.get("/")
        async def index() -> dict[str, str]:
            return {
                "service": "bevel",
                "health": "/api/v1/health",
                "docs": "/docs",
            }

    return app
