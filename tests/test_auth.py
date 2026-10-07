from __future__ import annotations

from uuid import uuid4

import pytest


class FakeSession:
    def __init__(self):
        self.accounts = []

    def add(self, account):
        self.accounts.append(account)

    async def flush(self):
        for account in self.accounts:
            if account.id is None:
                account.id = uuid4()
            if account.is_active is None:
                account.is_active = True

    async def rollback(self):
        return None

    async def get(self, _model, account_id):
        return next((row for row in self.accounts if row.id == account_id), None)


@pytest.fixture
async def configured_client(monkeypatch):
    monkeypatch.setenv("SECRET_KEY", "test-secret-key-with-enough-entropy")
    monkeypatch.setenv("PORTAL_SIGNUP_INVITE_CODE", "company-invite-test-code")
    monkeypatch.setenv("CORS_ORIGINS", "http://localhost:5173")
    from srag.settings import get_settings

    get_settings.cache_clear()

    from httpx import ASGITransport, AsyncClient

    from srag.api import auth
    from srag.app import create_app
    from srag.db.session import get_db_session

    store = FakeSession()

    async def fake_session():
        yield store

    async def find_account(_session, identifier):
        normalized = identifier.strip().casefold()
        return next(
            (
                row
                for row in store.accounts
                if normalized in {row.username.casefold(), row.email.casefold()}
            ),
            None,
        )

    application = create_app()
    application.dependency_overrides[get_db_session] = fake_session
    monkeypatch.setattr(auth, "_find_account", find_account)
    async with AsyncClient(
        transport=ASGITransport(app=application), base_url="http://test"
    ) as client:
        yield client
    get_settings.cache_clear()


async def register_user(client, **overrides):
    payload = {
        "name": "Riley Test",
        "username": "riley.test",
        "email": "riley@example.test",
        "password": "CorrectHorseBatteryStaple!",
        "invite_code": "company-invite-test-code",
    }
    payload.update(overrides)
    return await client.post(
        "/api/v1/auth/register", headers={"Origin": "http://localhost:5173"}, json=payload
    )


@pytest.mark.asyncio
async def test_registration_creates_employee_and_signed_session(configured_client):
    response = await register_user(configured_client)
    assert response.status_code == 200
    assert response.json()["user"]["role"] == "EMPLOYEE"
    assert "password_hash" not in response.json()["user"]
    assert "httponly" in response.headers["set-cookie"].lower()
    session = await configured_client.get("/api/v1/auth/session")
    assert session.status_code == 200
    assert session.json()["user"]["email"] == "riley@example.test"


@pytest.mark.asyncio
async def test_registration_requires_invitation(configured_client):
    response = await register_user(configured_client, invite_code="wrong-code")
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_registration_rejects_duplicate_username_or_email(configured_client):
    first = await register_user(configured_client)
    assert first.status_code == 200
    duplicate = await register_user(configured_client, username="other.user")
    assert duplicate.status_code == 409


@pytest.mark.asyncio
async def test_registration_requires_strong_password(configured_client):
    response = await register_user(configured_client, password="short")
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_password_login_accepts_username_or_email(configured_client):
    await register_user(configured_client)
    await configured_client.post("/api/v1/auth/logout", headers={"Origin": "http://localhost:5173"})
    for identifier in ("Riley.Test", "riley@example.test"):
        response = await configured_client.post(
            "/api/v1/auth/login",
            headers={"Origin": "http://localhost:5173"},
            json={"username": identifier, "password": "CorrectHorseBatteryStaple!"},
        )
        assert response.status_code == 200
        assert response.json()["user"]["email"] == "riley@example.test"
        await configured_client.post(
            "/api/v1/auth/logout", headers={"Origin": "http://localhost:5173"}
        )


@pytest.mark.asyncio
async def test_password_login_rejects_wrong_password(configured_client):
    await register_user(configured_client)
    await configured_client.post("/api/v1/auth/logout", headers={"Origin": "http://localhost:5173"})
    response = await configured_client.post(
        "/api/v1/auth/login",
        headers={"Origin": "http://localhost:5173"},
        json={"username": "riley.test", "password": "incorrect-password"},
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "The username or password is incorrect."


@pytest.mark.asyncio
async def test_login_and_registration_reject_unapproved_origin(configured_client):
    headers = {"Origin": "https://attacker.example"}
    payload = {
        "name": "Riley Test",
        "username": "riley.test",
        "email": "riley@example.test",
        "password": "CorrectHorseBatteryStaple!",
        "invite_code": "company-invite-test-code",
    }
    register = await configured_client.post("/api/v1/auth/register", headers=headers, json=payload)
    login = await configured_client.post(
        "/api/v1/auth/login",
        headers=headers,
        json={"username": "riley.test", "password": "password"},
    )
    assert register.status_code == 403
    assert login.status_code == 403


@pytest.mark.asyncio
async def test_session_requires_login_and_logout_clears_cookie(configured_client):
    denied = await configured_client.get("/api/v1/auth/session")
    assert denied.status_code == 401
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
