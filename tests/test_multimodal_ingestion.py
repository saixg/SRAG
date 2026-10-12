import uuid
from unittest.mock import patch

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from srag.contracts.evidence import EvidenceType
from srag.contracts.identity import TenantContext
from srag.db.models import EvidenceUnitModel, Tenant
from srag.ingestion.embedder import HashingEmbedder
from srag.ingestion.multimodal_pipeline import MultimodalPipeline


@pytest.fixture
def mock_docling_extraction():
    return [
        {
            "element_id": "text_0",
            "element_type": EvidenceType.TEXT.value,
            "text_content": "This is a native text paragraph.",
            "source_location": {
                "page_number": 1,
                "bbox": [10.0, 20.0, 100.0, 40.0],
                "coordinate_system": "docling_absolute",
            },
            "provenance": {"source_filename": "test.pdf", "extraction_method": "docling_text"},
        },
        {
            "element_id": "table_0",
            "element_type": EvidenceType.TABLE.value,
            "text_content": "Table Content here",
            "structured_content": {"raw": "table"},
            "source_location": {
                "page_number": 2,
                "bbox": [10.0, 50.0, 200.0, 150.0],
                "coordinate_system": "docling_absolute",
            },
            "provenance": {"source_filename": "test.pdf", "extraction_method": "docling_table"},
        },
    ]


@pytest.fixture
def mock_ocr_extraction():
    return [
        {
            "element_id": "ocr_0",
            "element_type": EvidenceType.OCR.value,
            "text_content": "Scanned text from image.",
            "source_location": {
                "page_number": 1,
                "bbox": [5, 5, 50, 20],
                "coordinate_system": "pixel",
            },
            "provenance": {
                "source_filename": "scan.jpg",
                "extraction_method": "paddleocr",
                "confidence": 0.98,
            },
        }
    ]


@pytest.mark.asyncio
@patch("srag.ingestion.multimodal_pipeline.extract_with_docling")
async def test_multimodal_ingest_pdf(
    mock_extract, mock_docling_extraction, db_session: AsyncSession, tmp_path
):
    """Test that a PDF produces text and table evidence units with proper ACL and provenance."""
    mock_extract.return_value = mock_docling_extraction

    embedder = HashingEmbedder()
    pipeline = MultimodalPipeline(embedder=embedder)

    tenant_id = uuid.uuid4()
    tenant_obj = Tenant(id=tenant_id, name="Test Tenant")
    db_session.add(tenant_obj)
    await db_session.flush()
    tenant = TenantContext(tenant_id=tenant_id, tenant_name="Tenant")
    pdf_path = tmp_path / "test.pdf"
    pdf_path.write_bytes(b"%PDF-1.4 test")
    metadata = {"acl": {"group": "finance"}}
    doc = await pipeline.ingest_document(
        session=db_session,
        tenant=tenant,
        filename="test.pdf",
        file_path=str(pdf_path),
        metadata=metadata,
    )

    assert doc.tenant_id == tenant_id
    assert doc.metadata_["acl"]["group"] == "finance"

    # Check Evidence Units
    result = await db_session.execute(
        select(EvidenceUnitModel).where(EvidenceUnitModel.document_id == doc.id)
    )
    units = result.scalars().all()

    assert len(units) == 2

    # Validate Text Unit
    text_unit = next(u for u in units if u.element_type == EvidenceType.TEXT.value)
    assert text_unit.tenant_id == tenant_id
    assert text_unit.text_content == "This is a native text paragraph."
    assert text_unit.security_scope["group"] == "finance"
    assert text_unit.source_location["page_number"] == 1
    assert text_unit.provenance["extraction_method"] == "docling_text"
    assert len(text_unit.embedding) == 1024  # default embedder dimension

    # Validate Table Unit
    table_unit = next(u for u in units if u.element_type == EvidenceType.TABLE.value)
    assert table_unit.tenant_id == tenant_id
    assert table_unit.structured_content == {"raw": "table"}
    assert table_unit.source_location["bbox"] == [10.0, 50.0, 200.0, 150.0]
    assert len(table_unit.embedding) == 1024


@pytest.mark.asyncio
@patch("srag.ingestion.multimodal_pipeline.extract_with_ocr")
async def test_multimodal_ingest_image_ocr(
    mock_extract, mock_ocr_extraction, db_session: AsyncSession, tmp_path
):
    """Test that an image processes via OCR and returns spatial OCR text."""
    mock_extract.return_value = mock_ocr_extraction

    embedder = HashingEmbedder()
    pipeline = MultimodalPipeline(embedder=embedder)

    tenant_id = uuid.uuid4()
    tenant_obj = Tenant(id=tenant_id, name="Test Tenant")
    db_session.add(tenant_obj)
    await db_session.flush()
    tenant = TenantContext(tenant_id=tenant_id, tenant_name="Tenant")
    image_path = tmp_path / "scan.jpg"
    image_path.write_bytes(b"fake-image")
    doc = await pipeline.ingest_document(
        session=db_session, tenant=tenant, filename="scan.jpg", file_path=str(image_path)
    )

    assert doc.tenant_id == tenant_id

    result = await db_session.execute(
        select(EvidenceUnitModel).where(EvidenceUnitModel.document_id == doc.id)
    )
    units = result.scalars().all()

    assert len(units) == 1
    ocr_unit = units[0]
    assert ocr_unit.tenant_id == tenant_id
    assert ocr_unit.element_type == EvidenceType.OCR.value
    assert ocr_unit.text_content == "Scanned text from image."
    assert ocr_unit.source_location["coordinate_system"] == "pixel"
    assert ocr_unit.provenance["confidence"] == 0.98
    assert len(ocr_unit.embedding) == 1024


@pytest.mark.asyncio
@patch("srag.ingestion.multimodal_pipeline.extract_with_ocr")
@patch("srag.ingestion.multimodal_pipeline.extract_with_docling")
async def test_pdf_falls_back_to_ocr_when_docling_empty(
    mock_docling, mock_ocr, mock_ocr_extraction, db_session: AsyncSession, tmp_path
):
    mock_docling.return_value = []
    mock_ocr.return_value = mock_ocr_extraction
    pipeline = MultimodalPipeline(embedder=HashingEmbedder())
    tenant_id = uuid.uuid4()
    db_session.add(Tenant(id=tenant_id, name="OCR Fallback"))
    await db_session.flush()
    pdf_path = tmp_path / "scan.pdf"
    pdf_path.write_bytes(b"%PDF-1.4 scan")
    doc = await pipeline.ingest_document(
        session=db_session,
        tenant=TenantContext(tenant_id=tenant_id, tenant_name="t"),
        filename="scan.pdf",
        file_path=str(pdf_path),
    )
    result = await db_session.execute(
        select(EvidenceUnitModel).where(EvidenceUnitModel.document_id == doc.id)
    )
    units = result.scalars().all()
    assert len(units) == 1
    assert units[0].element_type == EvidenceType.OCR.value
