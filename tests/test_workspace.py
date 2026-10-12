from __future__ import annotations

import uuid

import pytest
from sqlalchemy import delete

from srag.api.auth import DEV_TENANT_ID
from srag.db.models import Document, Tenant


@pytest.mark.asyncio
async def test_workspace_and_collections(client, rls_session):
    doc_id = uuid.uuid4()
    async with rls_session(DEV_TENANT_ID) as session:
        if (await session.get(Tenant, DEV_TENANT_ID)) is None:
            session.add(Tenant(id=DEV_TENANT_ID, name="Development Tenant"))
        session.add(
            Document(id=doc_id, tenant_id=DEV_TENANT_ID, filename="ops.pdf", content_hash="h")
        )
        await session.flush()

    assigned = await client.put(
        f"/api/v1/documents/{doc_id}/collection",
        headers={"Authorization": "Bearer dev_token_123"},
        json={"collection": "operations"},
    )
    assert assigned.status_code == 200
    assert assigned.json()["collection"] == "operations"

    collections = await client.get(
        "/api/v1/collections",
        headers={"Authorization": "Bearer dev_token_123"},
    )
    assert collections.status_code == 200
    assert any(item["name"] == "operations" for item in collections.json())

    members = await client.get(
        "/api/v1/collections/operations/documents",
        headers={"Authorization": "Bearer dev_token_123"},
    )
    assert members.status_code == 200
    assert members.json()[0]["id"] == str(doc_id)

    workspace = await client.get(
        "/api/v1/workspace",
        headers={"Authorization": "Bearer dev_token_123"},
    )
    assert workspace.status_code == 200
    body = workspace.json()
    assert body["document_count"] >= 1
    assert body["collection_count"] >= 1

    async with rls_session(DEV_TENANT_ID) as session:
        await session.execute(delete(Document).where(Document.id == doc_id))
        await session.flush()
