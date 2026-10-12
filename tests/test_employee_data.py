"""Employee dataset helpers. Free-form SQL against that data is forbidden."""

import pytest

from srag.generation.generator import StubLLMClient
from srag.retrieval.sql_engine import TextToSQLEngine, UnsafeSQLRejectedError


@pytest.mark.asyncio
async def test_text_to_sql_is_disabled():
    engine = TextToSQLEngine(llm=StubLLMClient())
    with pytest.raises(UnsafeSQLRejectedError):
        await engine.execute_query(
            session=None, tenant=None, query="how many employees", schema_context="employees"
        )
