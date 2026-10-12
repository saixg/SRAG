import uuid

import pytest

from srag.contracts.evidence import EvidenceType
from srag.contracts.identity import TenantContext
from srag.db.models import Document, EvidenceUnitModel, Tenant
from srag.ingestion.embedder import HashingEmbedder
from srag.retrieval.engine import RetrievalEngine


@pytest.mark.asyncio
async def test_multimodal_retrieval(rls_session):
    tenant_id = uuid.uuid4()
    tenant_ctx = TenantContext(tenant_id=tenant_id, tenant_name="T")
    embedder = HashingEmbedder()
    embedder.embed_text = lambda q: [0.1] * 1024 if "financial" in q else [0.0] * 1024
    engine = RetrievalEngine(embedder=embedder)

    async with rls_session(tenant_id) as session:
        session.add(Tenant(id=tenant_id, name="Test Tenant"))
        doc = Document(
            id=uuid.uuid4(), tenant_id=tenant_id, filename="test.pdf", content_hash="hash"
        )
        session.add(doc)
        await session.flush()
        session.add_all(
            [
                EvidenceUnitModel(
                    tenant_id=tenant_id,
                    document_id=doc.id,
                    element_type=EvidenceType.TEXT.value,
                    text_content="financial report summary",
                    embedding=[0.1] * 1024,
                ),
                EvidenceUnitModel(
                    tenant_id=tenant_id,
                    document_id=doc.id,
                    element_type=EvidenceType.TABLE.value,
                    text_content="financial data table q3",
                    structured_content={"raw": "csv"},
                    embedding=[0.2] * 1024,
                ),
                EvidenceUnitModel(
                    tenant_id=tenant_id,
                    document_id=doc.id,
                    element_type=EvidenceType.OCR.value,
                    text_content="scanned invoice financial",
                    embedding=[0.3] * 1024,
                ),
                EvidenceUnitModel(
                    tenant_id=tenant_id,
                    document_id=doc.id,
                    element_type=EvidenceType.IMAGE.value,
                    text_content="chart showing financial growth",
                    visual_reference_id="img_123",
                    embedding=[0.4] * 1024,
                ),
            ]
        )
        await session.flush()
        results = await engine.search(session, tenant_ctx, "financial", top_k=10)

    assert len(results) >= 4
    types = {r.evidence.element_type for r in results}
    assert EvidenceType.TEXT in types
    assert EvidenceType.TABLE in types
    assert EvidenceType.OCR in types
    assert EvidenceType.IMAGE in types
