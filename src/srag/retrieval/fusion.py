"""Modality-aware fusion over ranked evidence candidates."""

from __future__ import annotations

from collections.abc import Iterable, Sequence
from typing import Protocol, TypeVar

from srag.contracts.evidence import EvidenceType


class RankedHit(Protocol):
    evidence: object
    score: float


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


T = TypeVar("T")


def fuse_modalities(ranked: Iterable[T], top_k: int) -> list[T]:
    """Keep score order, but surface at least one hit per modality when present."""
    items: Sequence[T] = list(ranked)
    if len(items) <= top_k:
        return list(items)
    picked: list[T] = []
    seen_ids: set[str] = set()
    seen_mod: set[str] = set()
    for item in items:
        evidence = item.evidence
        mod = modality_of(getattr(evidence, "element_type"))
        key = str(getattr(evidence, "evidence_id"))
        if mod in seen_mod:
            continue
        picked.append(item)
        seen_ids.add(key)
        seen_mod.add(mod)
        if len(picked) >= top_k:
            return picked
    for item in items:
        key = str(getattr(item.evidence, "evidence_id"))
        if key in seen_ids:
            continue
        picked.append(item)
        if len(picked) >= top_k:
            break
    return picked
