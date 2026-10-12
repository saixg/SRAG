"""Phase 5: modality fusion keeps table/visual hits in the top-k."""

import uuid

from srag.contracts.evidence import EvidenceType, EvidenceUnit, Provenance
from srag.retrieval.engine import SearchResult
from srag.retrieval.fusion import element_types_for, fuse_modalities, modality_of
from srag.retrieval.rerank import rerank


def _hit(element_type: EvidenceType, score: float) -> SearchResult:
    return SearchResult(
        evidence=EvidenceUnit(
            tenant_id=uuid.uuid4(),
            document_id=uuid.uuid4(),
            element_type=element_type,
            text_content=element_type.value,
            provenance=Provenance(source_filename="x.pdf", extraction_method="test"),
        ),
        score=score,
    )


def test_fuse_surfaces_each_modality():
    ranked = [
        _hit(EvidenceType.TEXT, 0.9),
        _hit(EvidenceType.TEXT, 0.8),
        _hit(EvidenceType.TEXT, 0.7),
        _hit(EvidenceType.TABLE, 0.2),
        _hit(EvidenceType.IMAGE, 0.1),
    ]
    fused = fuse_modalities(ranked, top_k=3)
    types = {item.evidence.element_type for item in fused}
    assert EvidenceType.TEXT in types
    assert EvidenceType.TABLE in types
    assert EvidenceType.IMAGE in types


def test_modality_labels():
    assert modality_of(EvidenceType.OCR) == "text"
    assert modality_of(EvidenceType.TABLE) == "table"
    assert modality_of(EvidenceType.DIAGRAM) == "visual"


def test_element_types_for_modalities():
    assert element_types_for(["table", "visual"]) == ["table", "image", "figure", "diagram"]


def test_rerank_prefers_query_overlap():
    weak = SearchResult(
        evidence=EvidenceUnit(
            tenant_id=uuid.uuid4(),
            document_id=uuid.uuid4(),
            element_type=EvidenceType.TEXT,
            text_content="unrelated",
            provenance=Provenance(source_filename="x.pdf", extraction_method="test"),
        ),
        score=0.9,
    )
    strong = SearchResult(
        evidence=EvidenceUnit(
            tenant_id=uuid.uuid4(),
            document_id=uuid.uuid4(),
            element_type=EvidenceType.TABLE,
            text_content="operating pressure 42 bar",
            provenance=Provenance(source_filename="x.pdf", extraction_method="test"),
        ),
        score=0.1,
    )
    ranked = rerank([weak, strong], "operating pressure")
    assert ranked[0].evidence.element_type == EvidenceType.TABLE
