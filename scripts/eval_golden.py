"""Run the golden retrieval check against the configured database."""

from __future__ import annotations

import asyncio
import os
import uuid
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

os.environ.setdefault("APP_ENV", "testing")
os.environ.setdefault("EMBEDDER_PROVIDER", "hashing")


async def _main() -> int:
    from sqlalchemy import text
    from sqlalchemy.ext.asyncio import AsyncSession

    from srag.db.session import get_session_factory
    from srag.evaluation.golden import evaluate_golden

    factory = get_session_factory()

    @asynccontextmanager
    async def session_for(tenant_id: uuid.UUID | None) -> AsyncGenerator[AsyncSession, None]:
        session = factory()
        try:
            if tenant_id is not None:
                await session.execute(
                    text("SELECT set_config('app.current_tenant_id', :tid, true)"),
                    {"tid": str(tenant_id)},
                )
            await session.execute(text("SET LOCAL ROLE authenticated"))
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()

    report = await evaluate_golden(session_for)
    print(
        f"recall@5={report.recall_at_5} top_answer={report.top_contains_answer} "
        f"isolation={report.isolation}"
    )
    return 0 if report.passed else 1


if __name__ == "__main__":
    raise SystemExit(asyncio.run(_main()))
