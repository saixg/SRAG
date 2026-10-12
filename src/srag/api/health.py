"""Health endpoint — process liveness plus a database ping."""

from __future__ import annotations

from fastapi import APIRouter
from sqlalchemy import text

from srag.contracts.health import ComponentHealth, HealthResponse, ServiceStatus
from srag.db.session import get_engine
from srag.settings import get_settings

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthResponse, summary="Application health check")
async def health_check() -> HealthResponse:
    settings = get_settings()
    components = [
        ComponentHealth(
            name="api", status=ServiceStatus.HEALTHY, detail="FastAPI application is running"
        ),
    ]
    try:
        async with get_engine().connect() as connection:
            await connection.execute(text("SELECT 1"))
        components.append(
            ComponentHealth(
                name="database", status=ServiceStatus.HEALTHY, detail="PostgreSQL reachable"
            )
        )
    except Exception as exc:
        components.append(
            ComponentHealth(
                name="database", status=ServiceStatus.UNHEALTHY, detail=type(exc).__name__
            )
        )

    overall = ServiceStatus.HEALTHY
    for component in components:
        if component.status == ServiceStatus.UNHEALTHY:
            overall = ServiceStatus.UNHEALTHY
            break
        if component.status == ServiceStatus.DEGRADED:
            overall = ServiceStatus.DEGRADED

    return HealthResponse(
        status=overall,
        version="0.1.0",
        environment=settings.app_env.value,
        components=components,
    )
