"""Shared retrieval types.

SearchResult lives here rather than in engine so that fusion and rerank can
be typed against it without importing engine, which imports them.
"""

from __future__ import annotations

from dataclasses import dataclass

from srag.contracts.evidence import EvidenceUnit


@dataclass
class SearchResult:
    evidence: EvidenceUnit
    score: float
