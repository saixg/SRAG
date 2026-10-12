"""Classify visual evidence and derive its caption text."""

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


def visual_caption(caption: str | None) -> str | None:
    """The caption text, or None if there isn't one.

    Previously fabricated a placeholder like "figure 3" for an uncaptioned
    element; that string then got embedded as if it were real content,
    polluting the vector index with text that describes nothing. Returning
    None lets the caller skip embedding entirely for a unit with no caption.
    """
    cleaned = (caption or "").strip()
    return cleaned or None
