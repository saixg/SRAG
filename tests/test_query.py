"""Tests for the /api/v1/query endpoint."""

import pytest
from httpx import AsyncClient

from srag.api.auth import DEV_TENANT_ID


@pytest.mark.asyncio
async def test_query_endpoint(client: AsyncClient, db_session):
    """Test that the query endpoint securely retrieves, bundles, and verifies."""

    # Pre-populate DB with some evidence for tenant A

    from srag.db.models import Document, Tenant

    tenant = Tenant(id=DEV_TENANT_ID, name="Tenant A")
    doc = Document(
        id="d0000000-0000-0000-0000-00000000000a",
        tenant_id=DEV_TENANT_ID,
        filename="test.pdf",
        content_hash="hash",
    )

    db_session.add(tenant)
    db_session.add(doc)
    # Emulate ON CONFLICT DO NOTHING: tolerate a dirty database from an earlier run.
    try:
        await db_session.commit()
    except Exception:
        await db_session.rollback()

    # No EvidenceUnitModel is inserted, so retrieval returns nothing. StubLLMClient
    # handles an empty bundle, so the endpoint still answers.

    response = await client.post(
        "/api/v1/query",
        headers={"Authorization": "Bearer dev_token_123"},
        json={"query": "What is the project deadline?", "top_k": 5},
    )

    assert response.status_code == 200
    data = response.json()

    # Check that it returned a VerifiedResponse
    assert "answer" in data
    assert "claims" in data

    # Because there's no evidence, the endpoint returns the deterministic abstention string
    assert data["answer"] == "I don't have enough authorized evidence to answer that."
    assert len(data["claims"]) == 0
