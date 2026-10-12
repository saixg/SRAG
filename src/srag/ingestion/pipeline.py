"""Document ingestion pipeline.

Orchestrates parsing, chunking, embedding, and inserting into the database.
Enforces that all created EvidenceUnits carry the current tenant context.
"""

import hashlib
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from srag.contracts.evidence import EvidenceType
from srag.contracts.identity import TenantContext
from srag.contracts.scope import scope_from_metadata
from srag.db.models import Document, EvidenceUnitModel
from srag.ingestion.embedder import Embedder
from srag.ingestion.text_processor import TextProcessor


class IngestionPipeline:
    """The secure ingestion pipeline.

    Takes raw text, creates a Document, chunks it, embeds it, and stores EvidenceUnits.
    Requires a valid TenantContext to ensure all inserted data is securely scoped.
    """

    def __init__(self, embedder: Embedder, processor: TextProcessor) -> None:
        self.embedder = embedder
        self.processor = processor

    async def ingest_text_document(
        self,
        session: AsyncSession,
        tenant: TenantContext,
        filename: str,
        text_content: str,
        metadata: dict[str, Any] | None = None,
    ) -> Document:
        """Ingest a plain text document securely."""

        # 1. Create Document
        content_hash = hashlib.sha256(text_content.encode("utf-8")).hexdigest()

        doc = Document(
            tenant_id=tenant.tenant_id,
            filename=filename,
            content_hash=content_hash,
            metadata_=metadata or {},
        )
        session.add(doc)
        await session.flush()  # To get the doc.id

        # 2. Chunk text
        scope = scope_from_metadata(doc.metadata_)

        chunks = self.processor.chunk_text(text_content)
        if not chunks:
            return doc

        # 3. Embed chunks
        embeddings = self.embedder.embed_batch(chunks)

        # 4. Create EvidenceUnits
        evidence_units = []
        for i, (chunk, embedding) in enumerate(zip(chunks, embeddings, strict=True)):
            unit = EvidenceUnitModel(
                tenant_id=tenant.tenant_id,
                document_id=doc.id,
                element_id=f"chunk_{i}",
                element_type=EvidenceType.TEXT.value,
                text_content=chunk,
                # fts_vector is maintained by the evidence_units_fts database trigger
                embedding=embedding,
                source_location={"section": f"chunk_{i}"},
                provenance={
                    "source_filename": filename,
                    "extraction_method": "text_recursive_character",
                    "chunk_index": i,
                },
                security_scope=scope,
            )
            evidence_units.append(unit)

        # Bulk save
        session.add_all(evidence_units)
        await session.flush()

        return doc
