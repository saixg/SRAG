"""Light rerank over fused candidates. Does not authorize evidence."""

from __future__ import annotations

from collections.abc import Sequence

from srag.retrieval.types import SearchResult


def rerank(hits: Sequence[SearchResult], query: str) -> list[SearchResult]:
    tokens = [token for token in query.casefold().split() if len(token) > 2]
    scored: list[tuple[float, int, SearchResult]] = []
    for index, hit in enumerate(hits):
        evidence = hit.evidence
        text = (evidence.text_content or "").casefold()
        overlap = sum(1 for token in tokens if token in text)
        base = hit.score
        score = base * (1.0 + 0.5 * overlap) + overlap
        scored.append((score, -index, hit))
    scored.sort(reverse=True)
    return [item for _, _, item in scored]
