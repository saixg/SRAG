"""FastAPI application factory.

Creates and configures the FastAPI application with:
- structured logging
- health endpoint
- lifecycle management (startup/shutdown)
- CORS (disabled by default, configured per-environment later)
"""

from __future__ import annotations

from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

import structlog
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from srag.api.health import router as health_router
from srag.api.auth import router as auth_router
from srag.db.session import close_engine
from srag.logging import setup_logging
from srag.settings import get_settings

logger = structlog.stdlib.get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifecycle â€” startup and shutdown hooks."""
    settings = get_settings()
    setup_logging(settings.app_log_level)
    logger.info(
        "application_starting",
        environment=settings.app_env.value,
        debug=settings.app_debug,
    )
    yield
    # Shutdown
    logger.info("application_shutting_down")
    await close_engine()


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""
    settings = get_settings()

    app = FastAPI(
        title="Secure Multimodal RAG",
        description="Secure enterprise knowledge platform with permission-aware evidence retrieval",
        version="0.1.0",
        debug=settings.app_debug,
        lifespan=lifespan,
    )

    app.add_middleware(CORSMiddleware, allow_origins=[origin.strip().rstrip("/") for origin in settings.cors_origins.split(",") if origin.strip()], allow_credentials=True, allow_methods=["GET", "POST"], allow_headers=["Content-Type", "Accept"])

    # --- Routers ---
    app.include_router(health_router, prefix="/api/v1")
    app.include_router(auth_router, prefix="/api/v1")

    return app
