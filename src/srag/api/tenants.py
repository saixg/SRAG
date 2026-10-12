"""Create a tenant and user row for a verified Supabase identity."""

from __future__ import annotations

import logging
import uuid
from typing import Annotated

import httpx
from fastapi import APIRouter, Security
from fastapi.security import HTTPAuthorizationCredentials
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from srag.api.auth import _UNAUTH, parse_access_token, security
from srag.api.limits import get_limiter
from srag.db.models import Tenant, User
from srag.db.session import get_session_factory
from srag.settings import get_settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/tenants", tags=["tenants"])


class BootstrapRequest(BaseModel):
    tenant_name: str = Field(default="Workspace", min_length=2, max_length=120)


class BootstrapResponse(BaseModel):
    tenant_id: uuid.UUID
    user_id: uuid.UUID
    created: bool
    claim_updated: bool


@router.post("/bootstrap", response_model=BootstrapResponse)
async def bootstrap_tenant(
    body: BootstrapRequest,
    credentials: Annotated[HTTPAuthorizationCredentials | None, Security(security)],
) -> BootstrapResponse:
    if credentials is None or not credentials.credentials:
        raise _UNAUTH
    claims = parse_access_token(credentials.credentials)
    get_limiter().check(f"bootstrap:{claims.user_id}", 10)
    factory = get_session_factory()
    async with factory() as session:
        try:
            tenant_id, created = await _provision(
                session,
                claims.user_id,
                claims.email,
                body.tenant_name,
                claims.tenant_id,
            )
            await session.commit()
        except Exception:
            await session.rollback()
            raise
    claim_updated = await _publish_claim(claims.user_id, tenant_id, body.tenant_name)
    return BootstrapResponse(
        tenant_id=tenant_id,
        user_id=claims.user_id,
        created=created,
        claim_updated=claim_updated,
    )


async def _provision(
    session: AsyncSession,
    user_id: uuid.UUID,
    email: str | None,
    tenant_name: str,
    existing_tenant_id: uuid.UUID | None,
) -> tuple[uuid.UUID, bool]:
    current = await session.get(User, user_id)
    if current is not None:
        return current.tenant_id, False

    tenant_id = existing_tenant_id or uuid.uuid4()
    tenant = await session.get(Tenant, tenant_id)
    created = tenant is None
    if tenant is None:
        session.add(Tenant(id=tenant_id, name=tenant_name))
        await session.flush()
    session.add(
        User(
            id=user_id,
            tenant_id=tenant_id,
            email=email or f"{user_id}@bootstrap.local",
            roles=["admin", "user"],
            is_active=True,
        )
    )
    await session.flush()
    return tenant_id, created


async def _publish_claim(user_id: uuid.UUID, tenant_id: uuid.UUID, tenant_name: str) -> bool:
    settings = get_settings()
    if settings.supabase_url is None or settings.supabase_service_role_key is None:
        return False
    key = settings.supabase_service_role_key.get_secret_value()
    url = settings.supabase_url.rstrip("/") + f"/auth/v1/admin/users/{user_id}"
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.put(
                url,
                headers={"apikey": key, "Authorization": f"Bearer {key}"},
                json={
                    "app_metadata": {
                        "tenant_id": str(tenant_id),
                        "tenant_name": tenant_name,
                        "roles": ["admin", "user"],
                    }
                },
            )
    except httpx.HTTPError:
        logger.warning("supabase_claim_update_failed")
        return False
    if response.status_code >= 400:
        logger.warning(
            "supabase_claim_update_rejected",
            extra={"status_code": response.status_code},
        )
        return False
    return True
