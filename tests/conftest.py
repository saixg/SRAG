"""Shared test fixtures and configuration."""

from __future__ import annotations

import os

import pytest
from httpx import ASGITransport, AsyncClient

# Force testing environment before any settings are loaded
os.environ["APP_ENV"] = "testing"
os.environ["APP_DEBUG"] = "false"


@pytest.fixture
def app():
    """Create a fresh FastAPI application for testing."""
    # Clear cached settings so each test gets a clean state
    from srag.settings import get_settings

    get_settings.cache_clear()

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
