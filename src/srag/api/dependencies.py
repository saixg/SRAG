"""Request-scoped dependencies. Database access is always tenant-bound."""

from __future__ import annotations

from collections.abc import AsyncGenerator

from fastapi import Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from srag.api.auth import get_current_user
from srag.contracts.identity import UserIdentity
from srag.db.session import get_session_factory


async def get_secure_db_session(
    user: UserIdentity = Depends(get_current_user),
) -> AsyncGenerator[AsyncSession, None]:
    """Yield a session with app.current_tenant_id set, then SET ROLE authenticated.

    RLS policies are the isolation boundary. The application role must not
    bypass RLS; FORCE RLS is required on tenant tables.
    """
    factory = get_session_factory()
    async with factory() as session:
        try:
            await session.execute(
                text("SELECT set_config('app.current_tenant_id', :tenant_id, true)"),
                {"tenant_id": str(user.tenant_id)},
            )
            await session.execute(text("SET LOCAL ROLE authenticated"))
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
