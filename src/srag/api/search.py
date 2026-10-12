"""Secure hybrid search."""

from __future__ import annotations

from functools import lru_cache
from typing import Annotated

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from srag.api.auth import get_current_user
from srag.api.dependencies import get_secure_db_session
from srag.contracts.evidence import EvidenceUnit
from srag.contracts.identity import UserIdentity
from srag.ingestion.embedder import get_embedder
from srag.retrieval.engine import RetrievalEngine

router = APIRouter(prefix="/search", tags=["search"])


@lru_cache(maxsize=1)
def get_retrieval_engine() -> RetrievalEngine:
    from srag.retrieval.cache import build_query_cache

    return RetrievalEngine(embedder=get_embedder(), cache=build_query_cache())


class SearchRequest(BaseModel):
    query: str = Field(..., min_length=2, max_length=1000)
    top_k: int = Field(default=5, ge=1, le=50)
    modalities: list[str] | None = None


class SearchResponseResult(BaseModel):
    score: float
    evidence: EvidenceUnit


class SearchResponse(BaseModel):
    query: str
    results: list[SearchResponseResult]


@router.post("", response_model=SearchResponse)
async def perform_search(
    request: SearchRequest,
    user: Annotated[UserIdentity, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_secure_db_session)],
    engine: Annotated[RetrievalEngine, Depends(get_retrieval_engine)],
) -> SearchResponse:
    results = await engine.search(
        session=session,
        tenant=user.tenant,
        query=request.query,
        top_k=request.top_k,
        modalities=request.modalities,
        roles=user.roles,
        collections=user.collections,
    )
    return SearchResponse(
        query=request.query,
        results=[SearchResponseResult(score=res.score, evidence=res.evidence) for res in results],
    )
