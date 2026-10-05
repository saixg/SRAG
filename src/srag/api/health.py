"""Health endpoint — reports application and component health.

This is the first real endpoint. It returns the application's health status
and can be extended to report per-component health (database, cache, etc.).
"""

from __future__ import annotations

from fastapi import APIRouter

from srag.contracts.health import ComponentHealth, HealthResponse, ServiceStatus
from srag.settings import get_settings

router = APIRouter(tags=["health"])


@router.get(
    "/health",
    response_model=HealthResponse,
    summary="Application health check",
    description="Returns application health status and component details.",
)
async def health_check() -> HealthResponse:
    """Return current health status.

    In Phase 0, this reports basic application health.
    In later phases, this will probe database connectivity,
    embedding service availability, etc.
    """
    settings = get_settings()

    components: list[ComponentHealth] = [
        ComponentHealth(
            name="api",
            status=ServiceStatus.HEALTHY,
            detail="FastAPI application is running",
        ),
    ]

    # Overall status is the worst component status
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
