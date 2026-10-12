"""The document ACL, end to end through the HTTP upload path.

S-003 and S-004 already prove that role_allows and the bundle builder keep a
restricted unit out of retrieval and out of the model context. They do it with
evidence rows inserted by hand, carrying a security_scope no API path could
produce: ingestion hardcoded an open scope and nothing ever wrote the ACL. In
production every unit therefore authorized for everyone.

These tests drive the real endpoints, so they cover the path that was broken.
"""

from __future__ import annotations

import json
import uuid
from typing import Any

import pytest
from sqlalchemy import delete, select

from srag.api.auth import DEV_TENANT_ID
from srag.contracts.identity import TenantContext
from srag.contracts.scope import SecurityScope, scope_from_metadata
from srag.db.models import Document, EvidenceUnitModel
from srag.generation.context_builder import ContextBuilder
from srag.ingestion.embedder import HashingEmbedder
from srag.retrieval.bundle_builder import EvidenceBundleBuilder
from srag.retrieval.engine import RetrievalEngine


def _search_hit_texts(response: Any) -> list[str]:
    """Evidence content only — SearchResponse.query echoes the request verbatim,
    so asserting against the raw response body would trivially contain the
    query string regardless of what retrieval actually authorized."""
    return [hit["evidence"].get("text_content") or "" for hit in response.json()["results"]]


ADMIN = {"Authorization": "Bearer demo_admin"}
ENGINEER = {"Authorization": "Bearer demo_engineer"}
CANARY = "ACL_SCOPED_CANARY_PRESSURE_IS_42_BAR"
DEV_TENANT = TenantContext(tenant_id=DEV_TENANT_ID, tenant_name="Development Tenant")


async def _upload(client: Any, headers: dict[str, str], body: str, scope: Any = None) -> Any:
    data = {"security_scope": json.dumps(scope)} if scope is not None else None
    return await client.post(
        "/api/v1/documents",
        headers=headers,
        files={"file": (f"acl_{uuid.uuid4().hex}.txt", body.encode(), "text/plain")},
        data=data,
    )


async def _cleanup(rls_session: Any, document_id: str) -> None:
    async with rls_session(DEV_TENANT_ID) as session:
        await session.execute(delete(Document).where(Document.id == uuid.UUID(document_id)))


async def _stored_scopes(rls_session: Any, document_id: str) -> list[dict[str, Any]]:
    async with rls_session(DEV_TENANT_ID) as session:
        rows = (
            (
                await session.execute(
                    select(EvidenceUnitModel).where(
                        EvidenceUnitModel.document_id == uuid.UUID(document_id)
                    )
                )
            )
            .scalars()
            .all()
        )
        return [row.security_scope or {} for row in rows]


@pytest.mark.asyncio
async def test_upload_scope_reaches_the_evidence_rows(client, rls_session):
    """The ACL on the request has to land on every unit, not just the document."""
    created = await _upload(client, ADMIN, f"Valve V-104. {CANARY}.", {"roles": ["admin"]})
    assert created.status_code == 201, created.text
    document_id = created.json()["id"]
    try:
        scopes = await _stored_scopes(rls_session, document_id)
        assert scopes, "ingestion produced no evidence"
        assert all(scope == {"roles": ["admin"]} for scope in scopes), scopes
    finally:
        await _cleanup(rls_session, document_id)


@pytest.mark.asyncio
async def test_scoped_canary_never_reaches_retrieval_bundle_or_prompt(client, rls_session):
    """The full invariant: MODEL_CONTEXT is a subset of AUTHORIZED_EVIDENCE."""
    created = await _upload(client, ADMIN, f"Valve V-104. {CANARY}.", {"roles": ["admin"]})
    assert created.status_code == 201, created.text
    document_id = created.json()["id"]
    try:
        search = await client.post(
            "/api/v1/search", headers=ENGINEER, json={"query": CANARY, "top_k": 10}
        )
        assert search.status_code == 200, search.text
        assert not any(CANARY in text for text in _search_hit_texts(search))

        query = await client.post("/api/v1/query", headers=ENGINEER, json={"query": CANARY})
        assert query.status_code == 200, query.text
        assert CANARY not in query.text

        # Retrieval, the bundle and the built prompt are checked directly too, so
        # that a change to the response shape cannot hide a leak.
        engine = RetrievalEngine(embedder=HashingEmbedder())
        async with rls_session(DEV_TENANT_ID) as session:
            hidden = await engine.search(
                session, DEV_TENANT, CANARY, top_k=10, roles=["engineer", "user"]
            )
            visible = await engine.search(session, DEV_TENANT, CANARY, top_k=10, roles=["admin"])

        assert all(CANARY not in (hit.evidence.text_content or "") for hit in hidden)
        assert any(CANARY in (hit.evidence.text_content or "") for hit in visible), (
            "the admin must still see it, or this test passes vacuously"
        )

        bundle = EvidenceBundleBuilder.build(
            DEV_TENANT, CANARY, visible, roles=["engineer", "user"], collections=[]
        )
        # A distinct, non-sensitive user_query: build_prompt embeds it verbatim by
        # design (the user is entitled to see their own question), so reusing CANARY
        # here would make this assertion pass trivially regardless of what the
        # bundle builder actually filtered.
        prompt = ContextBuilder.build_prompt(
            "Answer from evidence.", "What is the operating pressure?", bundle
        )
        assert CANARY not in prompt
    finally:
        await _cleanup(rls_session, document_id)


@pytest.mark.asyncio
async def test_assign_scope_backfills_existing_evidence(client, rls_session):
    """Restricting a document after ingestion has to push down to its rows."""
    created = await _upload(client, ADMIN, f"Valve V-104. {CANARY}.")
    assert created.status_code == 201, created.text
    document_id = created.json()["id"]
    try:
        opened = await _stored_scopes(rls_session, document_id)
        assert opened and all(scope == {} for scope in opened)

        before = await client.post(
            "/api/v1/search", headers=ENGINEER, json={"query": CANARY, "top_k": 10}
        )
        assert any(CANARY in text for text in _search_hit_texts(before)), (
            "an open document should be visible to the tenant"
        )

        restricted = await client.put(
            f"/api/v1/documents/{document_id}/scope",
            headers=ADMIN,
            json={"security_scope": {"roles": ["admin"]}},
        )
        assert restricted.status_code == 200, restricted.text

        scopes = await _stored_scopes(rls_session, document_id)
        assert all(scope == {"roles": ["admin"]} for scope in scopes), scopes

        async with rls_session(DEV_TENANT_ID) as session:
            doc = await session.get(Document, uuid.UUID(document_id))
            assert doc is not None
            assert scope_from_metadata(doc.metadata_) == {"roles": ["admin"]}

        after = await client.post(
            "/api/v1/search", headers=ENGINEER, json={"query": CANARY, "top_k": 10}
        )
        assert not any(CANARY in text for text in _search_hit_texts(after))
    finally:
        await _cleanup(rls_session, document_id)


@pytest.mark.asyncio
async def test_assign_scope_requires_admin(client, rls_session):
    created = await _upload(client, ADMIN, f"Valve V-104. {CANARY}.")
    document_id = created.json()["id"]
    try:
        denied = await client.put(
            f"/api/v1/documents/{document_id}/scope",
            headers=ENGINEER,
            json={"security_scope": {"roles": ["admin"]}},
        )
        assert denied.status_code == 403
    finally:
        await _cleanup(rls_session, document_id)


@pytest.mark.asyncio
async def test_malformed_scope_is_rejected_not_ignored(client):
    """A silently dropped ACL would publish a restricted document tenant-wide."""
    for bad in ('{"roles": "admin"}', '{"role": ["admin"]}', "not json"):
        rejected = await client.post(
            "/api/v1/documents",
            headers=ADMIN,
            files={"file": ("x.txt", b"harmless text", "text/plain")},
            data={"security_scope": bad},
        )
        assert rejected.status_code == 422, (bad, rejected.text)


def test_scope_contract_normalizes_and_omits_empty_keys():
    assert SecurityScope().as_dict() == {}
    assert SecurityScope(roles=[" Admin ", "admin", ""]).as_dict() == {"roles": ["Admin"]}
    assert SecurityScope(collections=["legal"]).as_dict() == {"collections": ["legal"]}
    assert scope_from_metadata({"acl": "bogus"}) == {}
