"""Tenant-scoped audit log listing."""

from __future__ import annotations

from datetime import datetime
from typing import Annotated, Any
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from srag.api.auth import get_current_user
from srag.api.dependencies import get_secure_db_session
from srag.contracts.identity import UserIdentity
from srag.db.models import AuditLog

router = APIRouter(prefix="/audit", tags=["audit"])


class AuditEventResponse(BaseModel):
    id: UUID
    tenant_id: UUID
    user_id: UUID | None
    action: str
    resource_type: str | None
    resource_id: str | None
    details: dict[str, Any] | None
    created_at: datetime


@router.get("", response_model=list[AuditEventResponse])
async def list_audit_events(
    session: Annotated[AsyncSession, Depends(get_secure_db_session)],
    user: Annotated[UserIdentity, Depends(get_current_user)],
    limit: Annotated[int, Query(ge=1, le=200)] = 50,
) -> list[AuditEventResponse]:
    rows = (
        (
            await session.execute(
                select(AuditLog).order_by(AuditLog.created_at.desc()).limit(limit)
            )
        )
        .scalars()
        .all()
    )
    return [
        AuditEventResponse(
            id=row.id,
            tenant_id=row.tenant_id,
            user_id=row.user_id,
            action=row.action,
            resource_type=row.resource_type,
            resource_id=row.resource_id,
            details=row.details,
            created_at=row.created_at,
        )
        for row in rows
    ]
