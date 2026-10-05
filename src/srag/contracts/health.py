"""Health contract — typed models for health endpoint responses."""

from __future__ import annotations

from enum import StrEnum

from pydantic import BaseModel


class ServiceStatus(StrEnum):
    """Health status of a service component."""

    HEALTHY = "healthy"
    DEGRADED = "degraded"
    UNHEALTHY = "unhealthy"


class ComponentHealth(BaseModel):
    """Health status of an individual component."""

    name: str
    status: ServiceStatus
    detail: str | None = None


class HealthResponse(BaseModel):
    """Health endpoint response contract."""

    status: ServiceStatus
    version: str
    environment: str
    components: list[ComponentHealth] = []
