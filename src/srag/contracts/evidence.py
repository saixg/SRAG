"""Evidence contracts — typed models for the core EvidenceUnit domain object.

EvidenceUnit is the central domain model. It represents a single retrievable
unit of evidence from a document — not just text, but any modality:
text, table, OCR result, image, figure, or diagram.

Every EvidenceUnit carries its security scope (tenant_id) so that
authorization can be enforced at every stage of the pipeline.
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime
from enum import StrEnum

from pydantic import BaseModel, Field


class EvidenceType(StrEnum):
    """The modality/type of an evidence unit.

    This enum drives modality-specific processing, retrieval, and rendering.
    """

    TEXT = "text"
    TABLE = "table"
    OCR = "ocr"
    IMAGE = "image"
    FIGURE = "figure"
    DIAGRAM = "diagram"


class SourceLocation(BaseModel):
    """Where in the source document this evidence was extracted from."""

    page_number: int | None = None
    bbox: list[float] | None = None  # [x0, y0, x1, y1] normalized coordinates
    section: str | None = None


class Provenance(BaseModel):
    """Tracks how this evidence unit was created."""

    source_filename: str
    extraction_method: str  # e.g. "docling", "paddleocr", "manual"
    extracted_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    extraction_version: str | None = None


class EvidenceUnit(BaseModel):
    """Core domain model — a single retrievable unit of evidence.

    Design principles:
    - Every unit carries tenant_id for RLS enforcement
    - element_type enables modality-specific processing
    - source_location enables precise citation
    - provenance enables auditability
    - text_content and structured_content are separate to support
      both text retrieval and structured data (tables, etc.)
    - visual_reference_id supports image/figure/diagram evidence
      without embedding binary data in the model
    """

    evidence_id: uuid.UUID = Field(default_factory=uuid.uuid4)
    tenant_id: uuid.UUID
    document_id: uuid.UUID
    page_id: str | None = None
    element_id: str | None = None
    element_type: EvidenceType

    # Content — at least one of these should be populated
    text_content: str | None = None
    structured_content: dict | None = None  # for tables, structured data
    visual_reference_id: str | None = None  # reference to stored visual asset

    # Location and provenance
    source_location: SourceLocation | None = None
    provenance: Provenance | None = None

    # Security scope
    security_scope: dict = Field(
        default_factory=dict,
        description="Additional security metadata (classification, compartments, etc.)",
    )

    # Timestamps
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime | None = None
