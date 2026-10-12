"""Identity resolution.

Production and staging verify a Supabase access token (HS256).
Development and testing also accept a static token bound to the seeded
development tenant — never used as a production credential.
"""

from __future__ import annotations

import uuid
from typing import Annotated, Any

import jwt
from fastapi import HTTPException, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from srag.contracts.identity import TenantContext, UserIdentity
from srag.settings import get_settings

security = HTTPBearer(auto_error=False)

DEV_TENANT_ID = uuid.UUID("00000000-0000-4000-8000-000000000001")
DEV_USER_ID = uuid.UUID("11111111-1111-4000-8000-111111111111")
TENANT_A_ID = uuid.UUID("00000000-0000-0000-0000-00000000000a")
TENANT_B_ID = uuid.UUID("00000000-0000-0000-0000-00000000000b")

_UNAUTH = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Invalid authentication credentials",
    headers={"WWW-Authenticate": "Bearer"},
)


def _object_claim(payload: dict[str, Any], key: str) -> dict[str, Any]:
    value = payload.get(key)
    return value if isinstance(value, dict) else {}


def _tenant_id_from_claims(payload: dict[str, Any]) -> uuid.UUID:
    metadata = _object_claim(payload, "app_metadata")
    user_meta = _object_claim(payload, "user_metadata")
    raw = payload.get("tenant_id") or metadata.get("tenant_id") or user_meta.get("tenant_id")
    if raw is None:
        raise _UNAUTH
    try:
        return uuid.UUID(str(raw))
    except ValueError as exc:
        raise _UNAUTH from exc


def _collections_from_claims(payload: dict[str, Any]) -> list[str]:
    metadata = _object_claim(payload, "app_metadata")
    raw = metadata.get("collections") or []
    if not isinstance(raw, list):
        return []
    return [str(item) for item in raw]


def _roles_from_claims(payload: dict[str, Any]) -> list[str]:
    metadata = _object_claim(payload, "app_metadata")
    raw_roles = metadata.get("roles") or []
    roles: list[str] = [str(role) for role in raw_roles] if isinstance(raw_roles, list) else []
    jwt_role = payload.get("role")
    if isinstance(jwt_role, str) and jwt_role not in roles:
        roles.append(jwt_role)
    return roles or ["user"]


def identity_from_jwt_payload(payload: dict[str, Any]) -> UserIdentity:
    sub = payload.get("sub")
    if not sub:
        raise _UNAUTH
    try:
        user_id = uuid.UUID(str(sub))
    except ValueError as exc:
        raise _UNAUTH from exc

    metadata = _object_claim(payload, "app_metadata")
    tenant_id = _tenant_id_from_claims(payload)
    return UserIdentity(
        user_id=user_id,
        tenant=TenantContext(
            tenant_id=tenant_id,
            tenant_name=str(metadata.get("tenant_name") or "tenant"),
        ),
        email=payload.get("email") if isinstance(payload.get("email"), str) else None,
        roles=_roles_from_claims(payload),
        collections=_collections_from_claims(payload),
    )


class AccessClaims:
    """Verified token before a tenant row exists. Bootstrap uses this shape."""

    def __init__(
        self,
        user_id: uuid.UUID,
        email: str | None,
        tenant_id: uuid.UUID | None,
        tenant_name: str | None,
        roles: list[str],
    ) -> None:
        self.user_id = user_id
        self.email = email
        self.tenant_id = tenant_id
        self.tenant_name = tenant_name
        self.roles = roles


def parse_access_token(token: str) -> AccessClaims:
    settings = get_settings()
    if not token:
        raise _UNAUTH
    if settings.allows_dev_token:
        demo = _demo_identities().get(token)
        if token == settings.dev_auth_token or demo is not None:
            identity = demo or UserIdentity(
                user_id=DEV_USER_ID,
                tenant=TenantContext(tenant_id=DEV_TENANT_ID, tenant_name="Development Tenant"),
                email="dev@example.com",
                roles=["engineer", "user"],
            )
            return AccessClaims(
                user_id=identity.user_id,
                email=identity.email,
                tenant_id=identity.tenant_id,
                tenant_name=identity.tenant.tenant_name,
                roles=identity.roles,
            )

    secret = settings.supabase_jwt_secret
    if secret is None:
        raise _UNAUTH
    try:
        payload = jwt.decode(
            token,
            secret.get_secret_value(),
            algorithms=["HS256"],
            audience="authenticated",
            options={"require": ["sub", "exp"]},
        )
    except jwt.PyJWTError as exc:
        raise _UNAUTH from exc
    return _claims_from_payload(payload)


def _claims_from_payload(payload: dict[str, Any]) -> AccessClaims:
    sub = payload.get("sub")
    if not sub:
        raise _UNAUTH
    try:
        user_id = uuid.UUID(str(sub))
    except ValueError as exc:
        raise _UNAUTH from exc
    metadata = _object_claim(payload, "app_metadata")
    user_meta = _object_claim(payload, "user_metadata")
    raw = payload.get("tenant_id") or metadata.get("tenant_id") or user_meta.get("tenant_id")
    tenant_id: uuid.UUID | None
    if raw is None:
        tenant_id = None
    else:
        try:
            tenant_id = uuid.UUID(str(raw))
        except ValueError as exc:
            raise _UNAUTH from exc
    name = metadata.get("tenant_name")
    email = payload.get("email") if isinstance(payload.get("email"), str) else None
    return AccessClaims(
        user_id=user_id,
        email=email,
        tenant_id=tenant_id,
        tenant_name=str(name) if name else None,
        roles=_roles_from_claims(payload),
    )


def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Security(security)],
) -> UserIdentity:
    settings = get_settings()
    token = credentials.credentials if credentials is not None else ""
    if not token:
        raise _UNAUTH

    if settings.allows_dev_token:
        if token == settings.dev_auth_token:
            return UserIdentity(
                user_id=DEV_USER_ID,
                tenant=TenantContext(tenant_id=DEV_TENANT_ID, tenant_name="Development Tenant"),
                email="dev@example.com",
                roles=["engineer", "user"],
            )
        demo = _demo_identities().get(token)
        if demo is not None:
            return demo

    secret = settings.supabase_jwt_secret
    if secret is None:
        raise _UNAUTH

    try:
        payload = jwt.decode(
            token,
            secret.get_secret_value(),
            algorithms=["HS256"],
            audience="authenticated",
            options={"require": ["sub", "exp"]},
        )
    except jwt.PyJWTError as exc:
        raise _UNAUTH from exc

    return identity_from_jwt_payload(payload)


def _demo_identities() -> dict[str, UserIdentity]:
    return {
        "demo_engineer": UserIdentity(
            user_id=DEV_USER_ID,
            tenant=TenantContext(tenant_id=DEV_TENANT_ID, tenant_name="Development Tenant"),
            email="engineer@bevel.dev",
            roles=["engineer", "user"],
        ),
        "demo_admin": UserIdentity(
            user_id=uuid.UUID("11111111-1111-4000-8000-111111111112"),
            tenant=TenantContext(tenant_id=DEV_TENANT_ID, tenant_name="Development Tenant"),
            email="admin@bevel.dev",
            roles=["admin"],
        ),
        "demo_tenant_a": UserIdentity(
            user_id=uuid.UUID("aaaaaaaa-1111-4000-8000-aaaaaaaaaaa1"),
            tenant=TenantContext(tenant_id=TENANT_A_ID, tenant_name="Tenant A"),
            email="a@bevel.dev",
            roles=["user"],
        ),
        "demo_tenant_b": UserIdentity(
            user_id=uuid.UUID("bbbbbbbb-1111-4000-8000-bbbbbbbbbbb1"),
            tenant=TenantContext(tenant_id=TENANT_B_ID, tenant_name="Tenant B"),
            email="b@bevel.dev",
            roles=["user"],
        ),
        "demo_guest": UserIdentity(
            user_id=uuid.UUID("99999999-1111-4000-8000-999999999991"),
            tenant=TenantContext(tenant_id=TENANT_A_ID, tenant_name="Guest"),
            email="guest@bevel.dev",
            roles=["guest"],
        ),
    }
