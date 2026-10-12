import uuid

import pytest

from srag.contracts.evidence import EvidenceType
from srag.contracts.identity import TenantContext
from srag.db.models import Document, EvidenceUnitModel, Tenant
from srag.ingestion.embedder import HashingEmbedder
from srag.retrieval.bundle_builder import EvidenceBundleBuilder
from srag.retrieval.engine import RetrievalEngine


@pytest.mark.asyncio
async def test_multimodal_retrieval_phase2b(rls_session):
    tenant_id = uuid.uuid4()
    tenant_ctx = TenantContext(tenant_id=tenant_id, tenant_name="T")
    embedder = HashingEmbedder()
    embedder.embed_text = lambda q: [0.1] * 1024 if "revenue" in q else [0.0] * 1024
    engine = RetrievalEngine(embedder=embedder)

    async with rls_session(tenant_id) as session:
        session.add(Tenant(id=tenant_id, name="Test Tenant"))
        doc = Document(
            id=uuid.uuid4(),
            tenant_id=tenant_id,
            filename="financial_statement.pdf",
            content_hash="hash_123",
        )
        session.add(doc)
        await session.flush()
        session.add_all(
            [
                EvidenceUnitModel(
                    tenant_id=tenant_id,
                    document_id=doc.id,
                    element_type=EvidenceType.TEXT.value,
                    text_content="The revenue reported in Q3 was $5M.",
                    embedding=[0.1] * 1024,
                    source_location={"page_number": 1, "coordinate_system": "docling"},
                    provenance={
                        "source_filename": "financial_statement.pdf",
                        "extraction_method": "docling",
                    },
                ),
                EvidenceUnitModel(
                    tenant_id=tenant_id,
                    document_id=doc.id,
                    element_type=EvidenceType.TABLE.value,
                    element_id="table_1",
                    text_content="Table: Q3 revenue by department.",
                    structured_content={"raw": "table data"},
                    embedding=[0.1] * 1024,
                    source_location={
                        "page_number": 2,
                        "bbox": [10.0, 20.0, 100.0, 50.0],
                        "coordinate_system": "docling",
                    },
                    provenance={
                        "source_filename": "financial_statement.pdf",
                        "extraction_method": "docling",
                    },
                ),
                EvidenceUnitModel(
                    tenant_id=tenant_id,
                    document_id=doc.id,
                    element_type=EvidenceType.OCR.value,
                    text_content="Scanned revenue report showing $5M.",
                    embedding=[0.1] * 1024,
                    source_location={
                        "page_number": 3,
                        "bbox": [5.0, 5.0, 200.0, 100.0],
                        "coordinate_system": "pixel",
                    },
                    provenance={
                        "source_filename": "financial_statement.pdf",
                        "extraction_method": "paddleocr",
                    },
                ),
                EvidenceUnitModel(
                    tenant_id=tenant_id,
                    document_id=doc.id,
                    element_type=EvidenceType.IMAGE.value,
                    text_content="revenue graph",
                    visual_reference_id="img_001",
                    embedding=None,
                    source_location={
                        "page_number": 4,
                        "bbox": [50.0, 50.0, 300.0, 300.0],
                        "coordinate_system": "docling",
                    },
                    provenance={
                        "source_filename": "financial_statement.pdf",
                        "extraction_method": "docling",
                    },
                ),
            ]
        )
        await session.flush()
        results = await engine.search(session, tenant_ctx, "revenue", top_k=10)
        bundle = EvidenceBundleBuilder.build(tenant_ctx, "What was the revenue?", results)

    assert len(results) == 4
    assert len(bundle.items) == 4
    types_found = {item.element_type for item in bundle.items}
    assert EvidenceType.TEXT in types_found
    assert EvidenceType.TABLE in types_found
    assert EvidenceType.OCR in types_found
    assert EvidenceType.IMAGE in types_found
    for item in bundle.items:
        assert item.source_filename == "financial_statement.pdf"
        assert item.page_number in [1, 2, 3, 4]
        if item.element_type == EvidenceType.IMAGE:
            assert item.visual_reference_id == "img_001"
            assert item.bbox == [50.0, 50.0, 300.0, 300.0]
        if item.element_type == EvidenceType.OCR:
            assert item.coordinate_system == "pixel"
        if item.element_type == EvidenceType.TABLE:
            assert item.element_id == "table_1"
