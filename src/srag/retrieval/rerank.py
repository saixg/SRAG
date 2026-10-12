"""Light rerank over fused candidates. Does not authorize evidence."""

from __future__ import annotations

from collections.abc import Sequence
from typing import TypeVar

T = TypeVar("T")


def rerank(hits: Sequence[T], query: str) -> list[T]:
    tokens = [token for token in query.casefold().split() if len(token) > 2]
    scored: list[tuple[float, int, T]] = []
    for index, hit in enumerate(hits):
        evidence = getattr(hit, "evidence")
        text = (getattr(evidence, "text_content", None) or "").casefold()
        overlap = sum(1 for token in tokens if token in text)
        base = float(getattr(hit, "score", 0.0))
        score = base * (1.0 + 0.5 * overlap) + overlap
        scored.append((score, -index, hit))
    scored.sort(reverse=True)
    return [item for _, _, item in scored]
