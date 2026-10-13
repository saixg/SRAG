"""Evaluate retrieval against EnterpriseRAG-Bench's own gold documents.

Two things are measured together, because on this platform they are the same
question. Recall says whether hybrid retrieval finds the document a benchmark
question expects; the leak count says whether a persona was shown evidence its
roles and collections do not entitle it to. A high recall bought by ignoring
the ACL is a failure, so the report carries both and `passed` requires zero
leaks.

Recall is reported per persona. An admin bypasses scope checks, so its number
is the retrieval-quality figure; a scoped persona scores lower whenever a gold
document sits in a collection it does not hold, which is the access control
working rather than a retrieval defect.
"""

from __future__ import annotations

import uuid
from collections.abc import Sequence
from dataclasses import dataclass, field
from pathlib import Path

from sqlalchemy import select

from srag.authz import role_allows
from srag.contracts.identity import TenantContext
from srag.datasets.enterprise_bench import BenchQuestion, load_questions
from srag.db.models import Document, EvidenceUnitModel
from srag.ingestion.embedder import Embedder
from srag.retrieval.cache import DisabledQueryCache
from srag.retrieval.engine import RetrievalEngine


@dataclass(frozen=True)
class Persona:
    name: str
    roles: list[str]
    collections: list[str] = field(default_factory=list)


# Mirrors the demo identities in srag.api.auth for the benchmark tenant.
PERSONAS = (
    Persona("engineer", ["engineer", "user"], ["engineering"]),
    Persona("sales", ["sales", "user"], ["sales"]),
    Persona("admin", ["admin"]),
)


@dataclass
class PersonaResult:
    persona: str
    scored: int
    found: int
    leaks: int

    @property
    def recall(self) -> float:
        return self.found / self.scored if self.scored else 0.0


@dataclass
class BenchReport:
    documents: int
    evidence_units: int
    scored: int
    personas: list[PersonaResult]
    cross_tenant_leaks: int

    @property
    def leaks(self) -> int:
        return sum(result.leaks for result in self.personas) + self.cross_tenant_leaks

    @property
    def passed(self) -> bool:
        """Zero leaks is the bar. Recall is reported, not gated: the corpus
        subset and the question mix make an absolute threshold arbitrary."""
        return self.leaks == 0 and self.scored > 0

    def lines(self) -> list[str]:
        out = [
            f"documents={self.documents} evidence_units={self.evidence_units} "
            f"questions_scored={self.scored}"
        ]
        for result in self.personas:
            out.append(
                f"{result.persona}: recall@k={result.recall:.2f} "
                f"({result.found}/{result.scored}) leaks={result.leaks}"
            )
        out.append(f"cross_tenant_leaks={self.cross_tenant_leaks}")
        return out


def _dsid_of(evidence_source: str) -> str:
    return evidence_source.split("__")[0]


def scorable(questions: Sequence[BenchQuestion], ingested: set[str]) -> list[BenchQuestion]:
    """Questions whose gold documents are all present.

    A document that was never ingested is a corpus gap, not a retrieval miss,
    and counting it as one would understate recall on a subset of the corpus.
    """
    return [
        question
        for question in questions
        if question.expected_doc_ids and set(question.expected_doc_ids) <= ingested
    ]


async def evaluate_enterprise_bench(
    session_for: object,
    tenant: TenantContext,
    other_tenant_id: uuid.UUID,
    embedder: Embedder,
    root: Path,
    top_k: int = 10,
    limit: int | None = None,
) -> BenchReport:
    """session_for is an async context manager factory: session_for(tenant_id)."""
    engine = RetrievalEngine(embedder=embedder, cache=DisabledQueryCache())
    questions = load_questions(root / "questions.jsonl", root / "extra_questions.jsonl")

    async with session_for(tenant.tenant_id) as session:  # type: ignore[operator]
        documents = (await session.execute(select(Document))).scalars().all()
        units = len((await session.execute(select(EvidenceUnitModel.evidence_id))).all())
    ingested = {str(doc.metadata_.get("dsid")) for doc in documents}
    document_ids = {str(doc.id) for doc in documents}

    sample = scorable(questions, ingested)
    if limit is not None:
        sample = sample[:limit]

    results: list[PersonaResult] = []
    async with session_for(tenant.tenant_id) as session:  # type: ignore[operator]
        for persona in PERSONAS:
            found = 0
            leaks = 0
            for question in sample:
                hits = await engine.search(
                    session,
                    tenant,
                    question.question,
                    top_k=top_k,
                    roles=persona.roles,
                    collections=persona.collections,
                )
                retrieved = {
                    _dsid_of(hit.evidence.provenance.source_filename)
                    for hit in hits
                    if hit.evidence.provenance is not None
                }
                if set(question.expected_doc_ids) & retrieved:
                    found += 1
                # Re-check every hit against the ACL independently of the
                # engine, so a regression inside retrieval cannot hide here.
                leaks += sum(
                    1
                    for hit in hits
                    if not role_allows(
                        persona.roles, persona.collections, hit.evidence.security_scope or {}
                    )
                )
            results.append(PersonaResult(persona.name, len(sample), found, leaks))

    cross_tenant_leaks = await _cross_tenant_leaks(
        session_for, other_tenant_id, engine, sample, document_ids, top_k
    )
    return BenchReport(
        documents=len(documents),
        evidence_units=units,
        scored=len(sample),
        personas=results,
        cross_tenant_leaks=cross_tenant_leaks,
    )


async def _cross_tenant_leaks(
    session_for: object,
    other_tenant_id: uuid.UUID,
    engine: RetrievalEngine,
    sample: Sequence[BenchQuestion],
    bench_document_ids: set[str],
    top_k: int,
) -> int:
    """Benchmark evidence reaching another tenant, which RLS must prevent.

    Uses the benchmark's own questions as the queries: the most likely way to
    surface a row is to ask for exactly what it contains.
    """
    other = TenantContext(tenant_id=other_tenant_id, tenant_name="other")
    leaks = 0
    async with session_for(other_tenant_id) as session:  # type: ignore[operator]
        for question in list(sample)[:10]:
            hits = await engine.search(
                session, other, question.question, top_k=top_k, roles=["admin"]
            )
            leaks += sum(1 for hit in hits if str(hit.evidence.document_id) in bench_document_ids)
    return leaks
