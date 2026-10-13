"""The EnterpriseRAG-Bench adapter, and the ACL it synthesises.

The benchmark corpus carries no permissions, so the adapter derives them from
each document's source system. That derivation is the only thing standing
between a benchmark load and a tenant-wide publish of every document, so these
tests check both the mapping and what retrieval actually authorizes once the
documents are ingested through the real pipeline.

The corpus itself is not a test dependency: the fixtures below build a few
documents in the benchmark's own layout (`<source>/dsid_<hex>__<slug>.txt`),
so the suite stays offline.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

import pytest
from sqlalchemy import delete, select

from srag.api.auth import BENCH_TENANT_ID, DEV_TENANT_ID
from srag.contracts.identity import TenantContext
from srag.datasets.enterprise_bench import (
    acl_for,
    dsid_from_name,
    gold_doc_ids,
    ingest_corpus,
    load_questions,
    metadata_for,
    select_members,
    source_type_from_name,
)
from srag.db.models import Document, EvidenceUnitModel, Tenant
from srag.ingestion.embedder import HashingEmbedder
from srag.ingestion.ingest_service import IngestService
from srag.retrieval.engine import RetrievalEngine

BENCH_TENANT = TenantContext(tenant_id=BENCH_TENANT_ID, tenant_name="EnterpriseRAG-Bench")
BENCH_ENGINEER = {"Authorization": "Bearer demo_bench_engineer"}
BENCH_SALES = {"Authorization": "Bearer demo_bench_sales"}
BENCH_ADMIN = {"Authorization": "Bearer demo_bench_admin"}
DEV_ENGINEER = {"Authorization": "Bearer demo_engineer"}

# Distinct per source so a leak names the document that leaked.
ENG_CANARY = "BENCH_ENGINEERING_CANARY_TORQUE_IS_71_NM"
SALES_CANARY = "BENCH_SALES_CANARY_RENEWAL_IS_4_MILLION"
OPEN_CANARY = "BENCH_OPEN_CANARY_ALLHANDS_IS_ON_FRIDAY"
ADMIN_CANARY = "BENCH_ADMIN_CANARY_SEVERANCE_IS_12_WEEKS"

# dsid_0... lands in the admin-restricted bucket for an open source; dsid_f...
# does not. See acl_for.
CORPUS = {
    "github/dsid_aaaa1111__inference-upload-limits.txt": (
        f"Multipart upload limits. {ENG_CANARY}. Per-file and total request size caps."
    ),
    "hubspot/dsid_bbbb2222__medthink-renewal.txt": (
        f"MedThink renewal opportunity. {SALES_CANARY}. Close date and owner."
    ),
    "slack/dsid_ffff3333__general-allhands.txt": (
        f"Weekly all-hands thread. {OPEN_CANARY}. Agenda and attendance."
    ),
    "slack/dsid_0abc4444__people-severance.txt": (
        f"Compensation thread. {ADMIN_CANARY}. Policy under discussion."
    ),
}

QUESTION_LINES = [
    (
        '{"question_id": "qst_0001", "question_type": "basic", "source_types": ["github"], '
        '"question": "What are the multipart upload limits?", '
        '"expected_doc_ids": ["dsid_aaaa1111"], "gold_answer": "Per-file 512 MB.", '
        '"answer_facts": ["Per-file limit is 512 MB."]}'
    ),
    (
        '{"question_id": "qst_0002", "question_type": "high_level", "source_types": ["slack"], '
        '"question": "How does the company communicate?", "expected_doc_ids": [], '
        '"gold_answer": "Mostly Slack.", "answer_facts": []}'
    ),
]


def _write_corpus(root: Path) -> list[str]:
    for name, body in CORPUS.items():
        target = root / name
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(body, encoding="utf-8")
    return sorted(CORPUS)


def _hit_texts(response: Any) -> list[str]:
    """Evidence text only — the response echoes the query verbatim."""
    return [hit["evidence"].get("text_content") or "" for hit in response.json()["results"]]


@pytest.fixture
async def bench_corpus(rls_session, tmp_path):
    """Ingest the fixture corpus into the benchmark tenant, then remove it."""
    root = tmp_path / "documents"
    members = _write_corpus(root)
    service = IngestService(embedder=HashingEmbedder())
    gold = {"dsid_aaaa1111"}

    async with rls_session(BENCH_TENANT_ID) as session:
        tenant = (
            await session.execute(select(Tenant).where(Tenant.id == BENCH_TENANT_ID))
        ).scalar_one_or_none()
        if tenant is None:
            session.add(Tenant(id=BENCH_TENANT_ID, name="EnterpriseRAG-Bench"))
        documents = await ingest_corpus(
            session=session,
            tenant=BENCH_TENANT,
            service=service,
            root=root,
            members=members,
            gold_ids=gold,
        )
        document_ids = [doc.id for doc in documents]

    try:
        yield document_ids
    finally:
        async with rls_session(BENCH_TENANT_ID) as session:
            await session.execute(delete(Document).where(Document.id.in_(document_ids)))


def test_dsid_and_source_are_read_off_the_layout():
    name = "google_drive/dsid_4062989c__vpc-branch-playbook-2026.txt"
    assert dsid_from_name(name) == "dsid_4062989c"
    assert source_type_from_name(name) == "google_drive"
    assert dsid_from_name("notes.txt") is None


def test_source_survives_the_full_archive_nesting():
    """Per-source slices are flat; all_documents.zip nests."""
    assert source_type_from_name("all_documents/slack/memes/dsid_aa__x.txt") == "slack"
    assert source_type_from_name("all_documents/github/dsid_aa__x.txt") == "github"


def test_acl_follows_the_source_system():
    assert acl_for("github/dsid_aaaa1111__x.txt") == {"collections": ["engineering"]}
    assert acl_for("jira/dsid_aaaa1111__x.txt") == {"collections": ["engineering"]}
    assert acl_for("linear/dsid_aaaa1111__x.txt") == {"collections": ["engineering"]}
    assert acl_for("hubspot/dsid_aaaa1111__x.txt") == {"collections": ["sales"]}
    assert acl_for("confluence/dsid_aaaa1111__x.txt") == {"collections": ["docs"]}
    assert acl_for("google_drive/dsid_aaaa1111__x.txt") == {"collections": ["docs"]}
    assert acl_for("slack/dsid_ffff3333__x.txt") == {}
    assert acl_for("gmail/dsid_ffff3333__x.txt") == {}


def test_unknown_source_fails_closed():
    """A source type nobody mapped must not publish itself tenant-wide."""
    assert acl_for("salesforce/dsid_aaaa1111__x.txt") == {"roles": ["admin"]}
    assert acl_for("dsid_aaaa1111__loose-file.txt") == {"roles": ["admin"]}


def test_restricted_distractors_never_cover_gold_documents():
    """An admin-only gold document would make retrieval unscorable."""
    restricted = "slack/dsid_0abc4444__x.txt"
    assert acl_for(restricted) == {"roles": ["admin"]}
    assert acl_for(restricted, {"dsid_0abc4444"}) == {}


def test_metadata_carries_the_acl_and_the_benchmark_id():
    metadata = metadata_for("github/dsid_aaaa1111__x.txt")
    assert metadata["acl"] == {"collections": ["engineering"]}
    assert metadata["dsid"] == "dsid_aaaa1111"
    assert metadata["source_type"] == "github"
    assert metadata["collection"] == "engineering"
    assert "acl" not in metadata_for("slack/dsid_ffff3333__x.txt")


def test_questions_parse_and_yield_gold_ids(tmp_path):
    path = tmp_path / "questions.jsonl"
    path.write_text("\n".join(QUESTION_LINES) + "\n", encoding="utf-8")
    questions = load_questions(path, tmp_path / "absent.jsonl")
    assert [q.question_id for q in questions] == ["qst_0001", "qst_0002"]
    assert questions[0].answer_facts == ["Per-file limit is 512 MB."]
    assert gold_doc_ids(questions) == {"dsid_aaaa1111"}


def test_selection_keeps_every_gold_document_and_caps_the_rest():
    names = [f"slack/dsid_{index:08x}__thread.txt" for index in range(50)]
    names += ["github/dsid_aaaa1111__gold.txt", "github/README.md"]
    gold = {"dsid_aaaa1111", "dsid_00000007"}

    selected = select_members(names, gold, sample_per_source=5)

    assert "github/dsid_aaaa1111__gold.txt" in selected
    assert "slack/dsid_00000007__thread.txt" in selected
    assert "github/README.md" not in selected
    slack = [name for name in selected if name.startswith("slack/")]
    assert len(slack) == 6, "the gold slack document plus the five sampled distractors"
    assert select_members(names, gold, sample_per_source=5) == selected, "selection is seeded"


@pytest.mark.asyncio
async def test_ingested_documents_carry_the_source_acl(bench_corpus, rls_session):
    """The derived ACL has to land on the evidence rows, not just the document."""
    async with rls_session(BENCH_TENANT_ID) as session:
        documents = (
            (await session.execute(select(Document).where(Document.id.in_(bench_corpus))))
            .scalars()
            .all()
        )
        by_dsid = {doc.metadata_["dsid"]: doc for doc in documents}
        expected = {
            "dsid_aaaa1111": {"collections": ["engineering"]},
            "dsid_bbbb2222": {"collections": ["sales"]},
            "dsid_ffff3333": {},
            "dsid_0abc4444": {"roles": ["admin"]},
        }
        assert set(by_dsid) == set(expected)

        for dsid, scope in expected.items():
            rows = (
                (
                    await session.execute(
                        select(EvidenceUnitModel).where(
                            EvidenceUnitModel.document_id == by_dsid[dsid].id
                        )
                    )
                )
                .scalars()
                .all()
            )
            assert rows, f"{dsid} produced no evidence"
            assert all((row.security_scope or {}) == scope for row in rows), dsid


@pytest.mark.asyncio
async def test_collection_scope_decides_what_each_persona_retrieves(bench_corpus, client):
    """Engineering content for the engineer, sales content for sales, neither
    across the boundary — over the HTTP path, which is what a caller uses."""
    del bench_corpus

    for canary, visible_to, hidden_from in (
        (ENG_CANARY, BENCH_ENGINEER, BENCH_SALES),
        (SALES_CANARY, BENCH_SALES, BENCH_ENGINEER),
    ):
        allowed = await client.post(
            "/api/v1/search", headers=visible_to, json={"query": canary, "top_k": 10}
        )
        assert allowed.status_code == 200, allowed.text
        assert any(canary in text for text in _hit_texts(allowed)), (
            f"{canary} should be visible to its own collection"
        )

        denied = await client.post(
            "/api/v1/search", headers=hidden_from, json={"query": canary, "top_k": 10}
        )
        assert denied.status_code == 200, denied.text
        assert not any(canary in text for text in _hit_texts(denied))


@pytest.mark.asyncio
async def test_open_source_documents_stay_visible_to_every_persona(bench_corpus, client):
    del bench_corpus
    for headers in (BENCH_ENGINEER, BENCH_SALES, BENCH_ADMIN):
        found = await client.post(
            "/api/v1/search", headers=headers, json={"query": OPEN_CANARY, "top_k": 10}
        )
        assert found.status_code == 200, found.text
        assert any(OPEN_CANARY in text for text in _hit_texts(found))


@pytest.mark.asyncio
async def test_restricted_distractor_reaches_admins_only(bench_corpus, client):
    del bench_corpus
    for headers in (BENCH_ENGINEER, BENCH_SALES):
        denied = await client.post(
            "/api/v1/search", headers=headers, json={"query": ADMIN_CANARY, "top_k": 10}
        )
        assert not any(ADMIN_CANARY in text for text in _hit_texts(denied))

    allowed = await client.post(
        "/api/v1/search", headers=BENCH_ADMIN, json={"query": ADMIN_CANARY, "top_k": 10}
    )
    assert any(ADMIN_CANARY in text for text in _hit_texts(allowed)), (
        "the admin must still see it, or the denials above pass vacuously"
    )


@pytest.mark.asyncio
async def test_scope_holds_on_both_retrieval_paths(bench_corpus, rls_session):
    """RRF fuses vector and full-text hits, so a leak on either path would
    surface. Both are exercised: the canary is a literal FTS term and the
    hashing embedder puts it in the vector neighbourhood."""
    del bench_corpus
    engine = RetrievalEngine(embedder=HashingEmbedder())

    async with rls_session(BENCH_TENANT_ID) as session:
        engineer = await engine.search(
            session,
            BENCH_TENANT,
            SALES_CANARY,
            top_k=10,
            roles=["engineer", "user"],
            collections=["engineering"],
        )
        admin = await engine.search(session, BENCH_TENANT, SALES_CANARY, top_k=10, roles=["admin"])

    assert all(SALES_CANARY not in (hit.evidence.text_content or "") for hit in engineer)
    assert any(SALES_CANARY in (hit.evidence.text_content or "") for hit in admin)


@pytest.mark.asyncio
async def test_benchmark_corpus_is_invisible_to_another_tenant(bench_corpus, client):
    """RLS, not the ACL: the dev tenant must not see benchmark evidence even
    though some of it carries an open scope."""
    del bench_corpus
    for canary in (OPEN_CANARY, ENG_CANARY, SALES_CANARY, ADMIN_CANARY):
        leaked = await client.post(
            "/api/v1/search", headers=DEV_ENGINEER, json={"query": canary, "top_k": 10}
        )
        assert leaked.status_code == 200, leaked.text
        assert not any(canary in text for text in _hit_texts(leaked))


@pytest.mark.asyncio
async def test_dev_tenant_rows_do_not_reach_the_benchmark_tenant(rls_session):
    """The mirror of the test above, read straight from the database."""
    async with rls_session(BENCH_TENANT_ID) as session:
        rows = (
            (await session.execute(select(Document).where(Document.tenant_id == DEV_TENANT_ID)))
            .scalars()
            .all()
        )
    assert rows == []
