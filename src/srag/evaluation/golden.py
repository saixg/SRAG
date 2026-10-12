"""Golden questions for the pilot retrieval bar.

V-104 must outrank an unrelated passage, and a Tenant B canary must stay out
of Tenant A's results. The embedder is the hashing provider so CI does not
download BGE-M3. Pilot deployments should still set EMBEDDER_PROVIDER=local.
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass

from sqlalchemy import delete, text
from sqlalchemy.ext.asyncio import AsyncSession

from srag.contracts.identity import TenantContext
from srag.db.models import Document, EvidenceUnitModel, Tenant
from srag.evaluation.metrics import isolation_holds, recall_at_k
from srag.ingestion.embedder import HashingEmbedder
from srag.retrieval.cache import DisabledQueryCache
from srag.retrieval.engine import RetrievalEngine

V104_QUERY = "What is the operating pressure of V-104?"
V104_TEXT = "Valve V-104 operating pressure is 42 bar on the main header."
DISTRACTOR = "The cafeteria serves pizza on Friday."
CANARY = "TENANT_B_SECRET_CANARY operating pressure is 99 bar."


@dataclass
class GoldenReport:
    recall_at_5: float
    top_contains_answer: bool
    isolation: bool

    @property
    def passed(self) -> bool:
        return self.recall_at_5 == 1.0 and self.top_contains_answer and self.isolation


async def evaluate_golden(session_for: object) -> GoldenReport:
    """session_for is an async context manager factory: session_for(tenant_id)."""
    tenant_a = uuid.uuid4()
    tenant_b = uuid.uuid4()
    relevant_id = uuid.uuid4()
    embedder = HashingEmbedder()
    engine = RetrievalEngine(embedder=embedder, cache=DisabledQueryCache())
    try:
        async with session_for(tenant_a) as session:  # type: ignore[operator]
            await _insert(
                session,
                tenant_a,
                "Valve manual",
                [
                    (relevant_id, V104_TEXT, embedder.embed_text(V104_TEXT)),
                    (uuid.uuid4(), DISTRACTOR, embedder.embed_text(DISTRACTOR)),
                ],
            )
        async with session_for(tenant_b) as session:  # type: ignore[operator]
            await _insert(
                session,
                tenant_b,
                "Foreign",
                [(uuid.uuid4(), CANARY, embedder.embed_text(CANARY))],
            )
        async with session_for(tenant_a) as session:  # type: ignore[operator]
            hits = await engine.search(
                session,
                TenantContext(tenant_id=tenant_a, tenant_name="A"),
                V104_QUERY,
                top_k=5,
                roles=["user"],
            )
        ids = [str(hit.evidence.evidence_id) for hit in hits]
        texts = [hit.evidence.text_content or "" for hit in hits]
        return GoldenReport(
            recall_at_5=recall_at_k(ids, {str(relevant_id)}, 5),
            top_contains_answer=bool(texts) and "42 bar" in texts[0],
            isolation=isolation_holds({CANARY}, texts)
            and all(CANARY not in text for text in texts),
        )
    finally:
        for tenant_id in (tenant_a, tenant_b):
            async with session_for(tenant_id) as session:  # type: ignore[operator]
                await session.execute(delete(Tenant).where(Tenant.id == tenant_id))


async def _insert(
    session: AsyncSession,
    tenant_id: uuid.UUID,
    filename: str,
    rows: list[tuple[uuid.UUID, str, list[float]]],
) -> None:
    await session.execute(text("RESET ROLE"))
    session.add(Tenant(id=tenant_id, name=filename))
    doc = Document(tenant_id=tenant_id, filename=f"{filename}.txt", content_hash=filename)
    session.add(doc)
    await session.flush()
    await session.execute(text("SET LOCAL ROLE authenticated"))
    for evidence_id, content, embedding in rows:
        session.add(
            EvidenceUnitModel(
                evidence_id=evidence_id,
                tenant_id=tenant_id,
                document_id=doc.id,
                element_type="text",
                text_content=content,
                embedding=embedding,
                provenance={"source_filename": f"{filename}.txt", "extraction_method": "golden"},
            )
        )
    await session.flush()
