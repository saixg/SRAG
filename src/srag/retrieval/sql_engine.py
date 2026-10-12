"""Analytical queries are not executed as model-generated SQL.

Kept on purpose: the employee CSV path is the canary that model-written SQL
is rejected. It is not a product query API.

The model is never an authorization engine and must not query Postgres.
"""

from __future__ import annotations

from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from srag.contracts.identity import TenantContext
from srag.generation.generator import LLMClient


class UnsafeSQLRejected(PermissionError):
    """Raised when code attempts to run LLM-generated SQL."""


class TextToSQLEngine:
    def __init__(self, llm: LLMClient) -> None:
        self.llm = llm

    async def generate_sql(self, query: str, schema_context: str) -> str:
        raise UnsafeSQLRejected(
            "Free-form text-to-SQL is disabled. The model cannot query the database."
        )

    async def execute_query(
        self,
        session: AsyncSession,
        tenant: TenantContext,
        query: str,
        schema_context: str,
    ) -> list[dict[str, Any]]:
        raise UnsafeSQLRejected(
            "Free-form text-to-SQL is disabled. The model cannot query the database."
        )
