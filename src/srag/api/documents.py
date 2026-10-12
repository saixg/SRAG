"""Document upload, listing, and evidence explorer (API only)."""

from __future__ import annotations

import hashlib
from functools import lru_cache
from pathlib import Path
from typing import Annotated
from uuid import UUID, uuid4

from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    File,
    HTTPException,
    Response,
    UploadFile,
    status,
)
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from srag.api.auth import get_current_user
from srag.api.dependencies import get_secure_db_session
from srag.api.limits import get_limiter
from srag.contracts.citation import CitationInspect, inspect_evidence
from srag.contracts.identity import UserIdentity
from srag.db.audit import record_audit
from srag.db.models import Document, EvidenceUnitModel
from srag.ingestion.embedder import get_embedder
from srag.ingestion.ingest_service import IngestService, UnsupportedDocumentType
from srag.ingestion.jobs import IngestJob, enqueue_redis, process_job
from srag.retrieval.mapping import evidence_from_model
from srag.settings import CacheBackend, get_settings

_MULTIMODAL_SUFFIXES = {".pdf", ".png", ".jpg", ".jpeg", ".tiff", ".tif", ".webp"}

router = APIRouter(prefix="/documents", tags=["documents"])


@lru_cache(maxsize=1)
def get_ingest_service() -> IngestService:
    return IngestService(embedder=get_embedder())


class DocumentResponse(BaseModel):
    id: UUID
    filename: str
    tenant_id: UUID
    content_hash: str
    collection: str | None = None
    status: str = "ready"


class PageMetadata(BaseModel):
    page_id: str
    page_number: int | None
    evidence_count: int
    element_types: list[str]


class CollectionAssign(BaseModel):
    collection: str | None = None


@router.get("", response_model=list[DocumentResponse])
async def list_documents(
    session: Annotated[AsyncSession, Depends(get_secure_db_session)],
    user: Annotated[UserIdentity, Depends(get_current_user)],
) -> list[DocumentResponse]:
    rows = (await session.execute(select(Document).order_by(Document.created_at.desc()))).scalars().all()
    return [_document_response(doc) for doc in rows]


@router.get("/{document_id}", response_model=DocumentResponse)
async def get_document(
    document_id: UUID,
    session: Annotated[AsyncSession, Depends(get_secure_db_session)],
    user: Annotated[UserIdentity, Depends(get_current_user)],
) -> DocumentResponse:
    doc = await session.get(Document, document_id)
    if doc is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    return _document_response(doc)


@router.get("/{document_id}/evidence", response_model=list[CitationInspect])
async def list_document_evidence(
    document_id: UUID,
    session: Annotated[AsyncSession, Depends(get_secure_db_session)],
    user: Annotated[UserIdentity, Depends(get_current_user)],
) -> list[CitationInspect]:
    doc = await session.get(Document, document_id)
    if doc is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    rows = (
        await session.execute(
            select(EvidenceUnitModel).where(EvidenceUnitModel.document_id == document_id)
        )
    ).scalars().all()
    return [inspect_evidence(evidence_from_model(row)) for row in rows]


@router.get("/{document_id}/pages", response_model=list[PageMetadata])
async def list_document_pages(
    document_id: UUID,
    session: Annotated[AsyncSession, Depends(get_secure_db_session)],
    user: Annotated[UserIdentity, Depends(get_current_user)],
) -> list[PageMetadata]:
    doc = await session.get(Document, document_id)
    if doc is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    rows = (
        await session.execute(
            select(EvidenceUnitModel).where(EvidenceUnitModel.document_id == document_id)
        )
    ).scalars().all()
    grouped: dict[str, list[EvidenceUnitModel]] = {}
    for row in rows:
        loc = row.source_location or {}
        page_id = row.page_id or (str(loc["page_number"]) if loc.get("page_number") is not None else "unknown")
        grouped.setdefault(page_id, []).append(row)
    pages: list[PageMetadata] = []
    for page_id, units in grouped.items():
        numbers = [
            (unit.source_location or {}).get("page_number")
            for unit in units
            if isinstance(unit.source_location, dict)
        ]
        page_number = next((n for n in numbers if isinstance(n, int)), None)
        pages.append(
            PageMetadata(
                page_id=page_id,
                page_number=page_number,
                evidence_count=len(units),
                element_types=sorted({unit.element_type for unit in units}),
            )
        )
    return sorted(pages, key=lambda page: page.page_number or 10_000)


@router.put("/{document_id}/collection", response_model=DocumentResponse)
async def assign_collection(
    document_id: UUID,
    body: CollectionAssign,
    session: Annotated[AsyncSession, Depends(get_secure_db_session)],
    user: Annotated[UserIdentity, Depends(get_current_user)],
) -> DocumentResponse:
    doc = await session.get(Document, document_id)
    if doc is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    metadata = dict(doc.metadata_ or {})
    if body.collection:
        metadata["collection"] = body.collection
    else:
        metadata.pop("collection", None)
    doc.metadata_ = metadata
    await session.flush()
    return _document_response(doc)


@router.post("", status_code=status.HTTP_201_CREATED, response_model=DocumentResponse)
async def upload_document(
    response: Response,
    background: BackgroundTasks,
    file: UploadFile = File(...),
    session: AsyncSession = Depends(get_secure_db_session),
    user: UserIdentity = Depends(get_current_user),
    ingest: IngestService = Depends(get_ingest_service),
) -> DocumentResponse:
    settings = get_settings()
    get_limiter().check(f"upload:{user.user_id}", settings.rate_limit_upload_per_minute)
    if not file.filename:
        raise HTTPException(status_code=400, detail="Filename missing")
    filename = Path(file.filename).name
    payload = await file.read(settings.max_upload_bytes + 1)
    if len(payload) > settings.max_upload_bytes:
        raise HTTPException(status_code=413, detail="Upload exceeds the size limit")
    suffix = Path(filename).suffix.lower()
    if suffix in _MULTIMODAL_SUFFIXES:
        return await _accept_async_ingest(response, background, session, user, filename, payload)
    try:
        doc = await ingest.ingest_bytes(
            session=session,
            tenant=user.tenant,
            filename=filename,
            payload=payload,
            metadata={"uploaded_by": str(user.user_id)},
        )
    except UnicodeDecodeError as exc:
        raise HTTPException(status_code=400, detail="Text files must be valid UTF-8") from exc
    except UnsupportedDocumentType as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    await record_audit(
        session,
        user,
        "document.ingest",
        resource_type="document",
        resource_id=str(doc.id),
        details={"filename": filename},
    )
    return _document_response(doc)


def _document_response(doc: Document) -> DocumentResponse:
    metadata = doc.metadata_ or {}
    collection = metadata.get("collection") if isinstance(metadata, dict) else None
    status_value = metadata.get("status") if isinstance(metadata, dict) else None
    return DocumentResponse(
        id=doc.id,
        filename=doc.filename,
        tenant_id=doc.tenant_id,
        content_hash=doc.content_hash,
        collection=str(collection) if collection else None,
        status=str(status_value) if status_value else "ready",
    )


async def _accept_async_ingest(
    response: Response,
    background: BackgroundTasks,
    session: AsyncSession,
    user: UserIdentity,
    filename: str,
    payload: bytes,
) -> DocumentResponse:
    settings = get_settings()
    stored = Path(settings.ingest_upload_dir) / str(user.tenant_id) / f"{uuid4().hex}_{filename}"
    stored.parent.mkdir(parents=True, exist_ok=True)
    stored.write_bytes(payload)
    doc = Document(
        tenant_id=user.tenant_id,
        filename=filename,
        content_hash=hashlib.sha256(payload).hexdigest(),
        metadata_={
            "status": "processing",
            "uploaded_by": str(user.user_id),
            "stored_path": str(stored),
        },
    )
    session.add(doc)
    await session.flush()
    await record_audit(
        session,
        user,
        "document.accept",
        resource_type="document",
        resource_id=str(doc.id),
        details={"filename": filename, "status": "processing"},
    )
    job = IngestJob(
        document_id=doc.id,
        tenant_id=user.tenant_id,
        tenant_name=user.tenant.tenant_name,
        filename=filename,
        path=str(stored),
    )
    if settings.cache_backend == CacheBackend.REDIS and settings.redis_url:
        enqueue_redis(job)
    else:
        background.add_task(process_job, job)
    response.status_code = status.HTTP_202_ACCEPTED
    return _document_response(doc)
