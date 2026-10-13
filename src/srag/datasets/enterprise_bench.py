"""EnterpriseRAG-Bench adapter.

The benchmark (github.com/onyx-dot-app/EnterpriseRAG-Bench, MIT) ships ~500k
plain-text documents for a fictional company, laid out as
`<source_type>/dsid_<hex>__<slug>.txt`, plus questions.jsonl holding the gold
answers and the document ids each question should retrieve.

The corpus carries no ACL of its own, so this module derives one from the
source type: the only permission signal the data actually has. Everything else
(parsing, chunking, embedding, tenant stamping) is left to the existing
ingestion pipeline — documents are `.txt`, which IngestService already routes
to IngestionPipeline.ingest_text_document.
"""

from __future__ import annotations

import random
import re
from collections.abc import Iterable, Sequence
from pathlib import Path
from typing import Any

from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from srag.contracts.identity import TenantContext
from srag.db.models import Document
from srag.ingestion.ingest_service import IngestService

SOURCE_LABEL = "enterprise_rag_bench"

# Source type -> the collection a caller must hold to read it. A source that
# represents company-wide chatter is left open instead (any tenant member).
SOURCE_COLLECTIONS = {
    "github": "engineering",
    "jira": "engineering",
    "linear": "engineering",
    "hubspot": "sales",
    "confluence": "docs",
    "google_drive": "docs",
}
OPEN_SOURCES = frozenset({"slack", "gmail", "fireflies"})
KNOWN_SOURCES = frozenset(SOURCE_COLLECTIONS) | OPEN_SOURCES

_DSID = re.compile(r"^(dsid_[0-9a-f]+)")


class BenchQuestion(BaseModel):
    """One row of questions.jsonl / extra_questions.jsonl."""

    model_config = {"extra": "ignore"}

    question_id: str
    question_type: str = ""
    source_types: list[str] = []
    question: str = ""
    expected_doc_ids: list[str] = []
    gold_answer: str = ""
    answer_facts: list[str] = []


def load_questions(*paths: Path) -> list[BenchQuestion]:
    questions: list[BenchQuestion] = []
    for path in paths:
        if not path.exists():
            continue
        with path.open(encoding="utf-8") as handle:
            for line in handle:
                line = line.strip()
                if line:
                    questions.append(BenchQuestion.model_validate_json(line))
    return questions


def gold_doc_ids(questions: Iterable[BenchQuestion]) -> set[str]:
    return {doc_id for question in questions for doc_id in question.expected_doc_ids}


def dsid_from_name(name: str) -> str | None:
    """`slack/general/dsid_ab12__weekly-sync.txt` -> `dsid_ab12`."""
    match = _DSID.match(Path(name).name)
    return match.group(1) if match else None


def source_type_from_name(name: str) -> str:
    """The source system a document came out of.

    Per-source slices are laid out `<source>/<file>`, while the full archive
    nests deeper (a root folder, and Slack channels under their source), so
    the known source names are matched anywhere in the path rather than
    assuming a fixed depth.
    """
    parts = Path(name).parts[:-1]
    for part in parts:
        if part in KNOWN_SOURCES:
            return part
    return parts[0] if parts else ""


def acl_for(name: str, gold_ids: set[str] | None = None) -> dict[str, Any]:
    """The security scope to stamp on a benchmark document.

    Gold documents stay readable by any tenant member so that a retrieval
    evaluation is reproducible without an admin token. Distractors from an
    open source are selectively restricted to admins instead, which gives the
    access-control tests real content to be denied. An unrecognised source
    fails closed rather than publishing tenant-wide.
    """
    source = source_type_from_name(name)
    dsid = dsid_from_name(name)
    if source in SOURCE_COLLECTIONS:
        return {"collections": [SOURCE_COLLECTIONS[source]]}
    if source in OPEN_SOURCES:
        is_gold = bool(dsid and gold_ids and dsid in gold_ids)
        if not is_gold and dsid and dsid.removeprefix("dsid_").startswith("0"):
            return {"roles": ["admin"]}
        return {}
    return {"roles": ["admin"]}


def select_members(
    names: Sequence[str],
    gold_ids: set[str],
    sample_per_source: int = 200,
    seed: int = 20261013,
) -> list[str]:
    """Every gold document, plus a bounded distractor sample per source type."""
    selected: list[str] = []
    candidates: dict[str, list[str]] = {}
    for name in names:
        if not name.endswith(".txt"):
            continue
        dsid = dsid_from_name(name)
        if dsid is not None and dsid in gold_ids:
            selected.append(name)
        else:
            candidates.setdefault(source_type_from_name(name), []).append(name)

    rng = random.Random(seed)
    for source in sorted(candidates):
        pool = sorted(candidates[source])
        take = min(sample_per_source, len(pool))
        selected.extend(rng.sample(pool, take))
    return sorted(set(selected))


def metadata_for(name: str, gold_ids: set[str] | None = None) -> dict[str, Any]:
    """Document metadata: the ACL plus the provenance an evaluation needs.

    `dsid` is what questions.jsonl's expected_doc_ids refer to, so it has to
    survive ingestion for retrieval to be scorable later.
    """
    metadata: dict[str, Any] = {
        "source": SOURCE_LABEL,
        "source_type": source_type_from_name(name),
        "dsid": dsid_from_name(name),
    }
    acl = acl_for(name, gold_ids)
    if acl:
        metadata["acl"] = acl
    collection = SOURCE_COLLECTIONS.get(metadata["source_type"])
    if collection:
        metadata["collection"] = collection
    return metadata


async def ingest_corpus(
    session: AsyncSession,
    tenant: TenantContext,
    service: IngestService,
    root: Path,
    members: Sequence[str],
    gold_ids: set[str] | None = None,
) -> list[Document]:
    """Feed selected benchmark documents through the normal ingestion path."""
    documents: list[Document] = []
    for name in members:
        path = root / name
        payload = path.read_bytes()
        document = await service.ingest_bytes(
            session=session,
            tenant=tenant,
            filename=path.name,
            payload=payload,
            metadata=metadata_for(name, gold_ids),
        )
        documents.append(document)
    return documents


def read_manifest(path: Path) -> list[str]:
    """Member paths written by scripts/download_enterprise_bench.py."""
    return [line for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]


def write_manifest(path: Path, members: Sequence[str]) -> None:
    path.write_text("\n".join(members) + "\n", encoding="utf-8")
