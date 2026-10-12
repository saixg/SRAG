"""Phase 2: citation resolution and inspectable evidence."""

from __future__ import annotations

import uuid

import pytest
from sqlalchemy import delete

from srag.api.auth import DEV_TENANT_ID
from srag.db.models import Document, EvidenceUnitModel, Tenant


@pytest.mark.asyncio
async def test_resolve_and_inspect_authorized_evidence(client, rls_session):
    evidence_id = uuid.uuid4()
    doc_id = uuid.uuid4()
    async with rls_session(DEV_TENANT_ID) as session:
        if (await session.get(Tenant, DEV_TENANT_ID)) is None:
            session.add(Tenant(id=DEV_TENANT_ID, name="Development Tenant"))
        session.add(
            Document(id=doc_id, tenant_id=DEV_TENANT_ID, filename="manual.pdf", content_hash="h")
        )
        session.add(
            EvidenceUnitModel(
                evidence_id=evidence_id,
                tenant_id=DEV_TENANT_ID,
                document_id=doc_id,
                page_id="3",
                element_type="table",
                text_content="V-104 operating pressure 42 bar",
                source_location={
                    "page_number": 3,
                    "bbox": [1.0, 2.0, 3.0, 4.0],
                    "section": "tables",
                },
                provenance={"source_filename": "manual.pdf", "extraction_method": "test"},
            )
        )
        await session.flush()

    inspect = await client.get(
        f"/api/v1/evidence/{evidence_id}/inspect",
        headers={"Authorization": "Bearer dev_token_123"},
    )
    assert inspect.status_code == 200
    body = inspect.json()
    assert body["authorized"] is True
    assert body["page_number"] == 3
    assert body["filename"] == "manual.pdf"
    assert "42 bar" in body["text_content"]

    resolved = await client.post(
        "/api/v1/evidence/resolve",
        headers={"Authorization": "Bearer dev_token_123"},
        json={"evidence_ids": [str(evidence_id), str(uuid.uuid4())]},
    )
    assert resolved.status_code == 200
    assert len(resolved.json()) == 1
    assert resolved.json()[0]["evidence_id"] == str(evidence_id)

    listing = await client.get(
        f"/api/v1/documents/{doc_id}/evidence",
        headers={"Authorization": "Bearer dev_token_123"},
    )
    assert listing.status_code == 200
    assert len(listing.json()) == 1

    pages = await client.get(
        f"/api/v1/documents/{doc_id}/pages",
        headers={"Authorization": "Bearer dev_token_123"},
    )
    assert pages.status_code == 200
    assert pages.json()[0]["page_number"] == 3
    assert pages.json()[0]["evidence_count"] == 1

    async with rls_session(DEV_TENANT_ID) as session:
        await session.execute(delete(Document).where(Document.id == doc_id))
        await session.flush()
