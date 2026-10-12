"""Operator metrics. Aggregate only — no tenant identifiers or query text."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from srag.api.auth import get_current_user
from srag.contracts.identity import UserIdentity
from srag.observability import metrics

router = APIRouter(prefix="/metrics", tags=["metrics"])


class MetricsResponse(BaseModel):
    requests: int
    errors: int
    query_p95_ms: float
    query_samples: int


@router.get("", response_model=MetricsResponse)
async def read_metrics(
    user: Annotated[UserIdentity, Depends(get_current_user)],
) -> MetricsResponse:
    del user
    snap = metrics.snapshot()
    return MetricsResponse(
        requests=int(snap["requests"]),
        errors=int(snap["errors"]),
        query_p95_ms=float(snap["query_p95_ms"]),
        query_samples=int(snap["query_samples"]),
    )
