"""Map ORM rows onto EvidenceUnit contracts."""

from __future__ import annotations

from typing import TypeVar

from pydantic import BaseModel, ValidationError

from srag.contracts.evidence import EvidenceUnit, Provenance, SourceLocation
from srag.db.models import EvidenceUnitModel

M = TypeVar("M", bound=BaseModel)


def _parse(model_cls: type[M], data: object) -> M | None:
    """Best-effort revive of a JSONB column; a malformed row loses the field, not the row."""
    if not data:
        return None
    try:
        return model_cls.model_validate(data)
    except ValidationError:
        return None


def evidence_from_model(model: EvidenceUnitModel) -> EvidenceUnit:
    return EvidenceUnit(
        evidence_id=model.evidence_id,
        tenant_id=model.tenant_id,
        document_id=model.document_id,
        page_id=model.page_id,
        element_id=model.element_id,
        element_type=model.element_type,
        text_content=model.text_content,
        structured_content=model.structured_content,
        visual_reference_id=model.visual_reference_id,
        source_location=_parse(SourceLocation, model.source_location),
        provenance=_parse(Provenance, model.provenance),
        security_scope=model.security_scope or {},
    )
