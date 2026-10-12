"""Classify visual evidence from captions without storing binary assets."""

from __future__ import annotations

from srag.contracts.evidence import EvidenceType

_DIAGRAM = ("diagram", "flowchart", "architecture", "schematic", "pipeline")
_FIGURE = ("figure", "fig.", "chart", "graph", "plot")


def classify_visual(caption: str | None) -> str:
    text = (caption or "").casefold()
    if any(token in text for token in _DIAGRAM):
        return EvidenceType.DIAGRAM.value
    if any(token in text for token in _FIGURE):
        return EvidenceType.FIGURE.value
    return EvidenceType.IMAGE.value


def visual_caption(caption: str | None, element_type: str, index: int) -> str:
    cleaned = (caption or "").strip()
    if cleaned:
        return cleaned
    return f"{element_type} {index}"
