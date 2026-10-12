"""Hybrid retrieval: vector + FTS fused with RRF, then modality diversification."""

from __future__ import annotations

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from srag.authz import role_allows, scope_cache_key
from srag.contracts.identity import TenantContext
from srag.db.models import EvidenceUnitModel
from srag.ingestion.embedder import Embedder
from srag.retrieval.cache import QueryCache, TenantQueryCache
from srag.retrieval.fusion import element_types_for, fuse_modalities
from srag.retrieval.mapping import evidence_from_model
from srag.retrieval.rerank import rerank
from srag.retrieval.types import SearchResult

# Lower than the classic 60 so the top ranks matter more on short enterprise passages.
RRF_K = 40


class RetrievalEngine:
    def __init__(self, embedder: Embedder, cache: QueryCache | None = None) -> None:
        self.embedder = embedder
        self.cache = cache or TenantQueryCache()

    async def search(
        self,
        session: AsyncSession,
        tenant: TenantContext,
        query: str,
        top_k: int = 5,
        vector_weight: float = 0.7,
        element_types: list[str] | None = None,
        modalities: list[str] | None = None,
        roles: list[str] | None = None,
        collections: list[str] | None = None,
    ) -> list[SearchResult]:
        del vector_weight
        types = element_types or element_types_for(modalities)
        type_key = ",".join(sorted(types or []))
        acl_key = scope_cache_key(roles, collections)
        cached = self.cache.get(tenant.tenant_id, query, top_k, type_key, acl_key)
        if cached is not None:
            return list(cached)
        fetch = max(top_k * 4, 20)
        query_embedding = self.embedder.embed_text(query)
        fts_query = func.plainto_tsquery("english", query)

        vector_stmt = (
            select(EvidenceUnitModel)
            .where(EvidenceUnitModel.embedding.is_not(None))
            .order_by(EvidenceUnitModel.embedding.cosine_distance(query_embedding))
            .limit(fetch)
        )
        fts_stmt = (
            select(EvidenceUnitModel)
            .where(EvidenceUnitModel.fts_vector.bool_op("@@")(fts_query))
            .order_by(func.ts_rank(EvidenceUnitModel.fts_vector, fts_query).desc())
            .limit(fetch)
        )
        if types:
            vector_stmt = vector_stmt.where(EvidenceUnitModel.element_type.in_(types))
            fts_stmt = fts_stmt.where(EvidenceUnitModel.element_type.in_(types))

        vector_rows = (await session.execute(vector_stmt)).scalars().all()
        fts_rows = (await session.execute(fts_stmt)).scalars().all()

        def visible(model: EvidenceUnitModel) -> bool:
            return role_allows(roles, collections, model.security_scope or {})

        rrf: dict[str, float] = {}
        models: dict[str, EvidenceUnitModel] = {}
        vector_rank = 0
        for model in vector_rows:
            if not visible(model):
                continue
            vector_rank += 1
            key = str(model.evidence_id)
            models[key] = model
            rrf[key] = rrf.get(key, 0.0) + 1.0 / (RRF_K + vector_rank)
        fts_rank = 0
        for model in fts_rows:
            if not visible(model):
                continue
            fts_rank += 1
            key = str(model.evidence_id)
            models[key] = model
            rrf[key] = rrf.get(key, 0.0) + 1.0 / (RRF_K + fts_rank)

        ranked: list[SearchResult] = []
        for key, score in sorted(rrf.items(), key=lambda item: item[1], reverse=True):
            evidence = evidence_from_model(models[key])
            if evidence.tenant_id != tenant.tenant_id:
                continue
            ranked.append(SearchResult(evidence=evidence, score=score))
        fused = rerank(fuse_modalities(ranked, top_k), query)
        self.cache.set(tenant.tenant_id, query, top_k, fused, type_key, acl_key)
        return fused
