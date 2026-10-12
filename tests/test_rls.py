"""Row-Level Security verification tests.

Implements the security-plan shapes:
- S-001 cross-tenant retrieval (reads)
- S-002 cross-tenant write/modify
- S-004 forbidden canary never enters retrieval results
- S-011 fail-closed when no tenant context is bound

All tests run against the real RLS-enabled database as the non-superuser
application role, so RLS is genuinely in effect (a superuser would bypass it).
"""

import uuid

import pytest
from sqlalchemy import delete, func, select, update

from srag.db.models import Document, EvidenceUnitModel, Tenant

CANARY_A = "TENANT_A_SECRET_CANARY"
CANARY_B = "TENANT_B_SECRET_CANARY"


async def _seed_tenant_with_canary(rls_session, tenant_id: uuid.UUID, canary: str) -> None:
    """Create a tenant with one document and one canary evidence row."""
    async with rls_session(tenant_id) as session:
        session.add(Tenant(id=tenant_id, name=f"Tenant {tenant_id}"))
        doc = Document(
            tenant_id=tenant_id,
            filename="canary.txt",
            content_hash=f"hash-{canary}",
        )
        session.add(doc)
        await session.flush()
        session.add(
            EvidenceUnitModel(
                tenant_id=tenant_id,
                document_id=doc.id,
                element_type="text",
                text_content=f"Confidential note: {canary} valve pressure 42 bar",
            )
        )
        await session.flush()


@pytest.mark.asyncio
async def test_rls_read_isolation(rls_session):
    """S-001: tenant B can never see tenant A's evidence, even by exact match."""
    tenant_a = uuid.uuid4()
    tenant_b = uuid.uuid4()

    await _seed_tenant_with_canary(rls_session, tenant_a, CANARY_A)
    await _seed_tenant_with_canary(rls_session, tenant_b, CANARY_B)

    # B must see exactly one evidence row (its own), and NOT A's canary text
    async with rls_session(tenant_b) as session:
        all_rows = (await session.execute(select(EvidenceUnitModel))).scalars().all()
        assert len(all_rows) == 1
        assert CANARY_B in all_rows[0].text_content

        leaked = (
            await session.execute(
                select(EvidenceUnitModel).where(
                    EvidenceUnitModel.text_content.ilike(f"%{CANARY_A}%")
                )
            )
        ).scalars().all()
        assert leaked == []

        # B's own data is visible
        own = (
            await session.execute(
                select(EvidenceUnitModel).where(
                    EvidenceUnitModel.text_content.ilike(f"%{CANARY_B}%")
                )
            )
        ).scalars().all()
        assert len(own) == 1

    # Cleanup
    for tid in (tenant_a, tenant_b):
        async with rls_session(tid) as session:
            await session.execute(delete(Tenant).where(Tenant.id == tid))
            await session.flush()


@pytest.mark.asyncio
async def test_rls_write_isolation(rls_session):
    """S-002 shape: tenant B cannot modify or delete tenant A's rows."""
    tenant_a = uuid.uuid4()
    tenant_b = uuid.uuid4()
    evidence_id = uuid.uuid4()

    async with rls_session(tenant_a) as session:
        session.add(Tenant(id=tenant_a, name="Tenant A"))
        doc_a = Document(
            tenant_id=tenant_a, filename="a.txt", content_hash="a-hash"
        )
        session.add(doc_a)
        await session.flush()
        session.add(
            EvidenceUnitModel(
                evidence_id=evidence_id,
                tenant_id=tenant_a,
                document_id=doc_a.id,
                element_type="text",
                text_content=f"Original row: {CANARY_A}",
            )
        )
        await session.flush()

    # Attempt cross-tenant UPDATE and DELETE from B's context
    async with rls_session(tenant_b) as session:
        await session.execute(
            update(EvidenceUnitModel)
            .where(EvidenceUnitModel.evidence_id == evidence_id)
            .values(text_content="TAMPERED")
        )
        await session.execute(
            delete(EvidenceUnitModel).where(EvidenceUnitModel.evidence_id == evidence_id)
        )
        await session.flush()

    # A must still see the original, unmodified row
    async with rls_session(tenant_a) as session:
        row = (
            await session.execute(
                select(EvidenceUnitModel).where(
                    EvidenceUnitModel.evidence_id == evidence_id
                )
            )
        ).scalar_one()
        assert CANARY_A in row.text_content
        assert "TAMPERED" not in row.text_content

    # Cleanup
    for tid in (tenant_a, tenant_b):
        async with rls_session(tid) as session:
            await session.execute(delete(Tenant).where(Tenant.id == tid))
            await session.flush()


@pytest.mark.asyncio
async def test_rls_fail_closed_without_tenant_context(rls_session):
    """S-011: without a bound tenant context, reads return nothing and writes land nowhere."""
    ghost_tenant = uuid.uuid4()

    # No tenant context: no rows visible at all
    async with rls_session(None) as session:
        count = (await session.execute(select(func.count(Tenant.id)))).scalar()
        assert count == 0

        # An insert must be rejected by RLS (fail closed)
        import sqlalchemy
        with pytest.raises(sqlalchemy.exc.ProgrammingError, match="new row violates row-level security policy"):
            session.add(Tenant(id=ghost_tenant, name="Should Not Exist"))
            await session.flush()
        await session.rollback()


@pytest.mark.asyncio
async def test_search_endpoint_cross_tenant_isolation(client, app, rls_session):
    """S-004: a foreign tenant's canary never enters retrieval results.

    End-to-end through the real API: auth -> RLS session -> hybrid retrieval.
    The dev tenant's own canary must be retrievable; a foreign tenant's
    canary with the same query terms must never appear.
    """
    from srag.api.auth import DEV_TENANT_ID
    from srag.api.search import get_retrieval_engine
    from srag.ingestion.embedder import HashingEmbedder
    from srag.retrieval.engine import RetrievalEngine

    other_tenant = uuid.uuid4()
    hash_embedder = HashingEmbedder()

    dev_doc_id = uuid.uuid4()
    other_doc_id = uuid.uuid4()
    dev_evidence_id = uuid.uuid4()
    other_evidence_id = uuid.uuid4()

    dev_text = f"The DEV plant report: {CANARY_A} governs valve pressure limits."
    other_text = f"The OTHER plant report: {CANARY_A} governs valve pressure limits."

    # Dev tenant (idempotent seed) + its canary evidence
    async with rls_session(DEV_TENANT_ID) as session:
        existing = (
            await session.execute(select(Tenant).where(Tenant.id == DEV_TENANT_ID))
        ).scalar_one_or_none()
        if existing is None:
            session.add(Tenant(id=DEV_TENANT_ID, name="Development Tenant"))
        session.add(
            Document(
                id=dev_doc_id,
                tenant_id=DEV_TENANT_ID,
                filename="dev_report.txt",
                content_hash="dev-report-hash",
            )
        )
        session.add(
            EvidenceUnitModel(
                evidence_id=dev_evidence_id,
                tenant_id=DEV_TENANT_ID,
                document_id=dev_doc_id,
                element_type="text",
                text_content=dev_text,
                embedding=hash_embedder.embed_text(dev_text),
            )
        )
        await session.flush()

    # Foreign tenant with deliberately similar text containing the same canary
    async with rls_session(other_tenant) as session:
        session.add(Tenant(id=other_tenant, name="Foreign Tenant"))
        session.add(
            Document(
                id=other_doc_id,
                tenant_id=other_tenant,
                filename="other_report.txt",
                content_hash="other-report-hash",
            )
        )
        session.add(
            EvidenceUnitModel(
                evidence_id=other_evidence_id,
                tenant_id=other_tenant,
                document_id=other_doc_id,
                element_type="text",
                text_content=other_text,
                embedding=hash_embedder.embed_text(other_text),
            )
        )
        await session.flush()

    # Inject a deterministic embedder — no model download in tests
    app.dependency_overrides[get_retrieval_engine] = lambda: RetrievalEngine(
        embedder=HashingEmbedder()
    )
    try:
        response = await client.post(
            "/api/v1/search",
            json={"query": "valve pressure limits report", "top_k": 10},
            headers={"Authorization": "Bearer dev_token_123"},
        )
        assert response.status_code == 200
        payload = response.json()
        texts = [r["evidence"]["text_content"] or "" for r in payload["results"]]

        # The dev tenant's own evidence is retrievable
        assert any(CANARY_A in t and "DEV plant report" in t for t in texts)
        # The foreign tenant's evidence with the same terms never leaks
        assert not any("OTHER plant report" in t for t in texts)
    finally:
        app.dependency_overrides.pop(get_retrieval_engine, None)
        # Cleanup
        async with rls_session(DEV_TENANT_ID) as session:
            await session.execute(delete(Document).where(Document.id == dev_doc_id))
            await session.flush()
        async with rls_session(other_tenant) as session:
            await session.execute(delete(Tenant).where(Tenant.id == other_tenant))
            await session.flush()


@pytest.mark.asyncio
async def test_evidence_endpoint_hides_foreign_ids(client, rls_session):
    """S-002 / S-012: foreign evidence IDs return generic 404."""
    from srag.api.auth import DEV_TENANT_ID

    other_tenant = uuid.uuid4()
    evidence_id = uuid.uuid4()
    doc_id = uuid.uuid4()
    async with rls_session(other_tenant) as session:
        session.add(Tenant(id=other_tenant, name="Foreign"))
        session.add(Document(id=doc_id, tenant_id=other_tenant, filename="x.txt", content_hash="x"))
        session.add(
            EvidenceUnitModel(
                evidence_id=evidence_id,
                tenant_id=other_tenant,
                document_id=doc_id,
                element_type="text",
                text_content=CANARY_B,
            )
        )
        await session.flush()

    response = await client.get(
        f"/api/v1/evidence/{evidence_id}",
        headers={"Authorization": "Bearer dev_token_123"},
    )
    assert response.status_code == 404
    assert response.json()["detail"] == "Not found"

    async with rls_session(other_tenant) as session:
        await session.execute(delete(Tenant).where(Tenant.id == other_tenant))
        await session.flush()
