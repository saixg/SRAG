"""Process metrics. Counts are aggregate and never include tenant payloads."""

from __future__ import annotations

from srag.evaluation.metrics import latency_p95


class AppMetrics:
    def __init__(self) -> None:
        self.requests = 0
        self.errors = 0
        self.query_latency_ms: list[float] = []

    def observe_query(self, elapsed_ms: float) -> None:
        self.query_latency_ms.append(elapsed_ms)
        if len(self.query_latency_ms) > 500:
            self.query_latency_ms = self.query_latency_ms[-500:]

    def snapshot(self) -> dict[str, float | int]:
        return {
            "requests": self.requests,
            "errors": self.errors,
            "query_p95_ms": latency_p95(self.query_latency_ms),
            "query_samples": len(self.query_latency_ms),
        }


metrics = AppMetrics()
