"""Current identity chip for the Copilot header."""

from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from srag.api.auth import get_current_user
from srag.contracts.identity import UserIdentity

router = APIRouter(prefix="/me", tags=["identity"])


class MeResponse(BaseModel):
    user_id: UUID
    tenant_id: UUID
    tenant_name: str
    email: str | None
    roles: list[str]


@router.get("", response_model=MeResponse)
async def me(user: Annotated[UserIdentity, Depends(get_current_user)]) -> MeResponse:
    return MeResponse(
        user_id=user.user_id,
        tenant_id=user.tenant.tenant_id,
        tenant_name=user.tenant.tenant_name,
        email=user.email,
        roles=user.roles,
    )
