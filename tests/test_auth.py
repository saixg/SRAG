from __future__ import annotations

import hashlib
import json

import pytest


@pytest.fixture
async def configured_client(monkeypatch):
    monkeypatch.setenv("SECRET_KEY", "test-secret-key-with-enough-entropy")
    monkeypatch.setenv("PORTAL_USERS_JSON", "[]")
    monkeypatch.setenv("CORS_ORIGINS", "http://localhost:5173")
    from srag.settings import get_settings

    get_settings.cache_clear()
    from httpx import ASGITransport, AsyncClient

    from srag.app import create_app

    async with AsyncClient(
        transport=ASGITransport(app=create_app()), base_url="http://test"
    ) as client:
        yield client
    get_settings.cache_clear()


def account_record(password: str = "CorrectHorseBatteryStaple!") -> dict[str, str]:
    salt = b"test-only-salt-1234"
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 600_000).hex()
    return {
        "id": "employee-42",
        "username": "riley.test",
        "name": "Riley Test",
        "email": "riley@example.test",
        "role": "MANAGER",
        "roleTitle": "Team Manager",
        "department": "People",
        "password_hash": f"pbkdf2_sha256$600000${salt.hex()}${digest}",
    }


@pytest.mark.asyncio
@pytest.mark.parametrize("login_identifier", ["Riley.Test", "Riley@example.test"])
async def test_password_login_sets_signed_http_only_session(
    configured_client, monkeypatch, login_identifier
):
    from srag.settings import get_settings

    monkeypatch.setenv("PORTAL_USERS_JSON", json.dumps([account_record()]))
    get_settings.cache_clear()
    response = await configured_client.post(
        "/api/v1/auth/login",
        headers={"Origin": "http://localhost:5173"},
        json={"username": login_identifier, "password": "CorrectHorseBatteryStaple!"},
    )
    assert response.status_code == 200
    assert response.json()["user"]["role"] == "MANAGER"
    cookie = response.cookies.get("nexus_one_session")
    assert cookie and "httponly" in response.headers["set-cookie"].lower()
    session = await configured_client.get("/api/v1/auth/session")
    assert session.status_code == 200
    assert session.json()["user"]["email"] == "riley@example.test"


@pytest.mark.asyncio
async def test_password_login_rejects_wrong_password(configured_client, monkeypatch):
    from srag.settings import get_settings

    monkeypatch.setenv("PORTAL_USERS_JSON", json.dumps([account_record()]))
    get_settings.cache_clear()
    response = await configured_client.post(
        "/api/v1/auth/login",
        headers={"Origin": "http://localhost:5173"},
        json={"username": "riley.test", "password": "incorrect-password"},
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "The username or password is incorrect."


@pytest.mark.asyncio
async def test_password_login_has_no_automatic_or_demo_account(configured_client):
    response = await configured_client.post(
        "/api/v1/auth/login",
        headers={"Origin": "http://localhost:5173"},
        json={"username": "demo", "password": "demo"},
    )
    assert response.status_code == 401
    session = await configured_client.get("/api/v1/auth/session")
    assert session.status_code == 401


@pytest.mark.asyncio
async def test_password_login_rejects_unapproved_origin(configured_client):
    response = await configured_client.post(
        "/api/v1/auth/login",
        headers={"Origin": "https://attacker.example"},
        json={"username": "riley.test", "password": "password"},
    )
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_logout_clears_session_cookie(configured_client):
    response = await configured_client.post(
        "/api/v1/auth/logout", headers={"Origin": "http://localhost:5173"}
    )
    assert response.status_code == 200
    assert "nexus_one_session" in response.headers.get("set-cookie", "")


@pytest.mark.asyncio
async def test_health_route_remains_available(configured_client):
    response = await configured_client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"
