"""Ingest the downloaded EnterpriseRAG-Bench subset into its own tenant.

Runs the documents through the normal IngestService path, so chunking,
embedding and tenant stamping are identical to an HTTP upload; only the ACL is
synthesised, from the source system each document came out of.

    python scripts/download_enterprise_bench.py
    python scripts/ingest_enterprise_bench.py

Re-running skips documents already ingested, so a long load can be resumed.
"""

from __future__ import annotations

import argparse
import asyncio
import os
import sys
import uuid
from pathlib import Path

from sqlalchemy import select, text
from sqlalchemy.exc import DBAPIError
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from srag.api.auth import BENCH_TENANT_ID
from srag.contracts.identity import TenantContext
from srag.datasets.enterprise_bench import (
    dsid_from_name,
    gold_doc_ids,
    ingest_corpus,
    load_questions,
    read_manifest,
)
from srag.db.models import Document, Tenant
from srag.db.session import create_engine_from_settings
from srag.ingestion.embedder import get_embedder
from srag.ingestion.ingest_service import IngestService
from srag.settings import get_settings


def _use_all_cores() -> None:
    """BGE-M3 on CPU defaults to physical cores; the corpus is large enough
    that the ~25% from using every logical core is worth an hour."""
    try:
        import torch
    except (ImportError, OSError):
        return
    torch.set_num_threads(os.cpu_count() or torch.get_num_threads())


DEFAULT_ROOT = Path(__file__).parent.parent / "data" / "enterprise_bench"
BENCH_TENANT = TenantContext(tenant_id=BENCH_TENANT_ID, tenant_name="EnterpriseRAG-Bench")


async def _bind(session: AsyncSession, tenant_id: uuid.UUID) -> None:
    await session.execute(
        text("SELECT set_config('app.current_tenant_id', :tid, true)"),
        {"tid": str(tenant_id)},
    )
    await session.execute(text("SET LOCAL ROLE authenticated"))


async def _main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=DEFAULT_ROOT)
    parser.add_argument(
        "--limit", type=int, default=None, help="Ingest at most this many documents"
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=25,
        help="Documents between progress lines. Each document commits on its own, "
        "so a dropped connection never costs more than one.",
    )
    args = parser.parse_args()

    root: Path = args.root
    manifest = root / "manifest.txt"
    if not manifest.exists():
        print(f"no manifest at {manifest} — run scripts/download_enterprise_bench.py first")
        return 1

    members = read_manifest(manifest)
    gold = gold_doc_ids(load_questions(root / "questions.jsonl", root / "extra_questions.jsonl"))
    documents_dir = root / "documents"

    settings = get_settings()
    _use_all_cores()
    # Shared factory: TCP keepalives, pool recycling and pre-ping. Embedding a
    # batch leaves the connection idle for minutes, which is exactly when an
    # un-kept-alive socket gets dropped by a NAT on the way to the pooler.
    # echo=False regardless of APP_DEBUG: echoing these INSERTs would print a
    # ~20KB vector literal per evidence row, which costs more than the insert.
    engine = create_engine_from_settings(settings, echo=False)
    factory = async_sessionmaker(engine, expire_on_commit=False)
    service = IngestService(embedder=get_embedder())

    try:
        async with factory() as session:
            await _bind(session, BENCH_TENANT_ID)
            tenant = (
                await session.execute(select(Tenant).where(Tenant.id == BENCH_TENANT_ID))
            ).scalar_one_or_none()
            if tenant is None:
                session.add(Tenant(id=BENCH_TENANT_ID, name=BENCH_TENANT.tenant_name))
            already = {
                row[0]
                for row in (
                    await session.execute(select(Document.metadata_["dsid"].as_string()))
                ).all()
                if row[0]
            }
            await session.commit()

        pending = [
            name
            for name in members
            if (documents_dir / name).exists() and dsid_from_name(name) not in already
        ]
        # Gold documents first: a local embedding model takes hours over the
        # whole corpus, and the documents the questions expect are the ones an
        # evaluation cannot run without.
        pending.sort(key=lambda name: dsid_from_name(name) not in gold)
        if args.limit is not None:
            pending = pending[: args.limit]
        print(f"{len(members)} in manifest, {len(already)} already ingested, {len(pending)} to go")

        done = 0
        failed = 0
        for start in range(0, len(pending), args.batch_size):
            batch = pending[start : start + args.batch_size]
            for name in batch:
                try:
                    await _ingest_one(factory, service, documents_dir, name, gold)
                except DBAPIError as exc:
                    # The link to the pooler can break mid-INSERT. Only this
                    # document is uncommitted, so the next run picks it up.
                    failed += 1
                    print(f"  {name} failed, will need a re-run: {type(exc).__name__}")
                    continue
                done += 1
            print(f"  ingested {done}/{len(pending)}")
    finally:
        await engine.dispose()

    if failed:
        print(f"{failed} documents were not committed — re-run to pick them up")
    print(f"done — tenant {BENCH_TENANT_ID}")
    return 0


async def _ingest_one(
    factory: async_sessionmaker[AsyncSession],
    service: IngestService,
    documents_dir: Path,
    name: str,
    gold: set[str],
) -> None:
    """Commit one document, retrying a dropped connection on a fresh session.

    One document per transaction on purpose. Embedding runs inside the session,
    so a whole batch here meant holding a connection — and an open transaction
    — for minutes while the GPU worked. Nothing on the Supabase side closes
    those connections (no statement_timeout hit, idle_in_transaction disabled,
    connections nowhere near max_connections), but the link to the pooler does
    break now and then: Supavisor logs it as "Client socket closed while state
    was busy". Per-document transactions cut the window in which that costs
    anything from minutes to seconds, and cost one document instead of twenty.
    """
    for attempt in range(3):
        try:
            async with factory() as session:
                await _bind(session, BENCH_TENANT_ID)
                await ingest_corpus(
                    session=session,
                    tenant=BENCH_TENANT,
                    service=service,
                    root=documents_dir,
                    members=[name],
                    gold_ids=gold,
                )
                await session.commit()
            return
        except DBAPIError:
            if attempt == 2:
                raise
            await asyncio.sleep(2 * (attempt + 1))


if __name__ == "__main__":
    raise SystemExit(asyncio.run(_main()))
