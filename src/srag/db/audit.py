"""Append-only audit writes. Must run inside an RLS-bound session."""

from __future__ import annotations

from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from srag.contracts.identity import UserIdentity
from srag.db.models import AuditLog


async def record_audit(
    session: AsyncSession,
    user: UserIdentity,
    action: str,
    *,
    resource_type: str | None = None,
    resource_id: str | None = None,
    details: dict[str, Any] | None = None,
) -> None:
    session.add(
        AuditLog(
            tenant_id=user.tenant_id,
            user_id=user.user_id,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            details=details,
        )
    )
