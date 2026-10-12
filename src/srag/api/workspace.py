"""Workspace and collection APIs — productization without UI."""

from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from srag.api.auth import get_current_user
from srag.api.dependencies import get_secure_db_session
from srag.api.documents import DocumentResponse, _document_response
from srag.contracts.identity import UserIdentity
from srag.db.models import AuditLog, Document, EvidenceUnitModel

router = APIRouter(tags=["workspace"])


class WorkspaceSummary(BaseModel):
    tenant_id: UUID
    document_count: int
    evidence_count: int
    evidence_by_type: dict[str, int]
    collection_count: int
    recent_audit_count: int


class CollectionSummary(BaseModel):
    name: str
    document_count: int


@router.get("/workspace", response_model=WorkspaceSummary)
async def workspace_summary(
    session: Annotated[AsyncSession, Depends(get_secure_db_session)],
    user: Annotated[UserIdentity, Depends(get_current_user)],
) -> WorkspaceSummary:
    documents = (await session.execute(select(Document))).scalars().all()
    type_rows = (
        await session.execute(
            select(EvidenceUnitModel.element_type, func.count()).group_by(
                EvidenceUnitModel.element_type
            )
        )
    ).all()
    audit_count = (await session.execute(select(func.count()).select_from(AuditLog))).scalar_one()
    collections = {
        str((doc.metadata_ or {}).get("collection"))
        for doc in documents
        if isinstance(doc.metadata_, dict) and doc.metadata_.get("collection")
    }
    evidence_by_type = {str(row[0]): int(row[1]) for row in type_rows}
    return WorkspaceSummary(
        tenant_id=user.tenant.tenant_id,
        document_count=len(documents),
        evidence_count=sum(evidence_by_type.values()),
        evidence_by_type=evidence_by_type,
        collection_count=len(collections),
        recent_audit_count=int(audit_count),
    )


@router.get("/collections", response_model=list[CollectionSummary])
async def list_collections(
    session: Annotated[AsyncSession, Depends(get_secure_db_session)],
    user: Annotated[UserIdentity, Depends(get_current_user)],
) -> list[CollectionSummary]:
    documents = (await session.execute(select(Document))).scalars().all()
    counts: dict[str, int] = {}
    for doc in documents:
        name = (doc.metadata_ or {}).get("collection") if isinstance(doc.metadata_, dict) else None
        if name:
            counts[str(name)] = counts.get(str(name), 0) + 1
    return [
        CollectionSummary(name=name, document_count=count) for name, count in sorted(counts.items())
    ]


@router.get("/collections/{name}/documents", response_model=list[DocumentResponse])
async def list_collection_documents(
    name: str,
    session: Annotated[AsyncSession, Depends(get_secure_db_session)],
    user: Annotated[UserIdentity, Depends(get_current_user)],
) -> list[DocumentResponse]:
    documents = (await session.execute(select(Document))).scalars().all()
    matched = [
        doc
        for doc in documents
        if isinstance(doc.metadata_, dict) and str(doc.metadata_.get("collection")) == name
    ]
    if not matched:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    return [_document_response(doc) for doc in matched]
