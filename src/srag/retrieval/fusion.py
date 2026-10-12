"""Modality-aware fusion over ranked evidence candidates."""

from __future__ import annotations

from collections.abc import Iterable, Sequence

from srag.contracts.evidence import EvidenceType
from srag.retrieval.types import SearchResult

TEXT_TYPES = {EvidenceType.TEXT, EvidenceType.OCR, "text", "ocr"}
TABLE_TYPES = {EvidenceType.TABLE, "table"}
VISUAL_TYPES = {
    EvidenceType.IMAGE,
    EvidenceType.FIGURE,
    EvidenceType.DIAGRAM,
    "image",
    "figure",
    "diagram",
}


MODALITY_TYPES: dict[str, tuple[str, ...]] = {
    "text": ("text", "ocr"),
    "table": ("table",),
    "visual": ("image", "figure", "diagram"),
}


def element_types_for(modalities: Sequence[str] | None) -> list[str] | None:
    if not modalities:
        return None
    types: list[str] = []
    for modality in modalities:
        types.extend(MODALITY_TYPES.get(modality.casefold(), ()))
    return types or None


def modality_of(element_type: object) -> str:
    if element_type in TABLE_TYPES:
        return "table"
    if element_type in VISUAL_TYPES:
        return "visual"
    return "text"


def fuse_modalities(ranked: Iterable[SearchResult], top_k: int) -> list[SearchResult]:
    """Keep score order, but surface at least one hit per modality when present."""
    items: Sequence[SearchResult] = list(ranked)
    if len(items) <= top_k:
        return list(items)
    picked: list[SearchResult] = []
    seen_ids: set[str] = set()
    seen_mod: set[str] = set()
    for item in items:
        evidence = item.evidence
        mod = modality_of(evidence.element_type)
        key = str(evidence.evidence_id)
        if mod in seen_mod:
            continue
        picked.append(item)
        seen_ids.add(key)
        seen_mod.add(mod)
        if len(picked) >= top_k:
            return picked
    for item in items:
        key = str(item.evidence.evidence_id)
        if key in seen_ids:
            continue
        picked.append(item)
        if len(picked) >= top_k:
            break
    return picked
