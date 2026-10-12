"""Query API — identity and RLS wrap the RAG orchestrator."""

from __future__ import annotations

import json
from collections.abc import AsyncIterator
from typing import Annotated, Any

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from srag.api.auth import get_current_user
from srag.api.dependencies import get_secure_db_session
from srag.api.limits import get_limiter
from srag.api.search import get_retrieval_engine
from srag.contracts.generation import VerifiedResponse
from srag.contracts.identity import UserIdentity
from srag.generation.generator import GroqLLMClient, LLMClient, StubLLMClient
from srag.rag.pipeline import QueryPipeline
from srag.retrieval.engine import RetrievalEngine
from srag.settings import get_settings

router = APIRouter(prefix="/query", tags=["query"])


async def enforce_query_limit(user: Annotated[UserIdentity, Depends(get_current_user)]) -> None:
    get_limiter().check(f"query:{user.user_id}", get_settings().rate_limit_query_per_minute)


def get_llm_client() -> LLMClient:
    settings = get_settings()
    if settings.groq_api_key:
        return GroqLLMClient(api_key=settings.groq_api_key.get_secret_value())
    return StubLLMClient()


class QueryRequest(BaseModel):
    query: str = Field(..., min_length=2, max_length=1000)
    top_k: int = Field(default=5, ge=1, le=50)
    modalities: list[str] | None = None


@router.post("", response_model=VerifiedResponse)
async def perform_query(
    request: QueryRequest,
    user: Annotated[UserIdentity, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_secure_db_session)],
    engine: Annotated[RetrievalEngine, Depends(get_retrieval_engine)],
    llm: Annotated[LLMClient, Depends(get_llm_client)],
    _: Annotated[None, Depends(enforce_query_limit)],
) -> VerifiedResponse:
    pipeline = QueryPipeline(retrieval=engine, llm=llm)
    return await pipeline.run(
        session, user, request.query, top_k=request.top_k, modalities=request.modalities
    )


def _sse(event: str, data: Any) -> str:
    return f"event: {event}\ndata: {json.dumps(data)}\n\n"


def _chunks(text: str, size: int = 24) -> list[str]:
    if not text:
        return []
    return [text[index : index + size] for index in range(0, len(text), size)]


@router.post("/stream")
async def stream_query(
    request: QueryRequest,
    user: Annotated[UserIdentity, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_secure_db_session)],
    engine: Annotated[RetrievalEngine, Depends(get_retrieval_engine)],
    llm: Annotated[LLMClient, Depends(get_llm_client)],
    _: Annotated[None, Depends(enforce_query_limit)],
) -> StreamingResponse:
    pipeline = QueryPipeline(retrieval=engine, llm=llm)

    async def generate() -> AsyncIterator[str]:
        async for kind, payload in pipeline.events(
            session, user, request.query, top_k=request.top_k, modalities=request.modalities
        ):
            if kind == "trace":
                yield _sse("trace", payload)
                continue
            if not isinstance(payload, VerifiedResponse):
                continue
            if payload.abstained:
                yield _sse(
                    "refused",
                    {"reason": payload.abstention_reason, "answer": payload.answer},
                )
                return
            for piece in _chunks(payload.answer):
                yield _sse("token", {"text": piece})
            yield _sse(
                "citations",
                {"citations": [item.model_dump(mode="json") for item in payload.citations]},
            )
            yield _sse("done", payload.model_dump(mode="json"))

    return StreamingResponse(generate(), media_type="text/event-stream")
