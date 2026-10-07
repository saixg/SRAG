from __future__ import annotations

import pytest


@pytest.fixture
async def configured_client(monkeypatch):
    monkeypatch.setenv("SECRET_KEY", "test-secret-key-with-enough-entropy")
    monkeypatch.setenv("GOOGLE_CLIENT_ID", "portal-client-id")
    monkeypatch.setenv("GOOGLE_HOSTED_DOMAIN", "nexustechnologies.example")
    monkeypatch.setenv("CORS_ORIGINS", "http://localhost:5173")
    from srag.settings import get_settings
    get_settings.cache_clear()
    from srag.app import create_app
    from httpx import ASGITransport, AsyncClient
    async with AsyncClient(transport=ASGITransport(app=create_app()), base_url="http://test") as client:
        yield client
    get_settings.cache_clear()


@pytest.mark.asyncio
async def test_google_login_sets_signed_http_only_session(configured_client, monkeypatch):
    from srag.api import auth
    monkeypatch.setattr(auth.id_token, "verify_oauth2_token", lambda *_args: {
        "iss": "https://accounts.google.com", "sub": "google-subject-123", "email": "employee@nexustechnologies.example",
        "email_verified": True, "hd": "nexustechnologies.example", "name": "Nexus Employee",
    })
    response = await configured_client.post("/api/v1/auth/google", headers={"Origin": "http://localhost:5173"}, json={"credential": "fake-test-token-which-is-long"})
    assert response.status_code == 200
    assert response.json()["user"]["role"] == "EMPLOYEE"
    cookie = response.cookies.get("nexus_one_session")
    assert cookie and response.headers.get("set-cookie", "").lower().find("httponly") >= 0
    session = await configured_client.get("/api/v1/auth/session", cookies={"nexus_one_session": cookie})
    assert session.status_code == 200
    assert session.json()["user"]["email"] == "employee@nexustechnologies.example"


@pytest.mark.asyncio
async def test_google_login_rejects_unapproved_workspace_domain(configured_client, monkeypatch):
    from srag.api import auth
    monkeypatch.setattr(auth.id_token, "verify_oauth2_token", lambda *_args: {
        "iss": "accounts.google.com", "sub": "subject", "email": "someone@outside.example",
        "email_verified": True, "hd": "outside.example",
    })
    response = await configured_client.post("/api/v1/auth/google", headers={"Origin": "http://localhost:5173"}, json={"credential": "fake-test-token-which-is-long"})
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_session_requires_valid_cookie_and_logout_clears_it(configured_client):
    denied = await configured_client.get("/api/v1/auth/session")
    assert denied.status_code == 401
    response = await configured_client.post("/api/v1/auth/logout", headers={"Origin": "http://localhost:5173"})
    assert response.status_code == 200
    assert "nexus_one_session" in response.headers.get("set-cookie", "")


@pytest.mark.asyncio
async def test_health_route_remains_available(configured_client):
    response = await configured_client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"
