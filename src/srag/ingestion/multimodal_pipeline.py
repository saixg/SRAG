"""Multimodal ingestion: parse → EvidenceUnits → embed text-bearing modalities."""

from __future__ import annotations

import hashlib
import logging
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from srag.contracts.evidence import EvidenceType
from srag.contracts.identity import TenantContext
from srag.contracts.scope import scope_from_metadata
from srag.db.models import Document, EvidenceUnitModel
from srag.ingestion.embedder import Embedder
from srag.ingestion.parsers.docling_parser import extract_with_docling
from srag.ingestion.parsers.paddle_parser import extract_with_ocr
from srag.ingestion.parsers.unstructured_parser import extract_with_unstructured
from srag.ingestion.visual_store import store_visual

logger = logging.getLogger(__name__)

_EMBED_TYPES = {
    EvidenceType.TEXT.value,
    EvidenceType.OCR.value,
    EvidenceType.TABLE.value,
    EvidenceType.IMAGE.value,
    EvidenceType.FIGURE.value,
    EvidenceType.DIAGRAM.value,
}


class MultimodalPipeline:
    def __init__(self, embedder: Embedder) -> None:
        self.embedder = embedder

    async def ingest_document(
        self,
        session: AsyncSession,
        tenant: TenantContext,
        filename: str,
        file_path: str,
        metadata: dict[str, Any] | None = None,
        existing: Document | None = None,
    ) -> Document:
        with open(file_path, "rb") as handle:
            content_hash = hashlib.sha256(handle.read()).hexdigest()

        if existing is None:
            doc = Document(
                tenant_id=tenant.tenant_id,
                filename=filename,
                content_hash=content_hash,
                metadata_=metadata or {},
            )
            session.add(doc)
            await session.flush()
        else:
            doc = existing
            doc.content_hash = content_hash
            doc.filename = filename

        scope = scope_from_metadata(doc.metadata_)

        candidates = _extract_candidates(file_path, filename, metadata or {})
        if not candidates:
            raise ValueError(f"No evidence extracted from {filename}")

        units: list[EvidenceUnitModel] = []
        texts: list[str] = []
        embed_targets: list[EvidenceUnitModel] = []
        for i, candidate in enumerate(candidates):
            loc = candidate.get("source_location") or {}
            page_id = candidate.get("page_id")
            if page_id is None and loc.get("page_number") is not None:
                page_id = str(loc["page_number"])
            unit = EvidenceUnitModel(
                tenant_id=tenant.tenant_id,
                document_id=doc.id,
                page_id=page_id,
                element_id=candidate.get("element_id", f"element_{i}"),
                element_type=candidate["element_type"],
                text_content=candidate.get("text_content"),
                structured_content=candidate.get("structured_content"),
                visual_reference_id=candidate.get("visual_reference_id"),
                source_location=loc or None,
                provenance=candidate.get("provenance"),
                security_scope=scope,
            )
            image_bytes = candidate.get("image_bytes")
            if isinstance(image_bytes, (bytes, bytearray)) and unit.visual_reference_id:
                store_visual(tenant.tenant_id, unit.visual_reference_id, bytes(image_bytes))
            if unit.text_content and unit.element_type in _EMBED_TYPES:
                texts.append(unit.text_content)
                embed_targets.append(unit)
            units.append(unit)

        if texts:
            embeddings = self.embedder.embed_batch(texts)
            for unit, embedding in zip(embed_targets, embeddings, strict=True):
                # pgvector accepts a plain list; the Mapped type is the column, not the value.
                unit.embedding = embedding  # type: ignore[assignment]

        session.add_all(units)
        await session.flush()
        logger.info("ingested_evidence", extra={"document_id": str(doc.id), "count": len(units)})
        return doc


def _extract_candidates(
    file_path: str, filename: str, metadata: dict[str, Any]
) -> list[dict[str, Any]]:
    is_image = filename.lower().endswith((".png", ".jpg", ".jpeg", ".tiff", ".tif", ".webp"))
    parser_type = metadata.get("parser", "docling")
    if is_image:
        return _safe_ocr(file_path, filename)

    candidates: list[dict[str, Any]] = []
    try:
        if parser_type == "unstructured":
            candidates = extract_with_unstructured(file_path, filename)
        else:
            candidates = extract_with_docling(file_path, filename)
    except RuntimeError:
        logger.warning(
            "primary parser unavailable", extra={"filename": filename, "parser": parser_type}
        )
    if candidates:
        return candidates
    return _safe_ocr(file_path, filename)


def _safe_ocr(file_path: str, filename: str) -> list[dict[str, Any]]:
    try:
        return extract_with_ocr(file_path, filename)
    except RuntimeError:
        logger.warning("ocr parser unavailable", extra={"filename": filename})
        return []
