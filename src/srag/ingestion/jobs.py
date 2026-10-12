"""Async multimodal ingest. Text uploads stay on the request path."""

from __future__ import annotations

import asyncio
import logging
from typing import Any
from uuid import UUID

from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from srag.contracts.identity import TenantContext
from srag.db.models import Document
from srag.db.session import get_session_factory

logger = logging.getLogger(__name__)


class IngestJob(BaseModel):
    document_id: UUID
    tenant_id: UUID
    tenant_name: str
    filename: str
    path: str


async def process_job(job: IngestJob, pipeline: Any | None = None) -> None:
    from srag.ingestion.embedder import get_embedder
    from srag.ingestion.multimodal_pipeline import MultimodalPipeline

    pipe = pipeline or MultimodalPipeline(embedder=get_embedder())
    factory = get_session_factory()
    async with factory() as session:
        try:
            await _bind_tenant(session, job.tenant_id)
            doc = await session.get(Document, job.document_id)
            if doc is None:
                logger.error(
                    "ingest_job_missing_document",
                    extra={"document_id": str(job.document_id)},
                )
                return
            tenant = TenantContext(tenant_id=job.tenant_id, tenant_name=job.tenant_name)
            try:
                await pipe.ingest_document(
                    session=session,
                    tenant=tenant,
                    filename=job.filename,
                    file_path=job.path,
                    metadata=dict(doc.metadata_ or {}),
                    existing=doc,
                )
                meta = dict(doc.metadata_ or {})
                meta["status"] = "ready"
                meta.pop("error", None)
                doc.metadata_ = meta
            except Exception as exc:
                logger.exception("ingest_job_failed")
                meta = dict(doc.metadata_ or {})
                meta["status"] = "failed"
                meta["error"] = type(exc).__name__
                doc.metadata_ = meta
            await session.commit()
        except Exception:
            await session.rollback()
            raise


async def _bind_tenant(session: AsyncSession, tenant_id: UUID) -> None:
    await session.execute(
        text("SELECT set_config('app.current_tenant_id', :tenant_id, true)"),
        {"tenant_id": str(tenant_id)},
    )
    await session.execute(text("SET LOCAL ROLE authenticated"))


def enqueue_redis(job: IngestJob) -> None:
    import redis

    from srag.settings import get_settings

    settings = get_settings()
    if not settings.redis_url:
        raise RuntimeError("REDIS_URL is required to enqueue ingest jobs")
    client = redis.Redis.from_url(settings.redis_url, decode_responses=True, socket_timeout=1)
    client.lpush("srag:ingest", job.model_dump_json())


async def redis_worker(stop: asyncio.Event) -> None:
    import redis

    from srag.settings import get_settings

    settings = get_settings()
    if not settings.redis_url:
        return
    client = redis.Redis.from_url(settings.redis_url, decode_responses=True, socket_timeout=2)
    while not stop.is_set():
        item = await asyncio.to_thread(client.brpop, "srag:ingest", 1)
        if not item:
            continue
        job = IngestJob.model_validate_json(item[1])
        await process_job(job)
