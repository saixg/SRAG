"""Dispatch uploads to text or multimodal ingestion under the caller tenant."""

from __future__ import annotations

import tempfile
from pathlib import Path
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from srag.contracts.identity import TenantContext
from srag.db.models import Document
from srag.ingestion.embedder import Embedder
from srag.ingestion.multimodal_pipeline import MultimodalPipeline
from srag.ingestion.pipeline import IngestionPipeline
from srag.ingestion.text_processor import TextProcessor

TEXT_SUFFIXES = {".txt", ".md"}
IMAGE_SUFFIXES = {".png", ".jpg", ".jpeg", ".tiff", ".tif", ".webp"}
PDF_SUFFIXES = {".pdf"}


class UnsupportedDocumentTypeError(ValueError):
    pass


class IngestService:
    def __init__(self, embedder: Embedder) -> None:
        self.embedder = embedder
        self._text = IngestionPipeline(embedder=embedder, processor=TextProcessor())
        self._multimodal = MultimodalPipeline(embedder=embedder)

    async def ingest_bytes(
        self,
        session: AsyncSession,
        tenant: TenantContext,
        filename: str,
        payload: bytes,
        metadata: dict[str, Any] | None = None,
    ) -> Document:
        suffix = Path(filename).suffix.lower()
        if suffix in TEXT_SUFFIXES:
            return await self._text.ingest_text_document(
                session=session,
                tenant=tenant,
                filename=filename,
                text_content=payload.decode("utf-8"),
                metadata=metadata,
            )
        if suffix in IMAGE_SUFFIXES or suffix in PDF_SUFFIXES:
            with tempfile.NamedTemporaryFile(suffix=suffix, delete=True) as handle:
                handle.write(payload)
                handle.flush()
                return await self._multimodal.ingest_document(
                    session=session,
                    tenant=tenant,
                    filename=filename,
                    file_path=handle.name,
                    metadata=metadata,
                )
        raise UnsupportedDocumentTypeError(f"Unsupported file type: {suffix or filename}")
