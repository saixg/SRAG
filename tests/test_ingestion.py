"""Ingestion pipeline tests — run against the real RLS-enabled database."""

import uuid

import pytest
from sqlalchemy import delete, select

from srag.contracts.identity import TenantContext
from srag.db.models import EvidenceUnitModel, Tenant
from srag.ingestion.embedder import HashingEmbedder
from srag.ingestion.pipeline import IngestionPipeline
from srag.ingestion.text_processor import TextProcessor


@pytest.mark.asyncio
async def test_ingest_text_document(rls_session):
    """A document is ingested, chunked, embedded, and stored inside its tenant.

    All writes happen through an RLS-bound session for the new tenant, so this
    also verifies that the pipeline's inserts satisfy the RLS policies.
    """
    tenant_id = uuid.uuid4()
    tenant = TenantContext(tenant_id=tenant_id, tenant_name="Test Tenant")

    pipeline = IngestionPipeline(embedder=HashingEmbedder(), processor=TextProcessor())

    raw_text = (
        "Section one. The valve subsystem connects pump A to manifold B. "
        "The pressure rating is 42 bar with a safety margin of 10 percent. "
    ) * 10  # ~1.2k chars -> multiple chunks at chunk_size=1000/overlap=200

    async with rls_session(tenant_id) as session:
        session.add(Tenant(id=tenant_id, name=tenant.tenant_name))
        await session.flush()

        doc = await pipeline.ingest_text_document(
            session=session,
            tenant=tenant,
            filename="test_doc.txt",
            text_content=raw_text,
        )

        assert doc.id is not None
        assert doc.tenant_id == tenant_id
        assert doc.content_hash  # sha256 of the raw text

        result = await session.execute(
            select(EvidenceUnitModel).where(EvidenceUnitModel.document_id == doc.id)
        )
        units = result.scalars().all()

        assert len(units) > 1
        for unit in units:
            assert unit.tenant_id == tenant_id
            assert unit.element_type == "text"
            assert unit.text_content is not None
            assert len(unit.embedding) == 1024
            assert unit.fts_vector is not None  # populated by the DB trigger
            assert unit.provenance["source_filename"] == "test_doc.txt"

    # Cleanup: removing the tenant cascades to its documents and evidence
    async with rls_session(tenant_id) as session:
        await session.execute(delete(Tenant).where(Tenant.id == tenant_id))
        await session.flush()


@pytest.mark.asyncio
async def test_ingest_empty_text_creates_no_evidence(rls_session):
    """An empty document produces a Document row but zero EvidenceUnits."""
    tenant_id = uuid.uuid4()
    tenant = TenantContext(tenant_id=tenant_id, tenant_name="Empty Tenant")

    pipeline = IngestionPipeline(embedder=HashingEmbedder(), processor=TextProcessor())

    async with rls_session(tenant_id) as session:
        session.add(Tenant(id=tenant_id, name=tenant.tenant_name))
        await session.flush()

        doc = await pipeline.ingest_text_document(
            session=session,
            tenant=tenant,
            filename="empty.txt",
            text_content="",
        )

        result = await session.execute(
            select(EvidenceUnitModel).where(EvidenceUnitModel.document_id == doc.id)
        )
        assert result.scalars().all() == []

        await session.execute(delete(Tenant).where(Tenant.id == tenant_id))
        await session.flush()


@pytest.mark.asyncio
async def test_text_processor_chunks():
    """The real splitter produces overlapping, bounded chunks."""
    processor = TextProcessor(chunk_size=100, chunk_overlap=20)
    chunks = processor.chunk_text("word " * 60)

    assert len(chunks) > 1
    for chunk in chunks:
        assert 0 < len(chunk) <= 100
