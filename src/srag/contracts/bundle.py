"""Evidence Bundle contracts — secure, authorized context for LLM generation."""

import uuid
from typing import Any

from pydantic import BaseModel

from srag.contracts.evidence import EvidenceType


class EvidenceBundleItem(BaseModel):
    """A single authorized evidence item presented to the LLM.

    This model deliberately exposes only the fields required for generation
    and citation, stripping away internal system IDs, unneeded metadata,
    and ensuring no leakage occurs.
    """

    evidence_id: str
    document_id: str
    element_type: EvidenceType

    # Content
    content: str | dict[str, Any] | None = None
    visual_reference_id: str | None = None

    # Citation-ready location pre-formatted for the LLM
    citation_location: str

    # Structured Provenance
    source_filename: str
    page_number: int | None = None
    element_id: str | None = None
    bbox: list[float] | None = None
    coordinate_system: str | None = None

    relevance_score: float


class EvidenceBundle(BaseModel):
    """The complete authorized context passed to the LLM."""

    tenant_id: uuid.UUID
    query: str
    items: list[EvidenceBundleItem]
