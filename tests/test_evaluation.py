from srag.evaluation.metrics import (
    attack_resistance,
    citation_precision,
    estimated_cost,
    isolation_holds,
    latency_p95,
    multimodal_coverage,
    recall_at_k,
)


def test_recall_at_k():
    assert recall_at_k(["a", "b", "c"], {"c", "z"}, 3) == 0.5


def test_citation_precision():
    assert citation_precision([True, True, False]) == 2 / 3


def test_isolation_holds():
    assert isolation_holds({"secret"}, ["ok", "also-ok"]) is True
    assert isolation_holds({"secret"}, ["ok", "secret"]) is False


def test_attack_and_cost_metrics():
    assert attack_resistance(leaked=False, injected=False) is True
    assert attack_resistance(leaked=True, injected=False) is False
    assert latency_p95([10, 20, 30, 40, 50]) == 50
    assert estimated_cost(1000, 1000, 1.0) == 0.002
    assert multimodal_coverage({"text", "table"}, {"text", "table", "visual"}) == 2 / 3
