"""Identity contracts — typed models for user and tenant context.

These contracts represent the security-critical identity information
that flows through the authorization pipeline. They are NOT authentication
implementations — they define the typed shape of resolved identity.
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

from pydantic import BaseModel, Field


class TenantContext(BaseModel):
    """Resolved tenant context.

    Every database query involving tenant-scoped data must carry this context.
    RLS policies use tenant_id as the isolation boundary.
    """

    tenant_id: uuid.UUID
    tenant_name: str


class UserIdentity(BaseModel):
    """Resolved authenticated user identity.

    This is the result of authentication, not the mechanism.
    It carries the information needed for downstream authorization decisions.
    """

    user_id: uuid.UUID
    tenant: TenantContext
    email: str | None = None
    roles: list[str] = Field(default_factory=list)
    authenticated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))

    @property
    def tenant_id(self) -> uuid.UUID:
        """Convenience accessor for the tenant isolation key."""
        return self.tenant.tenant_id
