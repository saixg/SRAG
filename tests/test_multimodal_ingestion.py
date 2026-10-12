import io
import sys
import types
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
from srag.settings import get_settings


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


# --- 2.3: visual evidence actually carries bytes -----------------------------


@pytest.mark.asyncio
@patch("srag.ingestion.multimodal_pipeline.extract_with_ocr")
async def test_image_upload_stores_the_file_bytes_once(
    mock_extract, mock_ocr_extraction, db_session: AsyncSession, tmp_path, monkeypatch
):
    """Every OCR line shares one visual_reference_id; store_visual fires once."""
    monkeypatch.setenv("VISUAL_STORE_DIR", str(tmp_path / "visuals"))
    get_settings.cache_clear()
    from srag.ingestion.visual_store import load_visual

    second_line = {
        "element_id": "ocr_1",
        "element_type": EvidenceType.OCR.value,
        "text_content": "Second line.",
        "source_location": {
            "page_number": 1,
            "bbox": [5, 25, 50, 40],
            "coordinate_system": "pixel",
        },
        "provenance": {"source_filename": "scan.jpg", "extraction_method": "paddleocr"},
    }
    mock_extract.return_value = [*mock_ocr_extraction, second_line]

    tenant_id = uuid.uuid4()
    db_session.add(Tenant(id=tenant_id, name="Visuals"))
    await db_session.flush()
    tenant = TenantContext(tenant_id=tenant_id, tenant_name="Visuals")
    image_path = tmp_path / "scan.jpg"
    image_path.write_bytes(b"real-image-bytes")

    pipeline = MultimodalPipeline(embedder=HashingEmbedder())
    doc = await pipeline.ingest_document(
        session=db_session, tenant=tenant, filename="scan.jpg", file_path=str(image_path)
    )

    result = await db_session.execute(
        select(EvidenceUnitModel).where(EvidenceUnitModel.document_id == doc.id)
    )
    units = result.scalars().all()
    assert len(units) == 2
    assert {u.visual_reference_id for u in units} == {"scan.jpg_image"}
    for unit in units:
        assert unit.structured_content["content_type"] == "image/jpeg"

    assert load_visual(tenant_id, "scan.jpg_image") == b"real-image-bytes"
    get_settings.cache_clear()


@pytest.mark.asyncio
@patch("srag.ingestion.multimodal_pipeline.extract_with_ocr")
async def test_image_with_no_ocr_text_still_stores_the_image(
    mock_extract, db_session: AsyncSession, tmp_path, monkeypatch
):
    """OCR found nothing (or isn't installed): one IMAGE unit, image bytes, no
    placeholder text — nothing gets embedded for it."""
    monkeypatch.setenv("VISUAL_STORE_DIR", str(tmp_path / "visuals"))
    get_settings.cache_clear()
    from srag.ingestion.visual_store import load_visual

    mock_extract.return_value = []

    tenant_id = uuid.uuid4()
    db_session.add(Tenant(id=tenant_id, name="BlankOCR"))
    await db_session.flush()
    tenant = TenantContext(tenant_id=tenant_id, tenant_name="BlankOCR")
    image_path = tmp_path / "blank.png"
    image_path.write_bytes(b"png-bytes")

    pipeline = MultimodalPipeline(embedder=HashingEmbedder())
    doc = await pipeline.ingest_document(
        session=db_session, tenant=tenant, filename="blank.png", file_path=str(image_path)
    )

    result = await db_session.execute(
        select(EvidenceUnitModel).where(EvidenceUnitModel.document_id == doc.id)
    )
    units = result.scalars().all()
    assert len(units) == 1
    unit = units[0]
    assert unit.element_type == EvidenceType.IMAGE.value
    assert unit.text_content is None
    assert unit.embedding is None
    assert unit.visual_reference_id == "blank.png_image"
    assert load_visual(tenant_id, "blank.png_image") == b"png-bytes"
    get_settings.cache_clear()


def _install_fake_docling(
    monkeypatch, *, picture_image_bytes: bytes | None, raise_on_get_image: bool = False
) -> None:
    """Inject a minimal fake docling package into sys.modules.

    docling/paddleocr aren't installed in this dev venv, so this is the only
    way to exercise extract_with_docling's picture-image path deterministically
    without the real library.
    """

    class _FakeImage:
        def __init__(self, payload: bytes) -> None:
            self._payload = payload

        def save(self, buffer: io.BytesIO, format: str | None = None) -> None:
            buffer.write(self._payload)

    class _FakePicture:
        def get_image(self, document: object) -> "_FakeImage | None":
            if raise_on_get_image:
                raise RuntimeError("simulated Docling API mismatch")
            if picture_image_bytes is None:
                return None
            return _FakeImage(picture_image_bytes)

    class _FakeDocument:
        def __init__(self) -> None:
            self.pictures = [_FakePicture()]

        def export_to_dict(self) -> dict:
            return {
                "texts": [],
                "tables": [],
                "pictures": [
                    {
                        "text": "",
                        "prov": [{"page_no": 1, "bbox": {"l": 0, "t": 0, "r": 10, "b": 10}}],
                    }
                ],
            }

    class _FakeConvertResult:
        def __init__(self) -> None:
            self.document = _FakeDocument()

    class _FakeDocumentConverter:
        def __init__(self, format_options: object | None = None) -> None:
            self.format_options = format_options

        def convert(self, file_path: str) -> "_FakeConvertResult":
            return _FakeConvertResult()

    class _FakePdfPipelineOptions:
        def __init__(self) -> None:
            self.generate_picture_images = False
            self.images_scale = 1.0

    class _FakePdfFormatOption:
        def __init__(self, pipeline_options: object | None = None) -> None:
            self.pipeline_options = pipeline_options

    class _FakeInputFormat:
        PDF = "pdf"

    document_converter_module = types.ModuleType("docling.document_converter")
    document_converter_module.DocumentConverter = _FakeDocumentConverter
    document_converter_module.PdfFormatOption = _FakePdfFormatOption

    pipeline_options_module = types.ModuleType("docling.datamodel.pipeline_options")
    pipeline_options_module.PdfPipelineOptions = _FakePdfPipelineOptions

    base_models_module = types.ModuleType("docling.datamodel.base_models")
    base_models_module.InputFormat = _FakeInputFormat

    fake_modules = {
        "docling": types.ModuleType("docling"),
        "docling.datamodel": types.ModuleType("docling.datamodel"),
        "docling.datamodel.base_models": base_models_module,
        "docling.datamodel.pipeline_options": pipeline_options_module,
        "docling.document_converter": document_converter_module,
    }
    for name, module in fake_modules.items():
        monkeypatch.setitem(sys.modules, name, module)


def test_docling_picture_captures_image_bytes(monkeypatch):
    from srag.ingestion.parsers.docling_parser import extract_with_docling

    _install_fake_docling(monkeypatch, picture_image_bytes=b"fake-png-bytes")
    candidates = extract_with_docling("ignored.pdf", "ignored.pdf")

    pictures = [c for c in candidates if c["element_type"] == EvidenceType.IMAGE.value]
    assert len(pictures) == 1
    assert pictures[0]["image_bytes"] == b"fake-png-bytes"
    assert pictures[0]["structured_content"]["content_type"] == "image/png"


def test_docling_picture_degrades_when_get_image_fails(monkeypatch):
    """A Docling API mismatch must not abort the parse — it degrades to a
    caption-only figure, same as if picture images were never requested."""
    from srag.ingestion.parsers.docling_parser import extract_with_docling

    _install_fake_docling(monkeypatch, picture_image_bytes=None, raise_on_get_image=True)
    candidates = extract_with_docling("ignored.pdf", "ignored.pdf")

    pictures = [c for c in candidates if c["element_type"] == EvidenceType.IMAGE.value]
    assert len(pictures) == 1
    assert "image_bytes" not in pictures[0]
    assert "content_type" not in (pictures[0]["structured_content"] or {})
