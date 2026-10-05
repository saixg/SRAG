"""Tests for the health endpoint — /api/v1/health."""

from __future__ import annotations

import pytest


@pytest.mark.asyncio
async def test_health_endpoint_returns_200(client):
    """Health endpoint should return 200 with expected structure."""
    response = await client.get("/api/v1/health")
    assert response.status_code == 200

    data = response.json()
    assert data["status"] == "healthy"
    assert data["version"] == "0.1.0"
    assert data["environment"] == "testing"
    assert isinstance(data["components"], list)
    assert len(data["components"]) > 0


@pytest.mark.asyncio
async def test_health_endpoint_contains_api_component(client):
    """Health response should include the API component."""
    response = await client.get("/api/v1/health")
    data = response.json()

    component_names = [c["name"] for c in data["components"]]
    assert "api" in component_names

    api_component = next(c for c in data["components"] if c["name"] == "api")
    assert api_component["status"] == "healthy"


@pytest.mark.asyncio
async def test_health_response_matches_contract(client):
    """Health response should conform to the HealthResponse contract."""
    response = await client.get("/api/v1/health")
    data = response.json()

    # Required fields
    assert "status" in data
    assert "version" in data
    assert "environment" in data
    assert "components" in data

    # Status is a valid enum value
    assert data["status"] in ("healthy", "degraded", "unhealthy")

    # Each component has required fields
    for component in data["components"]:
        assert "name" in component
        assert "status" in component
        assert component["status"] in ("healthy", "degraded", "unhealthy")
