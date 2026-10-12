"""Inspectable citation — maps an answer claim back to authorized evidence."""

from __future__ import annotations

from typing import TYPE_CHECKING, Any
from uuid import UUID

from pydantic import BaseModel

from srag.contracts.evidence import EvidenceUnit

if TYPE_CHECKING:
    from srag.contracts.generation import VerifiedResponse


class CitationInspect(BaseModel):
    evidence_id: UUID
    document_id: UUID
    filename: str | None
    element_type: str
    page_id: str | None
    page_number: int | None
    bbox: list[float] | None
    section: str | None
    coordinate_system: str | None
    text_content: str | None
    structured_content: dict[str, Any] | None
    visual_reference_id: str | None
    citation_location: str
    authorized: bool = True


def inspect_evidence(unit: EvidenceUnit) -> CitationInspect:
    loc = unit.source_location
    prov = unit.provenance
    parts = [f"Document: {prov.source_filename}"] if prov else []
    page_number = loc.page_number if loc else None
    bbox = loc.bbox if loc else None
    section = loc.section if loc else None
    coord = loc.coordinate_system if loc else None
    if page_number is not None:
        parts.append(f"Page: {page_number}")
    if bbox:
        parts.append(f"Bbox: {bbox}")
    if section:
        parts.append(f"Section: {section}")
    return CitationInspect(
        evidence_id=unit.evidence_id,
        document_id=unit.document_id,
        filename=prov.source_filename if prov else None,
        element_type=str(unit.element_type),
        page_id=unit.page_id,
        page_number=page_number,
        bbox=bbox,
        section=section,
        coordinate_system=coord,
        text_content=unit.text_content,
        structured_content=unit.structured_content,
        visual_reference_id=unit.visual_reference_id,
        citation_location=", ".join(parts) if parts else str(unit.evidence_id),
        authorized=True,
    )


def citations_from_verified(verified: VerifiedResponse) -> list[CitationInspect]:
    citations: list[CitationInspect] = []
    for claim in verified.claims:
        if not claim.is_verified:
            continue
        if not claim.document_id:
            continue
        try:
            evidence_id = UUID(str(claim.evidence_id))
            document_id = UUID(str(claim.document_id))
        except ValueError:
            continue
        citations.append(
            CitationInspect(
                evidence_id=evidence_id,
                document_id=document_id,
                filename=None,
                element_type=claim.element_type or "text",
                page_id=str(claim.page_number) if claim.page_number is not None else None,
                page_number=claim.page_number,
                bbox=claim.bbox,
                section=None,
                coordinate_system=None,
                text_content=claim.supporting_quote,
                structured_content=None,
                visual_reference_id=None,
                citation_location=claim.citation_location or str(claim.evidence_id),
                authorized=True,
            )
        )
    return citations
