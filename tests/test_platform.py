"""SaaS platform checks: bootstrap, limits, stream, RBAC, golden retrieval, jobs."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta
from pathlib import Path

import jwt
import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import delete

from srag.api.auth import DEV_TENANT_ID, DEV_USER_ID
from srag.api.limits import get_limiter
from srag.contracts.evidence import EvidenceType, EvidenceUnit, Provenance
from srag.contracts.identity import TenantContext
from srag.db.models import Document, EvidenceUnitModel, Tenant, User
from srag.ingestion.embedder import HashingEmbedder
from srag.ingestion.jobs import IngestJob, process_job
from srag.retrieval.bundle_builder import EvidenceBundleBuilder, SecurityRejectionError
from srag.retrieval.cache import RedisQueryCache, TenantQueryCache
from srag.retrieval.engine import RetrievalEngine, SearchResult
from srag.settings import Environment, Settings, get_settings


@pytest.mark.asyncio
async def test_bootstrap_dev_token_is_idempotent(client):
    response = await client.post(
        "/api/v1/tenants/bootstrap",
        headers={"Authorization": "Bearer dev_token_123"},
        json={"tenant_name": "Development Tenant"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["tenant_id"] == str(DEV_TENANT_ID)
    assert body["user_id"] == str(DEV_USER_ID)
    again = await client.post(
        "/api/v1/tenants/bootstrap",
        headers={"Authorization": "Bearer dev_token_123"},
        json={"tenant_name": "Development Tenant"},
    )
    assert again.status_code == 200
    assert again.json()["created"] is False


@pytest.mark.asyncio
async def test_bootstrap_jwt_without_tenant_creates_one(monkeypatch, db_session):
    secret = "jwt-test-secret"
    monkeypatch.setenv("SUPABASE_JWT_SECRET", secret)
    get_settings.cache_clear()
    from srag.app import create_app

    user_id = uuid.uuid4()
    token = jwt.encode(
        {
            "sub": str(user_id),
            "aud": "authenticated",
            "role": "authenticated",
            "exp": datetime.now(UTC) + timedelta(hours=1),
            "email": "new@example.com",
        },
        secret,
        algorithm="HS256",
    )
    application = create_app()
    transport = ASGITransport(app=application)
    async with AsyncClient(transport=transport, base_url="http://test") as http:
        response = await http.post(
            "/api/v1/tenants/bootstrap",
            headers={"Authorization": f"Bearer {token}"},
            json={"tenant_name": "Acme Pilot"},
        )
    assert response.status_code == 200
    body = response.json()
    assert body["created"] is True
    assert body["user_id"] == str(user_id)
    tenant_id = uuid.UUID(body["tenant_id"])
    await db_session.execute(delete(User).where(User.id == user_id))
    await db_session.execute(delete(Tenant).where(Tenant.id == tenant_id))
    await db_session.commit()
    get_settings.cache_clear()


@pytest.mark.asyncio
async def test_query_rate_limit(client, monkeypatch):
    get_limiter().reset()
    monkeypatch.setenv("RATE_LIMIT_QUERY_PER_MINUTE", "2")
    get_settings.cache_clear()
    headers = {"Authorization": "Bearer dev_token_123"}
    for _ in range(2):
        allowed = await client.post("/api/v1/query", headers=headers, json={"query": "pressure"})
        assert allowed.status_code == 200
    blocked = await client.post("/api/v1/query", headers=headers, json={"query": "pressure"})
    assert blocked.status_code == 429
    get_limiter().reset()
    get_settings.cache_clear()


@pytest.mark.asyncio
async def test_query_stream_refuses_without_evidence(client):
    get_limiter().reset()
    response = await client.post(
        "/api/v1/query/stream",
        headers={"Authorization": "Bearer dev_token_123"},
        json={"query": "pressure of V-104"},
    )
    assert response.status_code == 200
    body = response.text
    assert "event: trace" in body
    assert "identity" in body
    assert "event: done" in body or "event: refused" in body
    get_limiter().reset()


@pytest.mark.asyncio
async def test_request_id_header(client):
    response = await client.get("/api/v1/health")
    assert response.headers.get("x-request-id")


def test_production_locks(monkeypatch):
    monkeypatch.delenv("DEV_AUTH_TOKEN", raising=False)
    settings = Settings(
        app_env=Environment.PRODUCTION,
        app_debug=False,
        secret_key="real-secret",
        supabase_jwt_secret="jwt-secret",
        embedder_provider="hashing",
        cache_backend="disabled",
        _env_file=None,  # type: ignore[call-arg]
    )
    with pytest.raises(RuntimeError, match="hashing"):
        settings.validate_runtime_security()

    ready = Settings(
        app_env=Environment.PRODUCTION,
        app_debug=False,
        secret_key="real-secret",
        supabase_jwt_secret="jwt-secret",
        embedder_provider="local",
        cache_backend="disabled",
        cors_origins="https://bevel.example",
        _env_file=None,  # type: ignore[call-arg]
    )
    ready.validate_runtime_security()


def test_cache_scope_and_redis_roundtrip():
    cache = TenantQueryCache()
    tenant = uuid.uuid4()
    cache.set(tenant, "pressure", 5, ["admin-hit"], roles="admin|")
    cache.set(tenant, "pressure", 5, ["user-hit"], roles="user|")
    assert cache.get(tenant, "pressure", 5, roles="admin|") == ["admin-hit"]
    assert cache.get(tenant, "pressure", 5, roles="user|") == ["user-hit"]

    class FakeRedis:
        def __init__(self) -> None:
            self.store: dict[str, str] = {}

        def get(self, key: str) -> str | None:
            return self.store.get(key)

        def set(self, key: str, value: str, ex: int | None = None) -> None:
            self.store[key] = value

    evidence = EvidenceUnit(
        evidence_id=uuid.uuid4(),
        tenant_id=tenant,
        document_id=uuid.uuid4(),
        element_type=EvidenceType.TEXT,
        text_content="42 bar",
        provenance=Provenance(source_filename="v.txt", extraction_method="test"),
    )
    redis_cache = RedisQueryCache(FakeRedis())
    redis_cache.set(
        tenant, "pressure", 5, [SearchResult(evidence=evidence, score=0.5)], roles="user|"
    )
    loaded = redis_cache.get(tenant, "pressure", 5, roles="user|")
    assert loaded[0].evidence.text_content == "42 bar"
    assert redis_cache.get(tenant, "pressure", 5, roles="admin|") is None


def test_role_scope_never_enters_bundle():
    tenant = TenantContext(tenant_id=uuid.uuid4(), tenant_name="T")
    allowed = _hit(tenant.tenant_id, "42 bar", {})
    hidden = _hit(tenant.tenant_id, "ADMIN_ONLY_CANARY", {"roles": ["admin"]})
    bundle = EvidenceBundleBuilder.build(tenant, "pressure", [allowed, hidden], roles=["user"])
    assert len(bundle.items) == 1
    assert "ADMIN_ONLY_CANARY" not in str(bundle.items[0].content)

    foreign = _hit(uuid.uuid4(), "TENANT_B_SECRET_CANARY", {})
    with pytest.raises(SecurityRejectionError):
        EvidenceBundleBuilder.build(tenant, "pressure", [foreign], roles=["user"])


@pytest.mark.asyncio
async def test_retrieval_hides_admin_canary(rls_session):
    tenant_id = uuid.uuid4()
    embedder = HashingEmbedder()
    engine = RetrievalEngine(embedder=embedder)
    async with rls_session(tenant_id) as session:
        session.add(Tenant(id=tenant_id, name="RBAC"))
        doc = Document(tenant_id=tenant_id, filename="m.txt", content_hash="m")
        session.add(doc)
        await session.flush()
        session.add(
            EvidenceUnitModel(
                tenant_id=tenant_id,
                document_id=doc.id,
                element_type="text",
                text_content="ADMIN_ONLY_CANARY valve note",
                embedding=embedder.embed_text("ADMIN_ONLY_CANARY valve note"),
                security_scope={"roles": ["admin"]},
                provenance={"source_filename": "m.txt", "extraction_method": "test"},
            )
        )
        await session.flush()
        hidden = await engine.search(
            session,
            TenantContext(tenant_id=tenant_id, tenant_name="RBAC"),
            "ADMIN_ONLY_CANARY",
            roles=["user"],
        )
        visible = await engine.search(
            session,
            TenantContext(tenant_id=tenant_id, tenant_name="RBAC"),
            "ADMIN_ONLY_CANARY",
            roles=["admin"],
        )
    assert hidden == []
    assert visible and "ADMIN_ONLY_CANARY" in (visible[0].evidence.text_content or "")
    async with rls_session(tenant_id) as session:
        await session.execute(delete(Tenant).where(Tenant.id == tenant_id))


@pytest.mark.asyncio
async def test_admin_canary_endpoint_is_404_for_non_admin(client, rls_session):
    evidence_id = uuid.uuid4()
    async with rls_session(DEV_TENANT_ID) as session:
        doc = Document(tenant_id=DEV_TENANT_ID, filename="admin.txt", content_hash=str(evidence_id))
        session.add(doc)
        await session.flush()
        session.add(
            EvidenceUnitModel(
                evidence_id=evidence_id,
                tenant_id=DEV_TENANT_ID,
                document_id=doc.id,
                element_type="text",
                text_content="ADMIN_ONLY_CANARY",
                security_scope={"roles": ["admin"]},
            )
        )
        await session.flush()

    engineer = await client.get(
        f"/api/v1/evidence/{evidence_id}",
        headers={"Authorization": "Bearer demo_engineer"},
    )
    admin = await client.get(
        f"/api/v1/evidence/{evidence_id}",
        headers={"Authorization": "Bearer demo_admin"},
    )
    assert engineer.status_code == 404
    assert admin.status_code == 200
    async with rls_session(DEV_TENANT_ID) as session:
        await session.execute(
            delete(EvidenceUnitModel).where(EvidenceUnitModel.evidence_id == evidence_id)
        )
        await session.execute(delete(Document).where(Document.id == doc.id))


@pytest.mark.asyncio
async def test_modality_canaries_are_not_found(client, rls_session):
    other = uuid.uuid4()
    ids: dict[str, uuid.UUID] = {}
    async with rls_session(other) as session:
        session.add(Tenant(id=other, name="Other"))
        doc = Document(tenant_id=other, filename="m.txt", content_hash="m")
        session.add(doc)
        await session.flush()
        for element_type in ("ocr", "table", "image"):
            evidence_id = uuid.uuid4()
            ids[element_type] = evidence_id
            session.add(
                EvidenceUnitModel(
                    evidence_id=evidence_id,
                    tenant_id=other,
                    document_id=doc.id,
                    element_type=element_type,
                    text_content=f"TENANT_B_SECRET_CANARY {element_type}",
                    visual_reference_id="vis" if element_type == "image" else None,
                )
            )
        await session.flush()

    for evidence_id in ids.values():
        response = await client.get(
            f"/api/v1/evidence/{evidence_id}",
            headers={"Authorization": "Bearer dev_token_123"},
        )
        assert response.status_code == 404
    missing = await client.get(
        f"/api/v1/evidence/{uuid.uuid4()}",
        headers={"Authorization": "Bearer dev_token_123"},
    )
    assert missing.status_code == 404
    anonymous = await client.get("/api/v1/documents")
    assert anonymous.status_code == 401
    async with rls_session(other) as session:
        await session.execute(delete(Tenant).where(Tenant.id == other))


@pytest.mark.asyncio
async def test_async_ingest_marks_ready(rls_session, tmp_path: Path):
    tenant_id = uuid.uuid4()
    path = tmp_path / "note.pdf"
    path.write_bytes(b"%PDF-1.4")
    async with rls_session(tenant_id) as session:
        session.add(Tenant(id=tenant_id, name="Jobs"))
        doc = Document(
            tenant_id=tenant_id,
            filename="note.pdf",
            content_hash="abc",
            metadata_={"status": "processing"},
        )
        session.add(doc)
        await session.flush()
        document_id = doc.id

    class StubPipeline:
        async def ingest_document(
            self, session, tenant, filename, file_path, metadata=None, existing=None
        ):
            assert existing is not None
            existing.metadata_ = {**(existing.metadata_ or {}), "status": "ready"}
            return existing

    await process_job(
        IngestJob(
            document_id=document_id,
            tenant_id=tenant_id,
            tenant_name="Jobs",
            filename="note.pdf",
            path=str(path),
        ),
        pipeline=StubPipeline(),
    )
    async with rls_session(tenant_id) as session:
        stored = await session.get(Document, document_id)
        assert stored is not None
        assert stored.metadata_["status"] == "ready"
        await session.execute(delete(Tenant).where(Tenant.id == tenant_id))


def test_visual_store_roundtrip(monkeypatch, tmp_path: Path):
    monkeypatch.setenv("VISUAL_STORE_DIR", str(tmp_path))
    get_settings.cache_clear()
    from srag.ingestion.visual_store import load_visual, store_visual

    tenant = uuid.uuid4()
    store_visual(tenant, "fig-1", b"png-bytes")
    assert load_visual(tenant, "fig-1") == b"png-bytes"
    assert load_visual(uuid.uuid4(), "fig-1") is None
    get_settings.cache_clear()


def _hit(tenant_id: uuid.UUID, text: str, scope: dict) -> SearchResult:
    evidence = EvidenceUnit(
        evidence_id=uuid.uuid4(),
        tenant_id=tenant_id,
        document_id=uuid.uuid4(),
        element_type=EvidenceType.TEXT,
        text_content=text,
        security_scope=scope,
        provenance=Provenance(source_filename="a.txt", extraction_method="test"),
    )
    return SearchResult(evidence=evidence, score=1.0)
