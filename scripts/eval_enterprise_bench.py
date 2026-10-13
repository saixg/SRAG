"""Score retrieval and access control over the ingested EnterpriseRAG-Bench corpus.

    python scripts/eval_enterprise_bench.py --top-k 10

Uses whatever embedder the environment configures, which must be the one the
corpus was ingested with: BGE-M3 vectors and hashing vectors do not share a
space, so a mismatch reads as a retrieval failure rather than a config error.
Exits non-zero if any evidence reached a persona that was not entitled to it.
"""

from __future__ import annotations

import argparse
import asyncio
import sys
import uuid
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from srag.api.auth import BENCH_TENANT_ID, DEV_TENANT_ID
from srag.contracts.identity import TenantContext
from srag.db.session import create_engine_from_settings
from srag.evaluation.enterprise_bench import evaluate_enterprise_bench
from srag.ingestion.embedder import build_embedder
from srag.settings import get_settings

DEFAULT_ROOT = Path(__file__).parent.parent / "data" / "enterprise_bench"


async def _main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=DEFAULT_ROOT)
    parser.add_argument("--top-k", type=int, default=10)
    parser.add_argument("--limit", type=int, default=None, help="Score at most this many questions")
    args = parser.parse_args()

    settings = get_settings()
    engine = create_engine_from_settings(settings)
    factory = async_sessionmaker(engine, expire_on_commit=False)

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

    embedder = build_embedder()
    print(
        f"embedder={type(embedder).__name__} provider={settings.embedder_provider.value} "
        f"device={settings.embedder_device.value}"
    )
    try:
        report = await evaluate_enterprise_bench(
            session_for=session_for,
            tenant=TenantContext(tenant_id=BENCH_TENANT_ID, tenant_name="EnterpriseRAG-Bench"),
            other_tenant_id=DEV_TENANT_ID,
            embedder=embedder,
            root=args.root,
            top_k=args.top_k,
            limit=args.limit,
        )
    finally:
        await engine.dispose()

    for line in report.lines():
        print(line)
    return 0 if report.passed else 1


if __name__ == "__main__":
    raise SystemExit(asyncio.run(_main()))
