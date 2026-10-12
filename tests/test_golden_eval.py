import pytest

from srag.evaluation.golden import evaluate_golden


@pytest.mark.asyncio
async def test_golden_v104_and_canary(rls_session):
    report = await evaluate_golden(rls_session)
    assert report.recall_at_5 == 1.0
    assert report.top_contains_answer
    assert report.isolation
