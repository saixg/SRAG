"""Secure text-RAG vertical slice.

Identity and RLS are applied by the caller. This orchestrator never lets
the model query the database or decide authorization.
"""

from __future__ import annotations

import json
import logging
import uuid
from collections.abc import AsyncIterator
from dataclasses import dataclass
from typing import Any

from pydantic import ValidationError
from sqlalchemy.ext.asyncio import AsyncSession

from srag.contracts.citation import citations_from_verified
from srag.contracts.generation import Claim, LLMResponse, VerifiedResponse
from srag.contracts.identity import UserIdentity
from srag.db.audit import record_audit
from srag.generation.generator import LLMClient
from srag.generation.verifier import ABSTENTION, CitationVerifier
from srag.retrieval.bundle_builder import EvidenceBundleBuilder, SecurityRejectionError
from srag.retrieval.engine import RetrievalEngine
from srag.retrieval.types import SearchResult

logger = logging.getLogger(__name__)


@dataclass
class QueryPipeline:
    retrieval: RetrievalEngine
    llm: LLMClient

    async def run(
        self,
        session: AsyncSession,
        user: UserIdentity,
        query: str,
        top_k: int = 5,
        modalities: list[str] | None = None,
    ) -> VerifiedResponse:
        verified: VerifiedResponse | None = None
        async for kind, payload in self.events(
            session, user, query, top_k=top_k, modalities=modalities
        ):
            if kind == "verified" and isinstance(payload, VerifiedResponse):
                verified = payload
        if verified is None:
            return VerifiedResponse(
                answer=ABSTENTION,
                claims=[],
                abstained=True,
                abstention_reason="pipeline_error",
            )
        return verified

    async def events(
        self,
        session: AsyncSession,
        user: UserIdentity,
        query: str,
        top_k: int = 5,
        modalities: list[str] | None = None,
    ) -> AsyncIterator[tuple[str, Any]]:
        yield "trace", {"step": "identity", "status": "ok"}
        hits = await self.retrieval.search(
            session=session,
            tenant=user.tenant,
            query=query,
            top_k=top_k,
            modalities=modalities,
            roles=user.roles,
            collections=user.collections,
        )
        yield "trace", {"step": "retrieval", "status": "ok"}
        await record_audit(
            session,
            user,
            "query.retrieve",
            details={
                "query": query,
                "hit_count": len(hits),
                "evidence_ids": [str(hit.evidence.evidence_id) for hit in hits],
            },
        )

        try:
            bundle = EvidenceBundleBuilder.build(
                user.tenant,
                query,
                hits,
                roles=user.roles,
                collections=user.collections,
            )
        except SecurityRejectionError:
            logger.exception("Authorization failure while building evidence bundle")
            await record_audit(session, user, "query.denied", details={"query": query})
            yield "trace", {"step": "authorization", "status": "denied"}
            yield (
                "verified",
                VerifiedResponse(
                    answer=ABSTENTION,
                    claims=[],
                    abstained=True,
                    abstention_reason="authorization_failure",
                ),
            )
            return

        yield "trace", {"step": "authorization", "status": "ok"}
        yield "trace", {"step": "evidence", "status": "ok" if bundle.items else "empty"}

        if not bundle.items:
            await record_audit(
                session, user, "query.abstain", details={"reason": "empty_bundle", "query": query}
            )
            yield (
                "verified",
                VerifiedResponse(
                    answer=ABSTENTION,
                    claims=[],
                    abstained=True,
                    abstention_reason="empty_bundle",
                ),
            )
            return

        try:
            raw = await self.llm.generate(query, bundle)
            raw = _coerce_llm_response(raw)
        except (ValueError, json.JSONDecodeError, ValidationError):
            logger.exception("LLM output could not be parsed")
            await record_audit(
                session,
                user,
                "query.abstain",
                details={"reason": "unparseable_llm_output", "query": query},
            )
            yield "trace", {"step": "generation", "status": "failed"}
            yield (
                "verified",
                VerifiedResponse(
                    answer=ABSTENTION,
                    claims=[],
                    abstained=True,
                    abstention_reason="unparseable_llm_output",
                ),
            )
            return

        yield "trace", {"step": "generation", "status": "ok"}
        verified = CitationVerifier.fail_closed(CitationVerifier.verify(bundle, raw))
        verified = verified.model_copy(update={"citations": citations_from_verified(verified)})
        yield "trace", {"step": "verification", "status": "refused" if verified.abstained else "ok"}
        await record_audit(
            session,
            user,
            "query.complete",
            details={
                "query": query,
                "evidence_ids": [item.evidence_id for item in bundle.items],
                "abstained": verified.abstained,
                "claim_count": len(verified.claims),
            },
        )
        yield "verified", verified


def _coerce_llm_response(raw: LLMResponse) -> LLMResponse:
    claims: list[Claim] = []
    for claim in raw.claims:
        if not claim.evidence_id or not claim.supporting_quote:
            continue
        claims.append(claim)
    return LLMResponse(answer=raw.answer, claims=claims)


def authorized_hits(hits: list[SearchResult], tenant_id: uuid.UUID) -> list[SearchResult]:
    return [hit for hit in hits if hit.evidence.tenant_id == tenant_id]
