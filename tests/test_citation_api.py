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


@pytest.mark.asyncio
async def test_visual_endpoint_serves_content_type_and_enforces_tenant(
    client, rls_session, monkeypatch, tmp_path
):
    """GET /evidence/{id}/visual: right Content-Type for the owner, 404 for
    another tenant — the store roundtrip alone (test_visual_store_roundtrip)
    doesn't cover either the endpoint's authorization or its media_type."""
    import importlib

    monkeypatch.setenv("VISUAL_STORE_DIR", str(tmp_path / "visuals"))
    from srag.settings import get_settings

    get_settings.cache_clear()
    visual_store = importlib.import_module("srag.ingestion.visual_store")

    doc_id = uuid.uuid4()
    evidence_id = uuid.uuid4()
    other_tenant = uuid.uuid4()

    async with rls_session(DEV_TENANT_ID) as session:
        if (await session.get(Tenant, DEV_TENANT_ID)) is None:
            session.add(Tenant(id=DEV_TENANT_ID, name="Development Tenant"))
        session.add(
            Document(id=doc_id, tenant_id=DEV_TENANT_ID, filename="figure.png", content_hash="h")
        )
        session.add(
            EvidenceUnitModel(
                evidence_id=evidence_id,
                tenant_id=DEV_TENANT_ID,
                document_id=doc_id,
                element_type="image",
                visual_reference_id="figure.png_image",
                structured_content={"content_type": "image/png"},
                provenance={"source_filename": "figure.png", "extraction_method": "test"},
            )
        )
        await session.flush()

    visual_store.store_visual(DEV_TENANT_ID, "figure.png_image", b"png-bytes")

    async with rls_session(other_tenant) as session:
        session.add(Tenant(id=other_tenant, name="Other Tenant"))
        await session.flush()

    try:
        owner = await client.get(
            f"/api/v1/evidence/{evidence_id}/visual",
            headers={"Authorization": "Bearer dev_token_123"},
        )
        assert owner.status_code == 200
        assert owner.content == b"png-bytes"
        assert owner.headers["content-type"] == "image/png"

        foreign = await client.get(
            f"/api/v1/evidence/{evidence_id}/visual",
            headers={"Authorization": "Bearer demo_tenant_b"},
        )
        assert foreign.status_code == 404
    finally:
        async with rls_session(DEV_TENANT_ID) as session:
            await session.execute(delete(Document).where(Document.id == doc_id))
        async with rls_session(DEV_TENANT_ID) as session:
            await session.execute(delete(Tenant).where(Tenant.id == other_tenant))
        get_settings.cache_clear()
