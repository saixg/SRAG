import uuid
from datetime import UTC, datetime, timedelta

import jwt
import pytest
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials
from pydantic import SecretStr

from srag.api.auth import DEV_TENANT_ID, DEV_USER_ID, get_current_user
from srag.settings import get_settings


def test_get_current_user_valid_dev_token():
    get_settings.cache_clear()
    creds = HTTPAuthorizationCredentials(scheme="Bearer", credentials="dev_token_123")
    user = get_current_user(creds)
    assert user.user_id == DEV_USER_ID
    assert user.tenant_id == DEV_TENANT_ID
    assert user.tenant_context.tenant_id == DEV_TENANT_ID
    assert "user" in user.roles


def test_get_current_user_invalid_token():
    creds = HTTPAuthorizationCredentials(scheme="Bearer", credentials="wrong_token")
    with pytest.raises(HTTPException) as exc_info:
        get_current_user(creds)
    assert exc_info.value.status_code == 401


def test_supabase_jwt_requires_tenant(monkeypatch):
    get_settings.cache_clear()
    secret = "jwt-test-secret"
    monkeypatch.setenv("SUPABASE_JWT_SECRET", secret)
    get_settings.cache_clear()
    from srag.settings import Settings

    settings = Settings(_env_file=None)  # type: ignore[call-arg]
    # Patch cached settings used by auth
    monkeypatch.setattr(
        "srag.api.auth.get_settings",
        lambda: settings.model_copy(update={"supabase_jwt_secret": SecretStr(secret)}),
    )

    payload = {
        "sub": str(uuid.uuid4()),
        "aud": "authenticated",
        "role": "authenticated",
        "exp": datetime.now(UTC) + timedelta(hours=1),
        "email": "user@example.com",
    }
    token = jwt.encode(payload, secret, algorithm="HS256")
    creds = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)
    with pytest.raises(HTTPException) as exc_info:
        get_current_user(creds)
    assert exc_info.value.status_code == 401


def test_supabase_jwt_with_tenant_claim(monkeypatch):
    secret = "jwt-test-secret"
    tenant_id = uuid.uuid4()
    user_id = uuid.uuid4()
    from srag.settings import Settings

    settings = Settings(_env_file=None)  # type: ignore[call-arg]
    monkeypatch.setattr(
        "srag.api.auth.get_settings",
        lambda: settings.model_copy(update={"supabase_jwt_secret": SecretStr(secret)}),
    )
    payload = {
        "sub": str(user_id),
        "aud": "authenticated",
        "role": "authenticated",
        "exp": datetime.now(UTC) + timedelta(hours=1),
        "email": "user@example.com",
        "app_metadata": {"tenant_id": str(tenant_id), "tenant_name": "Acme", "roles": ["user"]},
    }
    token = jwt.encode(payload, secret, algorithm="HS256")
    user = get_current_user(HTTPAuthorizationCredentials(scheme="Bearer", credentials=token))
    assert user.user_id == user_id
    assert user.tenant_id == tenant_id
    assert user.email == "user@example.com"
