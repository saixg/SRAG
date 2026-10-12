"""Evidence inspection and citation resolution. RLS maps misses to 404."""

from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import Response
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from srag.api.auth import get_current_user
from srag.api.dependencies import get_secure_db_session
from srag.authz import role_allows
from srag.contracts.citation import CitationInspect, inspect_evidence
from srag.contracts.evidence import EvidenceUnit
from srag.contracts.identity import UserIdentity
from srag.db.models import EvidenceUnitModel
from srag.ingestion.visual_store import load_visual
from srag.retrieval.mapping import evidence_from_model

router = APIRouter(prefix="/evidence", tags=["evidence"])


class ResolveRequest(BaseModel):
    evidence_ids: list[UUID]


@router.post("/resolve", response_model=list[CitationInspect])
async def resolve_citations(
    body: ResolveRequest,
    session: Annotated[AsyncSession, Depends(get_secure_db_session)],
    user: Annotated[UserIdentity, Depends(get_current_user)],
) -> list[CitationInspect]:
    """Return inspectable source records for authorized evidence IDs only."""
    if not body.evidence_ids:
        return []
    rows = (
        await session.execute(
            select(EvidenceUnitModel).where(EvidenceUnitModel.evidence_id.in_(body.evidence_ids))
        )
    ).scalars().all()
    found = {row.evidence_id: row for row in rows}
    resolved: list[CitationInspect] = []
    for evidence_id in body.evidence_ids:
        row = found.get(evidence_id)
        if row is None or not _visible(row, user):
            continue
        resolved.append(inspect_evidence(evidence_from_model(row)))
    return resolved


@router.get("", response_model=list[EvidenceUnit])
async def list_evidence(
    session: Annotated[AsyncSession, Depends(get_secure_db_session)],
    user: Annotated[UserIdentity, Depends(get_current_user)],
    document_id: UUID | None = None,
    element_type: str | None = Query(default=None),
    page_number: int | None = Query(default=None, ge=1),
    limit: int = Query(default=50, ge=1, le=200),
) -> list[EvidenceUnit]:
    stmt = select(EvidenceUnitModel)
    if document_id is not None:
        stmt = stmt.where(EvidenceUnitModel.document_id == document_id)
    if element_type is not None:
        stmt = stmt.where(EvidenceUnitModel.element_type == element_type)
    if page_number is not None:
        stmt = stmt.where(EvidenceUnitModel.source_location["page_number"].as_integer() == page_number)
    stmt = stmt.limit(limit)
    rows = (await session.execute(stmt)).scalars().all()
    return [evidence_from_model(row) for row in rows if _visible(row, user)]


@router.get("/{evidence_id}", response_model=EvidenceUnit)
async def get_evidence(
    evidence_id: UUID,
    session: Annotated[AsyncSession, Depends(get_secure_db_session)],
    user: Annotated[UserIdentity, Depends(get_current_user)],
) -> EvidenceUnit:
    row = await _authorized_row(evidence_id, session, user)
    return evidence_from_model(row)


@router.get("/{evidence_id}/inspect", response_model=CitationInspect)
async def inspect_evidence_endpoint(
    evidence_id: UUID,
    session: Annotated[AsyncSession, Depends(get_secure_db_session)],
    user: Annotated[UserIdentity, Depends(get_current_user)],
) -> CitationInspect:
    row = await _authorized_row(evidence_id, session, user)
    return inspect_evidence(evidence_from_model(row))


@router.get("/{evidence_id}/visual")
async def get_visual(
    evidence_id: UUID,
    session: Annotated[AsyncSession, Depends(get_secure_db_session)],
    user: Annotated[UserIdentity, Depends(get_current_user)],
) -> Response:
    row = await _authorized_row(evidence_id, session, user)
    if not row.visual_reference_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    payload = load_visual(user.tenant_id, row.visual_reference_id)
    if payload is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    return Response(content=payload, media_type="application/octet-stream")


def _visible(row: EvidenceUnitModel, user: UserIdentity) -> bool:
    return role_allows(user.roles, user.collections, row.security_scope or {})


async def _authorized_row(
    evidence_id: UUID, session: AsyncSession, user: UserIdentity
) -> EvidenceUnitModel:
    row = await session.get(EvidenceUnitModel, evidence_id)
    if row is None or not _visible(row, user):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    return row
