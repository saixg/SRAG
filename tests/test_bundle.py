"""Tests for Evidence Bundle building and security enforcement."""

import uuid

import pytest

from srag.contracts.evidence import EvidenceType, EvidenceUnit, Provenance, SourceLocation
from srag.contracts.identity import TenantContext
from srag.retrieval.bundle_builder import EvidenceBundleBuilder, SecurityRejectionError
from srag.retrieval.types import SearchResult


def create_valid_evidence(tenant_id: uuid.UUID) -> EvidenceUnit:
    return EvidenceUnit(
        tenant_id=tenant_id,
        document_id=uuid.uuid4(),
        element_type=EvidenceType.TEXT,
        text_content="Valid text",
        provenance=Provenance(source_filename="doc.pdf", extraction_method="test"),
    )


def test_bundle_builder_valid():
    """Valid evidence should be correctly bundled."""
    tenant = TenantContext(tenant_id=uuid.uuid4(), tenant_name="test")
    evidence = create_valid_evidence(tenant.tenant_id)
    evidence.source_location = SourceLocation(page_number=5)

    results = [SearchResult(evidence=evidence, score=0.95)]

    bundle = EvidenceBundleBuilder.build(tenant, "test query", results)

    assert bundle.tenant_id == tenant.tenant_id
    assert bundle.query == "test query"
    assert len(bundle.items) == 1

    item = bundle.items[0]
    assert item.evidence_id == str(evidence.evidence_id)
    assert item.content == "Valid text"
    assert item.citation_location == "Document: doc.pdf, Page: 5"


def test_bundle_builder_rejects_cross_tenant_evidence():
    """Evidence from another tenant MUST be rejected (fail closed)."""
    tenant = TenantContext(tenant_id=uuid.uuid4(), tenant_name="test")
    other_tenant_id = uuid.uuid4()

    evidence = create_valid_evidence(other_tenant_id)
    results = [SearchResult(evidence=evidence, score=0.95)]

    with pytest.raises(SecurityRejectionError, match="Cross-tenant"):
        EvidenceBundleBuilder.build(tenant, "test query", results)


def test_bundle_builder_rejects_missing_provenance():
    """Evidence without proper provenance MUST be rejected (fail closed)."""
    tenant = TenantContext(tenant_id=uuid.uuid4(), tenant_name="test")

    evidence = create_valid_evidence(tenant.tenant_id)
    evidence.provenance = None  # Missing provenance

    results = [SearchResult(evidence=evidence, score=0.95)]

    bundle = EvidenceBundleBuilder.build(tenant, "test query", results)
    assert bundle.items == []


def test_bundle_builder_rejects_missing_content():
    """Evidence with no content MUST be rejected."""
    tenant = TenantContext(tenant_id=uuid.uuid4(), tenant_name="test")

    evidence = create_valid_evidence(tenant.tenant_id)
    evidence.text_content = None
    evidence.structured_content = None

    results = [SearchResult(evidence=evidence, score=0.95)]

    bundle = EvidenceBundleBuilder.build(tenant, "test query", results)
    assert bundle.items == []


def test_bundle_citation_formatting():
    """Citation location formatting should adapt to the modality."""
    tenant = TenantContext(tenant_id=uuid.uuid4(), tenant_name="test")

    # PDF OCR with bounding box
    evidence1 = create_valid_evidence(tenant.tenant_id)
    evidence1.element_type = EvidenceType.OCR
    evidence1.source_location = SourceLocation(page_number=1, bbox=[0, 0, 100, 100])

    # Table with element ID
    evidence2 = create_valid_evidence(tenant.tenant_id)
    evidence2.element_type = EvidenceType.TABLE
    evidence2.element_id = "table_42"
    evidence2.source_location = SourceLocation(page_number=2)

    results = [
        SearchResult(evidence=evidence1, score=0.9),
        SearchResult(evidence=evidence2, score=0.8),
    ]

    bundle = EvidenceBundleBuilder.build(tenant, "query", results)

    assert (
        bundle.items[0].citation_location
        == "Document: doc.pdf, Page: 1, Bbox: [0.0, 0.0, 100.0, 100.0]"
    )
    assert bundle.items[1].citation_location == "Document: doc.pdf, Page: 2, Table ID: table_42"
