"""Offline evaluation metrics for retrieval, citations, isolation, and cost."""

from __future__ import annotations

from statistics import mean


def recall_at_k(retrieved_ids: list[str], relevant_ids: set[str], k: int) -> float:
    if not relevant_ids:
        return 0.0
    hit = relevant_ids.intersection(retrieved_ids[:k])
    return len(hit) / len(relevant_ids)


def citation_precision(verified_flags: list[bool]) -> float:
    if not verified_flags:
        return 0.0
    return sum(1 for flag in verified_flags if flag) / len(verified_flags)


def isolation_holds(forbidden_ids: set[str], retrieved_ids: list[str]) -> bool:
    return forbidden_ids.isdisjoint(retrieved_ids)


def attack_resistance(leaked: bool, injected: bool) -> bool:
    return not leaked and not injected


def latency_p95(samples_ms: list[float]) -> float:
    if not samples_ms:
        return 0.0
    ordered = sorted(samples_ms)
    index = max(0, int(round(0.95 * (len(ordered) - 1))))
    return ordered[index]


def estimated_cost(prompt_tokens: int, completion_tokens: int, usd_per_million: float) -> float:
    return (prompt_tokens + completion_tokens) * usd_per_million / 1_000_000


def multimodal_coverage(retrieved_modalities: set[str], required: set[str]) -> float:
    if not required:
        return 1.0
    return len(retrieved_modalities.intersection(required)) / len(required)


def mean_metric(values: list[float]) -> float:
    return mean(values) if values else 0.0
